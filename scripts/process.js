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
  if (audio.paused || audio.ended) return;
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
    fileWriter: null,

    frameRate: recorderFrameRate,
    transparent: false, // enabling transparent is useless for most cases
  });
  const startPositionSeconds = Number(gId("rendererStartPosition").value);
  const startFrame = floor(startPositionSeconds * recorderFrameRate);
  const totalFrames = ceil(audio.duration * recorderFrameRate) - startFrame;
  printLog("Total frames:" + totalFrames);
  audio.pause();
  audio.currentTime = startPositionSeconds;
  audio.muted = true;
  audio.loop = false;

  function seek(time) {
    return new Promise((resolve) => {
      if (audio.currentTime === time) {
        resolve();
        return;
      }
      const handler = () => {
        audio.removeEventListener("seeked", handler);
        resolve();
      };
      audio.addEventListener("seeked", handler);
      audio.currentTime = time;
    });
  }

  function canvasToWebPBlob(canvas, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
    });
  }

  let maxConcurrentEncodes = Number(gId("rendererMaxConcurrentEncodes").value);
  if (!Number.isInteger(maxConcurrentEncodes)) {
    printLog("Max concurrent encodes default to 2");
    maxConcurrentEncodes = 2;
  }

  const encodeQueue = new Set();

  const t0 = performance.now();

  for (let frameIndex = startFrame; frameIndex < totalFrames && !audio.ended; frameIndex++) {
    const frameTime = frameIndex / recorderFrameRate;

    let t1 = performance.now();

    audio.currentTime = frameTime;
    drawWrapper();

    if (t) printLog("Process time: " + (performance.now() - t1) + "ms");

    const encodePromise = (async () => {
      let t3 = performance.now();
      const buffer = await (await canvasToWebPBlob(canvas, webmWriterQuality)).arrayBuffer();
      if (t) printLog("Canvas to WebP: " + (performance.now() - t3) + "ms");

      t3 = performance.now();
      recorderWebmWriterSettings.addFrame(new Uint8Array(buffer), canvas.width, canvas.height);
      if (t) printLog("WebM Writer addFrame: " + (performance.now() - t3) + "ms");
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

    if (t) printLog("Rendered: " + frameIndex + "|" + (frameIndex / totalFrames) * 100 + "%", 1);
  }
  const totalTime = performance.now() - t0;
  printLog(
    "Elapsed: " + totalTime + "\n" + "Rendering takes " + (totalTime / (audio.duration * 1000)) * 100 + "% of audio duration"
  );

  onComplete();

  async function onComplete() {
    await Promise.all(encodeQueue);
    isRendering = false;
    audio.muted = false;
    audio.loop = true;
    audio.controls = true;

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
  let offsetX = (canvasWidth - buffer.length * fullBarWidth + barSpace) * 0.5;
  if (barStyle === "lines") offsetX = (canvasWidth - buffer.length * barWidth) * 0.5;

  const halfHeight = canvasHeight * 0.5;
  const minAmplitudeHalfHeight = minAmplitude * halfHeight;
  const maxAmplitudeHalfHeight = maxAmplitude * halfHeight;

  if (backgroundStyle === "solidColor") {
    ctx.fillStyle = "rgb(" + backgroundColorRed + ", " + backgroundColorGreen + ", " + backgroundColorBlue + ")";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (backgroundStyle === "image") {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(image, 0, 0);
  }

  if (barOutline) {
    ctx.strokeStyle = "rgb(" + barColorRed + ", " + barColorGreen + ", " + barColorBlue + ")";
  } else {
    ctx.fillStyle = "rgb(" + barColorRed + ", " + barColorGreen + ", " + barColorBlue + ")";
  }

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
      maxAmplitudeHalfHeight,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding
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
      maxAmplitudeHalfHeight,
      barOutline,
      barAmplitudeRounding,
      barWidthRounding,
      barStyleCapsuleRadius
    );
  } else if (barStyle === "triangCapsule") {
    barDrawer.drawTriCapsuleBar(
      ctx,
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
      ctx,
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
      ctx,
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
