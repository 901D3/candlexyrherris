function getCurrentFrameFFT(audioTime, channelArray) {
  const startSample = floor(audioTime * sampleRate);

  stftRe = new Float32Array(channelArray.subarray(startSample, startSample + fftSize));
  stftIm = new Float32Array(fftSize);
  const N = fftSize;

  try {
    windowFunc("n", "N");
  } catch {
    return false;
  }

  for (let n = 0; n < N; n++) {
    stftRe[n] *= windowFunc(n, N) * volMultiplier;
  }

  nayuki.transform(stftRe, stftIm);
}

function drawWrapper() {
  getCurrentFrameFFT(audio.currentTime, channelIndex === 1 ? rightChannelArray : leftChannelArray);
  const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minBin, maxBin, fftInterleave);
  drawVisualizerBufferToCanvas(ctx, buffer);
}

function process() {
  const t0 = performance.now();

  drawWrapper();

  if (audio.ended) {
    stftRe = []; //save memory
    stftIm = [];
    return;
  }

  if (t) frameCounter();
  setTimeout(process, max(0, 1000 / frameRate - (performance.now() - t0)));
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
  recorderWebmWriterSettings = new WebMWriter({
    quality: webmWriterQuality,
    fileWriter: gId("webmWriterFileWriterSelect").value,

    frameRate: recorderFrameRate,
    transparent: false, //enabling transparent is kinda useless
  });
  const startPositionSeconds = Number(gId("rendererStartPosition").value);
  const startFrame = floor(startPositionSeconds * recorderFrameRate);
  const totalFrames = ceil(audio.duration * recorderFrameRate) - startFrame;
  printLog("Total frames:" + totalFrames);
  let frameIndex = startFrame;
  let blob;
  audio.currentTime = startPositionSeconds;
  audio.pause();
  audio.muted = true;
  audio.loop = false;

  function seek(time) {
    return new Promise((resolve) => {
      audio.currentTime = time;
      audio.addEventListener("seeked", function handler() {
        audio.removeEventListener("seeked", handler);
        resolve();
      });
    });
  }

  function canvasToWebPBlob(canvas, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
    });
  }

  const t0 = performance.now();
  while (frameIndex < totalFrames && !audio.ended) {
    const frameTime = frameIndex / recorderFrameRate;
    let t1 = performance.now();
    await seek(frameTime);
    t1 = performance.now() - t1;

    let t3 = performance.now();
    blob = await canvasToWebPBlob(canvas, webmWriterQuality);
    t3 = performance.now() - t3;

    let t4 = performance.now();
    recorderWebmWriterSettings.addFrame(new Uint8Array(await blob.arrayBuffer()), canvasWidth, canvasHeight);
    t4 = performance.now() - t4;

    printLog(
      "Draw: " +
        t1 +
        "ms\n" +
        "Canvas to WebP: " +
        t3 +
        "ms\n" +
        "WebM Writer addFrame: " +
        t4 +
        "ms\n" +
        "Total: " +
        (t1 + t3 + t4) +
        "ms\n" +
        "Rendered: " +
        frameIndex +
        "/" +
        (frameIndex / totalFrames) * 100 +
        "%",
      1
    );

    if (isRendering == false) {
      printLog("Rendering stopped manually");
      isRendering = false;
      audio.muted = false;
      audio.loop = true;

      onComplete();
      return true;
    }
    frameIndex++;
  }
  const totalTime = performance.now() - t0;
  printLog(
    "Elapsed: " + totalTime + "\n" + "Rendering takes " + (totalTime / (audio.duration * 1000)) * 100 + "% of audio duration"
  );

  onComplete();

  async function onComplete() {
    isRendering = false;
    audio.muted = false;
    audio.loop = true;
    audio.controls = true;
    audio.classList.remove("offscreen_hide");

    await recorderWebmWriterSettings.complete().then((blob) => {
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
    });
  }
}

function drawVisualizerBufferToCanvas(ctx, buffer) {
  const fullBarWidth = barWidth + barSpace;
  const halfHeight = canvasHeight * 0.5;
  const offsetX = (canvasWidth - buffer.length * fullBarWidth + barSpace) * 0.5;
  const minAmplitudeHalfHeight = minAmplitude * halfHeight;
  const maxAmplitudeHalfHeight = maxAmplitude * halfHeight;

  if (backgroundStyle === "solidColor") {
    ctx.fillStyle = "rgb(" + backgroundColorRed + ", " + backgroundColorGreen + ", " + backgroundColorBlue + ")";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (backgroundStyle === "image") {
    ctx.drawImage(image, 0, 0);
  }

  ctx.fillStyle = "rgb(" + barColorRed + ", " + barColorGreen + ", " + barColorBlue + ")";

  if (barStyle === "rect") {
    barDrawer.drawRectBar(
      ctx,
      buffer,
      bars,
      offsetX,
      halfHeight,
      barWidth,
      barSpace,
      minAmplitudeHalfHeight,
      maxAmplitudeHalfHeight
    );
  } else if (barStyle === "capsule") {
    barDrawer.drawCapsuleBar(
      ctx,
      buffer,
      bars,
      offsetX,
      halfHeight,
      barWidth,
      barSpace,
      minAmplitudeHalfHeight,
      maxAmplitudeHalfHeight
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

gId("showTelemetries").addEventListener("change", function (e) {
  t = e.target.checked;
});

audio.addEventListener("play", function () {
  frm = 0;
  startTime = performance.now();
  lastUpdatedTime = startTime;
  lLT = startTime;
  process();
  displayInfo();
});

audio.addEventListener("seeking", function () {
  drawWrapper();
  displayInfo();
});
