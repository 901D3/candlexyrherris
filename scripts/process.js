function getCurrentFrameFFT(audioTime, channelArray) {
  const startSample = floor(audioTime * sampleRate);

  stftRe = new Float32Array(channelArray.subarray(startSample, startSample + fftSize));
  stftIm = new Float32Array(fftSize);
  const N = fftSize;

  try {
    windowFunc("n", "N", "v");
  } catch {
    return;
  }

  for (let n = 0; n < N; n++) {
    const v = stftRe[n];
    stftRe[n] *= windowFunc(n, N, v) * preVolMultiply;
  }

  nayuki.transform(stftRe, stftIm);

  // Reverse engineered version of Sonic Candle's interleaved array indexing
  // Shifted real or imaginary arrays gives wavy bars
  // You can use a different window function for stftIm(use it for wavy bars),
  // and retransform with another different window function then
  // stftRe again for a more complex visual effect. But you have to trade perfomance for the coolness...

  if (interleaveEffect) {
    const stftReTemp = stftRe.slice();
    const stftImTemp = stftIm.slice();
    stftRe.fill(0);
    stftIm.fill(0);

    for (let i = 0; i < fftSize; i++) {
      //const re = stftReTemp[i] ** 2;
      const im = stftImTemp[i] ** 2;
      stftIm[i * 2 + 1] = sqrt(stftReTemp[i + 1] ** 2 + im);
      stftRe[i * 2] = sqrt(stftReTemp[i] ** 2 + im);
    }
  }

  //if (interleaveEffect) {
  //  // Wavy bars effect
  //  let stftImTemp = stftIm.slice();
  //  stftIm.fill(0);
  //
  //  for (let i = 0; i < fftSize; i++) {
  //    stftIm[i * 2 + 1] = sqrt(stftRe[i + 1] ** 2 + stftImTemp[i] ** 2);
  //  }
  //  stftImTemp = stftIm.slice();
  //
  //  // Fatty sidelobes for stftRe
  //  stftRe = new Float32Array(channelArray.subarray(startSample, startSample + fftSize));
  //  stftIm.fill(0);
  //
  //  for (let i = 0; i < fftSize; i++) {
  //    stftRe[i] *= (i / fftSize) * volMultiplier * 2;
  //  }
  //
  //  nayuki.transform(stftRe, stftIm);
  //
  //  // Transformed stftRe
  //  let stftReTemp = stftRe.slice();
  //  stftRe.fill(0);
  //
  //  for (let i = 0; i < fftSize; i++) {
  //    stftRe[i * 2] = sqrt(stftReTemp[i] ** 2 + stftIm[i] ** 2);
  //  }
  //  stftIm = stftImTemp.slice();
  //}
}

function drawWrapper() {
  getCurrentFrameFFT(audio.currentTime, channelIndex === 1 ? rightChannelArray : leftChannelArray);
  const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minBin, maxBin, interleaveEffect);
  drawVisualizerBufferToCanvas(ctx, buffer);
}

function process() {
  const t0 = performance.now();

  drawWrapper();

  if (t) frameCounter();
  if (audio.paused || audio.ended || isRendering) return;
  setTimeout(process, max(0, frameTime - (performance.now() - t0)));
}

async function render() {
  if (isRecording == true) {
    printLog("Stop recording to start rendering");
    return false;
  }
  if (isRendering == true) {
    printLog("Rendering process has already started");
    return false;
  }
  isRendering = true;
  startRec.setAttribute("disabled", "");
  stopRec.setAttribute("disabled", "");
  pauseRec.setAttribute("disabled", "");
  resumeRec.setAttribute("disabled", "");

  printLog("Starting rendering");

  const muxer = new WebMMuxer({
    codec: "vp8",
    width: canvasWidth,
    height: canvasHeight,
    frameRate: recorderFrameRate,
    bufferSize: Number(gId("bufferSizeInput").value),
  });
  const chunks = [];

  const startPositionSeconds = Number(gId("rendererStartPosition").value ?? 0);
  const startFrame = floor(startPositionSeconds * recorderFrameRate);
  const totalFrames = ceil(audio.duration * recorderFrameRate);
  printLog("Total frames:" + totalFrames, 1);
  audio.pause();
  if (video.readyState > 1) {
    video.pause();
    video.muted = true;
  }
  audio.muted = true;
  audio.loop = false;
  audio.currentTime = startPositionSeconds;
  video.currentTime = startPositionSeconds;

  let maxConcurrentEncodes = Number(gId("rendererMaxConcurrentEncodes").value);
  if (!Number.isInteger(maxConcurrentEncodes)) {
    printLog("Max concurrent encodes default to 2");
    maxConcurrentEncodes = 2;
  }

  const encodeQueue = new Set();

  performance.mark("renderStart");

  for (let frameIndex = startFrame; frameIndex < totalFrames && !audio.ended; frameIndex++) {
    const frameTime = frameIndex / recorderFrameRate;

    if (backgroundStyle === "video") {
      performance.mark("videoDrawStart");
      await new Promise((r) => {
        video.currentTime = frameTime;
        video.addEventListener("seeked", r, {once: true});
      });
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      performance.mark("videoDrawEnd");
    }

    performance.mark("audioDrawStart");
    audio.currentTime = frameTime;
    drawWrapper();
    performance.mark("audioDrawEnd");

    const encodePromise = (async () => {
      performance.mark("toBlobStart");
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", blobQuality));
      performance.mark("toBlobEnd");

      const buffer = new Uint8Array(await blob.arrayBuffer());
      muxer.addFrameFromBlob(buffer, chunks);
    })();

    encodeQueue.add(encodePromise);
    encodePromise.finally(() => encodeQueue.delete(encodePromise));

    if (encodeQueue.size >= maxConcurrentEncodes) await Promise.race(encodeQueue);

    if (isRendering == false) {
      printLog("Rendering stopped manually");
      isRendering = false;
      audio.muted = false;
      audio.loop = true;

      onComplete();
      return true;
    }

    if (t) {
      let videoDraw;
      if (backgroundStyle === "video") {
        performance.measure("videoDraw", "videoDrawStart", "videoDrawEnd");
        videoDraw = performance.getEntriesByName("videoDraw").at(-1)?.duration ?? 0;
      }

      performance.measure("audioDraw", "audioDrawStart", "audioDrawEnd");
      const audioDraw = performance.getEntriesByName("audioDraw").at(-1)?.duration ?? 0;

      performance.measure("toBlob", "toBlobStart", "toBlobEnd");
      const toBlob = performance.getEntriesByName("toBlob").at(-1)?.duration ?? 0;

      printLog("Video draw: " + videoDraw + "ms\n" + "Visualizer draw: " + audioDraw + "ms\n" + "toBlob: " + toBlob + "ms\n");

      performance.clearMarks("videoDrawStart");
      performance.clearMarks("videoDrawEnd");
      performance.clearMarks("audioDrawStart");
      performance.clearMarks("audioDrawEnd");
      performance.clearMarks("toBlobStart");
      performance.clearMarks("toBlobEnd");
      performance.clearMeasures("videoDraw");
      performance.clearMeasures("audioDraw");
      performance.clearMeasures("toBlob");
    }

    if (pausedRendering) await waitForResolve();
    // Yields so the UI stays responsive
    await new Promise((r) => setTimeout(r, 0));
  }
  performance.mark("renderEnd");
  performance.measure("render", "renderStart", "renderEnd");
  const renderTime = performance.getEntriesByName("render").at(-1)?.duration ?? 0;
  printLog(
    "Elapsed: " + renderTime + "\n" + "Rendering takes " + (renderTime / (audio.duration * 1000)) * 100 + "% of audio duration"
  );

  onComplete();

  async function onComplete() {
    await Promise.all(encodeQueue);
    isRendering = false;
    audio.muted = false;
    audio.loop = true;
    audio.controls = true;

    const blob = muxer.finalize(chunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video.webm";
    a.click();
    URL.revokeObjectURL(url);
    printLog("Rendered video: " + "<a href='" + url + "' target='_blank'>" + url + "</a>", null);

    isRendering = false;
    startRend.removeAttribute("disabled", "");
    stopRend.setAttribute("disabled", "");

    startRec.removeAttribute("disabled");
    stopRec.setAttribute("disabled", "");
    pauseRec.setAttribute("disabled", "");
    resumeRec.setAttribute("disabled", "");
    return true;
  }
}

async function streamlinedRender() {
  if (isRecording == true) {
    printLog("Stop recording to start render");
    return false;
  }
  if (isRendering == true) {
    printLog("Rendering process has already started");
    return false;
  }
  isRendering = true;

  printLog("Starting rendering");

  const muxer = new WebMMuxer({
    codec: gId("renderCodec").value === "vp09" ? "vp9" : gId("renderCodec").value,
    width: canvasWidth,
    height: canvasHeight,
    frameRate: recorderFrameRate,
    bufferSize: Number(gId("bufferSizeInput").value),
    profile: 0,
    level: 10,
    bitDepth: 8,
    chromaSubsampling: 2,
    colorRange: 1,
    colorPrimaries: 1,
    transferCharacteristics: 1,
  });
  const chunks = [];

  const startPositionSeconds = Number(gId("rendererStartPosition").value ?? 0);
  const startFrame = floor(startPositionSeconds * recorderFrameRate);
  const totalFrames = ceil(audio.duration * recorderFrameRate);
  printLog("Total frames:" + totalFrames, 1);
  audio.pause();
  if (video.readyState > 1) video.pause();

  audio.muted = true;
  audio.loop = false;
  audio.currentTime = startPositionSeconds;
  video.currentTime = startPositionSeconds;
  canvas.style.hidden = true;

  performance.mark("WebCodecsSetupStart");
  const WCodecEncoder = new VideoEncoder({
    output: (chunk) => {
      const buffer = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buffer);
      muxer.addFramePreEncoded(buffer, chunks);
    },
    error: (err) => console.error(err),
  });

  WCodecEncoder.configure({
    codec: gId("renderCodec").value === "vp09" ? "vp09.00.10.8.01" : gId("renderCodec").value,
    width: canvasWidth,
    height: canvasHeight,
    framerate: recorderFrameRate,
    bitrate: recorderVideoBitrate,
  });
  performance.mark("WebCodecsSetupEnd");
  performance.measure("WebCodecsSetup", "WebCodecsSetupStart", "WebCodecsSetupEnd");
  printLog("WebCodecs setup: " + (performance.getEntriesByName("WebCodecsSetup").at(-1)?.duration ?? 0) + "ms");

  performance.mark("renderStart");

  for (let frameIndex = startFrame; frameIndex < totalFrames && !audio.ended; frameIndex++) {
    const frameTime = frameIndex / recorderFrameRate;

    if (backgroundStyle === "video") {
      performance.mark("videoDrawStart");
      await new Promise((r) => {
        video.currentTime = frameTime;
        video.addEventListener("seeked", r, {once: true});
      });
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      performance.mark("videoDrawEnd");
    }

    performance.mark("audioDrawStart");
    audio.currentTime = frameTime;
    drawWrapper();
    performance.mark("audioDrawEnd");

    performance.mark("toFrameStart");
    const videoFrame = new VideoFrame(canvas, {
      timestamp: null,
    });
    performance.mark("toFrameEnd");

    WCodecEncoder.encode(videoFrame, {keyframe: true});
    videoFrame.close();

    if (isRendering == false) {
      printLog("Rendering stopped manually");
      isRendering = false;
      audio.muted = false;
      audio.loop = true;

      onComplete();
      return true;
    }

    if (t) {
      let videoDraw;
      if (backgroundStyle === "video") {
        performance.measure("videoDraw", "videoDrawStart", "videoDrawEnd");
        videoDraw = performance.getEntriesByName("videoDraw").at(-1)?.duration ?? 0;
      }

      performance.measure("audioDraw", "audioDrawStart", "audioDrawEnd");
      const audioDraw = performance.getEntriesByName("audioDraw").at(-1)?.duration ?? 0;

      performance.measure("toFrame", "toFrameStart", "toFrameEnd");
      const toFrame = performance.getEntriesByName("toFrame").at(-1)?.duration ?? 0;

      printLog("Video draw: " + videoDraw + "ms\n" + "Visualizer draw: " + audioDraw + "ms\n" + "toFrame: " + toFrame + "ms\n");

      performance.clearMarks("videoDrawStart");
      performance.clearMarks("videoDrawEnd");
      performance.clearMarks("audioDrawStart");
      performance.clearMarks("audioDrawEnd");
      performance.clearMarks("toFrameStart");
      performance.clearMarks("toFrameEnd");
      performance.clearMeasures("videoDraw");
      performance.clearMeasures("audioDraw");
      performance.clearMeasures("toFrame");
    }

    // Yields so the UI stays responsive
    await new Promise((r) => setTimeout(r, 0));
  }
  performance.mark("renderEnd");
  performance.measure("render", "renderStart", "renderEnd");

  const renderTime = performance.getEntriesByName("render").at(-1)?.duration ?? 0;
  printLog(
    "Elapsed: " + renderTime + "\n" + "Rendering takes " + (renderTime / (audio.duration * 1000)) * 100 + "% of audio duration"
  );

  onComplete();

  async function onComplete() {
    await WCodecEncoder.flush();
    WCodecEncoder.close();

    isRendering = false;
    audio.muted = false;
    audio.loop = true;
    audio.controls = true;

    const blob = muxer.finalize(chunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video.webm";
    a.click();
    URL.revokeObjectURL(url);
    printLog("Rendered video: " + "<a href='" + url + "' target='_blank'>" + url + "</a>", null);

    isRendering = false;
    startRend.removeAttribute("disabled", "");
    stopRend.setAttribute("disabled", "");

    startRec.removeAttribute("disabled");
    stopRec.setAttribute("disabled", "");
    pauseRec.setAttribute("disabled", "");
    resumeRec.setAttribute("disabled", "");
    return true;
  }
}

function drawVisualizerBufferToCanvas(Ctx, buffer) {
  const fullBarWidth = barWidth + barSpace;
  let offsetX = (canvasWidth - buffer.length * fullBarWidth + barSpace) * 0.5;
  if (barStyle === "lines") offsetX = (canvasWidth - buffer.length * barWidth) * 0.5;

  const halfHeight = canvasHeight * 0.5;
  const minAmplitudeHalfHeight = minAmplitude * halfHeight;
  const maxAmplitudeHalfHeight = maxAmplitude * halfHeight;

  if (!isRendering) Ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (backgroundStyle === "solidColor") {
    Ctx.fillStyle = "rgb(" + backgroundColorRed + ", " + backgroundColorGreen + ", " + backgroundColorBlue + ")";
    Ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (backgroundStyle === "image") Ctx.drawImage(image, 0, 0);
  else if (backgroundStyle === "video" && !isRendering) Ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

  if (barOutline) {
    Ctx.strokeStyle = "rgb(" + barColorRed + ", " + barColorGreen + ", " + barColorBlue + ")";
  } else {
    Ctx.fillStyle = "rgb(" + barColorRed + ", " + barColorGreen + ", " + barColorBlue + ")";
  }

  if (barStyle === "rect") {
    barDrawer.drawRectBar(
      Ctx,
      buffer,
      bars,
      offsetX,
      halfHeight,
      barWidth,
      barSpace,
      minAmplitudeHalfHeight,
      maxAmplitudeHalfHeight,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding
    );
  } else if (barStyle === "capsule") {
    barDrawer.drawCapsuleBar(
      Ctx,
      buffer,
      bars,
      offsetX,
      halfHeight,
      barWidth,
      barSpace,
      minAmplitudeHalfHeight,
      maxAmplitudeHalfHeight,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding,
      barStyleCapsuleRadius
    );
  } else if (barStyle === "triangCapsule") {
    barDrawer.drawTriCapsuleBar(
      Ctx,
      buffer,
      bars,
      offsetX,
      halfHeight,
      barWidth,
      barSpace,
      minAmplitudeHalfHeight,
      maxAmplitudeHalfHeight,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding,
      barStyleTriangCapsuleHeight
    );
  } else if (barStyle === "oval") {
    barDrawer.drawOvalBar(
      Ctx,
      buffer,
      bars,
      offsetX,
      halfHeight,
      barWidth / 2,
      barSpace,
      minAmplitudeHalfHeight,
      maxAmplitudeHalfHeight,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding
    );
  } else if (barStyle === "lines") {
    barDrawer.drawLines(
      Ctx,
      buffer,
      bars,
      offsetX,
      halfHeight,
      barWidth,
      minAmplitudeHalfHeight,
      maxAmplitudeHalfHeight,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding
    );
  }
}

function frameCounter() {
  frm++;
  let dlT = (performance.now() - lastUpdatedTime) / 1000;
  let currentFps = 1 / dlT;
  lastUpdatedTime = performance.now();
  if (performance.now() - lLT >= 1000) {
    printLog("Fps: " + currentFps.toString().padEnd(22) + " | Latency: " + (dlT * 1000).toString().padEnd(22));
    lLT = performance.now();
  }
}

gId("showTelemetry").addEventListener("change", function () {
  t = gId("showTelemetry").checked;
});

audio.addEventListener("play", function () {
  video.currentTime = audio.currentTime;
  video.play();
  frm = 0;
  startTime = performance.now();
  lastUpdatedTime = startTime;
  lLT = startTime;
  process();
  displayInfo();
});

audio.addEventListener("seeking", function () {
  video.currentTime = audio.currentTime;
  drawWrapper();
  displayInfo();
});
