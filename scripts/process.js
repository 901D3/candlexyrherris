function getCurrentFrameFFT(audioTime, channelArray) {
  const startSample = Math.floor(audioTime * sampleRate);

  // Safety
  if (audioLength - startSample - fftSize < audioLength) {
    stftRe.set(channelArray.subarray(startSample, startSample + fftSize));
  } else stftRe.fill(0);

  stftIm.fill(0);

  for (let i = 0; i < fftSize; i++) stftRe[i] *= windowFuncArray[i];

  nayuki.transform(stftRe, stftIm);

  if (normalizeSpectrum) {
    const scaled = (canvasHeight / (windowFuncAvg * fftSize)) * postVolMultiply;

    for (let i = 0; i < fftSize; i++) {
      stftRe[i] *= scaled;
      stftIm[i] *= scaled;
    }
  }

  // Reverse engineered version of Sonic Candle's interleaved array indexing
  // Shifted real or imaginary arrays gives wavy bars

  if (interleaveEffect) {
    // Save the transformed arrays
    const stftReTemp = stftRe.slice();
    const stftImTemp = stftIm.slice();

    // Fill them with 0s
    stftRe.fill(0);
    stftIm.fill(0);

    for (let i = 0; i < fftSize; i++) {
      // Interleaved writing
      const i2 = i * 2;

      //const re = stftReTemp[i] ** 2;
      const im = stftImTemp[i] ** 2;

      // stftRe have the normal output
      stftRe[i2] = Math.sqrt(stftReTemp[i] ** 2 + im);

      // stftIm have the wavy bars output(because of shifted array)
      stftIm[i2 + 1] = Math.sqrt(stftReTemp[i + 1] ** 2 + im);
    }
  }
}

function drawWrapper() {
  getCurrentFrameFFT(
    audio.currentTime,
    channelIndex === 1 ? rightChannelArray : leftChannelArray
  );
  const buffer = getVisualizerBufferFromFFT(
    stftRe,
    stftIm,
    bars,
    threshold,
    minBin,
    maxBin,
    interleaveEffect
  );
  drawVisualizerBufferToCanvas(ctx, buffer);
}

function process() {
  const t0 = performance.now();

  drawWrapper();

  if (telemetry) frameCounter();
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

  const WebMMuxerConfig = {
    codec: "vp8", // Has to be VP8
    width: canvasWidth,
    height: canvasHeight,
    frameRate: recorderFrameRate,
    bufferSize: Number(gId("bufferSizeInput").value),
  };

  WebMMuxer.init(WebMMuxerConfig);
  const chunks = [];

  const startPositionSeconds = Number(gId("rendererStartPosition").value ?? 0);
  const startFrame = Math.floor(startPositionSeconds * recorderFrameRate);
  const totalFrames = ceil(audio.duration * recorderFrameRate);
  printLog("Total frames:" + totalFrames);
  audio.pause();
  if (video.readyState > 1) {
    video.pause();
    video.muted = true;
  }
  audio.muted = true;
  audio.loop = false;
  audio.currentTime = startPositionSeconds;
  video.currentTime = startPositionSeconds;
  canvas.style.hidden = true;

  performance.mark("renderStart");
  for (let frameIndex = startFrame; frameIndex < totalFrames && !audio.ended; frameIndex++) {
    const frameTime = frameIndex / recorderFrameRate;

    if (backgroundStyle === "video") {
      performance.mark("videoDrawStart");
      await new Promise((resolve) => {
        video.currentTime = frameTime;
        video.addEventListener("seeked", resolve, {once: true});
      });
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      performance.mark("videoDrawEnd");
    }

    performance.mark("audioDrawStart");
    audio.currentTime = frameTime;
    drawWrapper();
    performance.mark("audioDrawEnd");

    performance.mark("toBlobStart");
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", blobQuality)
    );
    performance.mark("toBlobEnd");

    WebMMuxer.addFrameFromBlob(new Uint8Array(await blob.arrayBuffer()), chunks);

    if (isRendering == false) {
      printLog("Rendering stopped manually");
      isRendering = false;
      audio.muted = false;
      audio.loop = true;

      onComplete();
      return true;
    }

    if (telemetry) {
      let videoDraw;
      if (backgroundStyle === "video") {
        performance.measure("videoDraw", "videoDrawStart", "videoDrawEnd");
        videoDraw = performance.getEntriesByName("videoDraw").at(-1)?.duration ?? 0;
      }

      performance.measure("audioDraw", "audioDrawStart", "audioDrawEnd");
      const audioDraw = performance.getEntriesByName("audioDraw").at(-1)?.duration ?? 0;

      performance.measure("toBlob", "toBlobStart", "toBlobEnd");
      const toBlob = performance.getEntriesByName("toBlob").at(-1)?.duration ?? 0;

      printLog(
        "Video draw: " +
          videoDraw +
          "ms\n" +
          "Visualizer draw: " +
          audioDraw +
          "ms\n" +
          "toBlob: " +
          toBlob +
          "ms\n"
      );

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
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  performance.mark("renderEnd");
  performance.measure("render", "renderStart", "renderEnd");
  const renderTime = performance.getEntriesByName("render").at(-1)?.duration ?? 0;

  onComplete();

  async function onComplete() {
    isRendering = false;
    audio.muted = false;
    audio.loop = true;
    audio.controls = true;

    const blob = WebMMuxer.finalize(chunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video.webm";
    a.click();
    URL.revokeObjectURL(url);
    printLog(
      "Rendered video: " + "<a href='" + url + "' target='_blank'>" + url + "</a>",
      null
    );

    isRendering = false;
    startRend.removeAttribute("disabled", "");
    stopRend.setAttribute("disabled", "");

    startRec.removeAttribute("disabled");
    stopRec.setAttribute("disabled", "");
    pauseRec.setAttribute("disabled", "");
    resumeRec.setAttribute("disabled", "");
    return true;
  }

  printLog(
    "Elapsed: " +
      renderTime +
      "\n" +
      "Rendering takes " +
      (renderTime / (audio.duration * 1000)) * 100 +
      "% of audio duration"
  );
}

// WebCodecs seems to be screwing up
async function webCodecsRender() {
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

  const bufferSize = Number(gId("bufferSizeInput").value);

  const WebMMuxerConfig = {
    codec: gId("renderCodec").value === "vp09" ? "vp9" : gId("renderCodec").value,
    width: canvasWidth,
    height: canvasHeight,
    frameRate: recorderFrameRate,
    bufferSize: bufferSize,

    profile: 0,
    level: 0xff,
    bitDepth: 8,
    chromaSubsampling: 1,
    colorRange: 1,
    colorPrimaries: 1,
    transferCharacteristics: 1,
  };

  WebMMuxer.init(WebMMuxerConfig);
  const chunks = [];

  const startPositionSeconds = Number(gId("rendererStartPosition").value ?? 0);
  const startFrame = Math.floor(startPositionSeconds * recorderFrameRate);
  const totalFrames = ceil(audio.duration * recorderFrameRate);
  printLog("Total frames:" + totalFrames);
  audio.pause();
  if (video.readyState > 1) video.pause();

  audio.muted = true;
  audio.loop = false;
  audio.currentTime = startPositionSeconds;
  video.currentTime = startPositionSeconds;
  canvas.style.hidden = true;

  const init = {
    output(chunk) {
      const buffer = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buffer);
      WebMMuxer.addFramePreEncoded(buffer, chunks);
    },
    error(err) {
      console.error(err);
    },
  };

  const config = {
    codec: gId("renderCodec").value === "vp09" ? "vp09.00.10.08" : "vp8",
    width: canvasWidth,
    height: canvasHeight,
    framerate: recorderFrameRate,
    bitrate: recorderVideoBitrate,
  };

  webCodecsEncoder = new VideoEncoder(init);
  console.log((await VideoEncoder.isConfigSupported(config)).supported);
  webCodecsEncoder.configure(config);

  performance.mark("renderStart");

  for (let frameIndex = startFrame; frameIndex < totalFrames && !audio.ended; frameIndex++) {
    performance.mark("totalStart");
    const frameTime = frameIndex / recorderFrameRate;

    if (backgroundStyle === "video") {
      performance.mark("videoDrawStart");

      await new Promise((resolve) => {
        video.currentTime = frameTime;
        video.addEventListener("seeked", resolve, {once: true});
      });

      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      performance.mark("videoDrawEnd");
    }

    performance.mark("audioDrawStart");
    audio.currentTime = frameTime;
    drawWrapper();
    performance.mark("audioDrawEnd");

    const videoFrame = new VideoFrame(canvas, {timestamp: frameTime * 1e6, format: "I420"});

    const keyframe = frameIndex % bufferSize === 0;
    webCodecsEncoder.encode(videoFrame, {keyframe});
    videoFrame.close();

    if (isRendering == false) {
      printLog("Rendering stopped manually");
      isRendering = false;
      audio.muted = false;
      audio.loop = true;

      onComplete();
      return true;
    }

    performance.mark("totalEnd");
    if (telemetry) {
      let videoDraw;

      if (backgroundStyle === "video") {
        performance.measure("videoDraw", "videoDrawStart", "videoDrawEnd");
        videoDraw = performance.getEntriesByName("videoDraw").at(-1)?.duration ?? 0;
      }

      performance.measure("audioDraw", "audioDrawStart", "audioDrawEnd");
      performance.measure("total", "totalStart", "totalEnd");

      printLog(
        "Frames: " +
          frameIndex +
          "/" +
          totalFrames +
          "\n" +
          "Video draw: " +
          videoDraw +
          "ms\n" +
          "Visualizer draw: " +
          performance.getEntriesByName("audioDraw").at(-1)?.duration ??
          0 + "ms\n" + "total: " + performance.getEntriesByName("toFrame").at(-1)?.duration ??
          0 + "ms\n"
      );

      performance.clearMarks("videoDrawStart");
      performance.clearMarks("videoDrawEnd");
      performance.clearMarks("audioDrawStart");
      performance.clearMarks("audioDrawEnd");
      performance.clearMarks("totalEnd");
      performance.clearMeasures("videoDraw");
      performance.clearMeasures("audioDraw");
      performance.clearMeasures("total");
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  performance.mark("renderEnd");
  performance.measure("render", "renderStart", "renderEnd");

  const renderTime = performance.getEntriesByName("render").at(-1)?.duration ?? 0;
  printLog(
    "Elapsed: " +
      renderTime +
      "\n" +
      "Rendering takes " +
      (renderTime / (audio.duration * 1000)) * 100 +
      "% of audio duration"
  );

  onComplete();

  async function onComplete() {
    await webCodecsEncoder.flush();
    webCodecsEncoder.close();

    isRendering = false;
    audio.muted = false;
    audio.loop = true;
    audio.controls = true;

    const blob = WebMMuxer.finalize(chunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video.webm";
    a.click();
    URL.revokeObjectURL(url);
    printLog(
      "Rendered video: " + "<a href='" + url + "' target='_blank'>" + url + "</a>",
      null
    );

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
  if (!isRendering) Ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (backgroundStyle === "solidColor") {
    Ctx.fillStyle =
      "rgb(" +
      backgroundColorRed +
      ", " +
      backgroundColorGreen +
      ", " +
      backgroundColorBlue +
      ")";
    Ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (backgroundStyle === "image") Ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
  else if (backgroundStyle === "video" && !isRendering)
    Ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

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
      barPosX,
      barPosY,
      barWidth,
      barSpace,
      minAmplitude,
      maxAmplitude,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding
    );
  } else if (barStyle === "capsule") {
    barDrawer.drawCapsuleBar(
      Ctx,
      buffer,
      bars,
      barPosX,
      barPosY,
      barWidth,
      barSpace,
      minAmplitude,
      maxAmplitude,
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
      barPosX,
      barPosY,
      barWidth,
      barSpace,
      minAmplitude,
      maxAmplitude,
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
      barPosX,
      barPosY,
      barWidth / 2,
      barSpace,
      minAmplitude,
      maxAmplitude,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding
    );
  } else if (barStyle === "lines") {
    barDrawer.drawLines(
      Ctx,
      buffer,
      bars,
      barPosX,
      barPosY,
      barWidth,
      minAmplitude,
      maxAmplitude,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding
    );
  } else if (barStyle === "peaks") {
    barDrawer.drawPeaks(
      Ctx,
      buffer,
      bars,
      barPosX,
      barPosY,
      barWidth,
      barSpace,
      minAmplitude,
      maxAmplitude,
      barAmplitudeRounding,
      barWidthRounding,
      barStyleTriangCapsuleHeight
    );
  }
}

function frameCounter() {
  frm++;
  let dlT = (performance.now() - lastUpdatedTime) / 1000;
  let currentFps = 1 / dlT;
  lastUpdatedTime = performance.now();
  if (performance.now() - lLT >= 1000) {
    printLog(
      "Fps: " +
        currentFps.toString().padEnd(22) +
        " | Latency: " +
        (dlT * 1000).toString().padEnd(22)
    );
    lLT = performance.now();
  }
}

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
