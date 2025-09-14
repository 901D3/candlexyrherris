function getCurrentFrameFFT(audioTime, channelArray) {
  const startSample = audioTime * sampleRate;
  const frame = channelArray.subarray(startSample, startSample + fftSize);

  stftRe = frame.slice();
  stftIm = new Float32Array(fftSize);
  const N = stftRe.length;

  try {
    windowFunc("n", "N");
  } catch {
    return false;
  }

  for (let n = 0; n < N; n++) {
    stftRe[n] *= windowFunc(n, N);
  }

  FFTUtils.transform(stftRe, stftIm);
}

function process() {
  const t0 = performance.now();

  getCurrentFrameFFT(audio.currentTime, channelIndex === 1 ? rightChannelArray : leftChannelArray);
  const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minFreq, maxFreq);
  drawVisualizerBufferToCanvas(ctx, buffer);

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
  let buffer;
  let blob;
  audio.currentTime = 0;
  audio.pause();
  audio.muted = true;
  audio.loop = false;

  function seekAudio(time) {
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
    await seekAudio(frameTime);

    getCurrentFrameFFT(frameTime);
    buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minFreq, maxFreq);
    drawVisualizerBufferToCanvas(ctx, buffer);

    blob = await canvasToWebPBlob(canvas, recorderWebmWriterQuality);
    recorderWebmWriterSettings.addFrame(new Uint8Array(await blob.arrayBuffer()));

    if (isRendering == false) {
      printLog("Rendering stopped manually");
      isRendering = false;
      audio.muted = false;
      audio.loop = true;

      stftRe = [];
      stftIm = [];

      startRec.removeAttribute("disabled");
      stopRec.removeAttribute("disabled");
      pauseRec.removeAttribute("disabled");
      resumeRec.removeAttribute("disabled");

      await recorderWebmWriterSettings.complete().then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "video.webm";
        a.click();
        URL.revokeObjectURL(url);
      });
      return false;
    }
    frameIndex++;
  }
  const totalTime = performance.now() - t0;
  printLog("Elapsed: " + totalTime + "\n" + "Rendering takes " + totalTime / (audio.duration * 1000) + "% of audio duration");

  stftRe = [];
  stftIm = [];

  startRec.setAttribute("disabled");
  stopRec.setAttribute("disabled");
  pauseRec.setAttribute("disabled");
  resumeRec.setAttribute("disabled");

  await recorderWebmWriterSettings.complete().then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video.webm";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function drawVisualizerBufferToCanvas(ctx, buffer) {
  const fullBarWidth = barWidth + barSpace;
  const halfHeight = canvasHeight * 0.5;
  const offsetX = (canvasWidth - buffer.length * fullBarWidth + barSpace) * 0.5;
  const minAmplitudeHalfHeight = minAmplitude * halfHeight;
  const maxAmplitudeHalfHeight = maxAmplitude * halfHeight;

  ctx.fillStyle = "rgb(" + backgroundColorRed + ", " + backgroundColorGreen + ", " + backgroundColorBlue + ")";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  process();
  displayInfo();
});
