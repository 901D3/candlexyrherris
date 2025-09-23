function getCurrentFrameFFT(audioTime, channelArray, dupSize) {
  const startSample = floor(audioTime * sampleRate);
  const frame = new Float32Array(fftSize);
  const fftSizeDupSize = fftSize * dupSize;
  const a = channelArray.subarray(startSample, startSample + fftSize);
  for (let i = 0; i < fftSizeDupSize; i++) {
    for (let j = 0; j < dupSize; j++) {
      frame[i * dupSize + j] = a[i];
    }
  }

  stftRe = frame;
  stftIm = new Float32Array(fftSize);
  const N = stftRe.length;

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

//const wtable = new Float32Array(N * 4 + 15);
//wendykierp.mixed_radix_cffti(N, wtable);

//wendykierp.complexForward(stftRe, 0, wtable);

//for (let i = 0, j = 0; i < N; i++, j += 2) {
//  stftIm[i] = stftRe[j + 1];
//  stftRe[i] = stftRe[j];
//}

function drawWrapper() {
  getCurrentFrameFFT(audio.currentTime, channelIndex === 1 ? rightChannelArray : leftChannelArray, dupSize);
  const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minFreq, maxFreq, dupSize);
  drawVisualizerBufferToCanvas(ctx, buffer);
}

function process() {
  const t0 = performance.now();

  drawWrapper();

  if (audio.paused || audio.ended) {
    stftRe = []; //save memory
    stftIm = [];
    return false;
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
    quality: recorderWebmWriterQuality,
    fileWriter: gId("webmWriterFileWriterSelect").value,

    frameRate: recorderFrameRate,
    transparent: false, //enabling transparent is kinda useless
  });

  const totalFrames = ceil(audio.duration * recorderFrameRate);
  printLog("Total frames:" + totalFrames);
  let frameIndex = 0;
  let blob;
  audio.currentTime = 0;
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
    blob = await canvasToWebPBlob(canvas, recorderWebmWriterQuality);
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
    drawRectBar(ctx, buffer, bars, offsetX, halfHeight, barWidth, barSpace, minAmplitudeHalfHeight, maxAmplitudeHalfHeight);
  } else if (barStyle === "capsule") {
    drawCapsuleBar(ctx, buffer, bars, offsetX, halfHeight, barWidth, barSpace, minAmplitudeHalfHeight, maxAmplitudeHalfHeight);
  }
}

function drawRectBar(ctx, buffer, Nbars, posX, posY, barWidthValue, barSpaceValue, minAmplitudeValue, maxAmplitudeValue) {
  const fullBarWidth = barWidthValue + barSpaceValue;
  for (let i = 0; i < Nbars; i++) {
    const x = posX + i * fullBarWidth;
    const barHeight = max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));

    ctx.fillRect(x, posY - barHeight, barWidthValue, barHeight);
    ctx.fillRect(x, posY, barWidthValue, barHeight);
  }
}

function drawCapsuleBar(ctx, buffer, Nbars, posX, posY, barWidthValue, barSpaceValue, minAmplitudeValue, maxAmplitudeValue) {
  const fullBarWidth = barWidthValue + barSpaceValue;
  const radius = barWidthValue * barStyleCapsuleRadius;
  for (let i = 0; i < Nbars; i++) {
    const x = posX + i * fullBarWidth;
    const barHeight = max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));

    ctx.beginPath();
    ctx.moveTo(x + radius, posY - barHeight);
    try {
      ctx.roundRect(x, posY - barHeight, barWidthValue, barHeight * 2, radius);
    } catch {
      ctx.roundRect(x, posY - barHeight, barWidthValue, barHeight * 2, 0.2);
    }
    ctx.fill();
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
