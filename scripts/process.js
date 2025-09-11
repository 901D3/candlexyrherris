function getCurrentFrameFFT(audioTime) {
  const startSample = audioTime * sampleRate;
  const frame = audioDataArray.subarray(startSample, startSample + fftSize);
  const frameLength = frame.length;

  stftRe = new Float32Array(fftSize).fill(0);
  stftIm = new Float32Array(fftSize).fill(0);
  const N = stftRe.length;

  for (let i = 0; i < frameLength; i++) {
    stftRe[i] = frame[i];
  }

  try {
    windowFunc("n", "N");
  } catch {
    return;
  }

  for (let n = 0; n < N; n++) {
    stftRe[n] *= windowFunc(n, N);
  }

  FFTUtils.transform(stftRe, stftIm);
}

function process() {
  const t0 = performance.now();
  getCurrentFrameFFT(audio.currentTime);
  const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minFreq, maxFreq);
  drawVisualizerBufferToCanvas(ctx, buffer);

  if (audio.paused || audio.ended) {
    stftRe = []; //save memory
    stftIm = [];
    return;
  }

  if (t) frameCounter();
  const wait = 1000 / frameRate - (performance.now() - t0);
  setTimeout(process, wait);
}

async function render() {
  if (isRecording == true) {
    printLog("Stop recording to start rendering");
    return;
  }
  if (isRendering == true) {
    printLog("Rendering process has already started");
    return;
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
      return;
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
  const minAmplitudeHalfHeight = minAmplitudeValue * posY;
  const maxAmplitudeHalfHeight = maxAmplitudeValue * posY;
  for (let i = 0; i < Nbars; i++) {
    const x = posX + i * fullBarWidth;
    const barHeight = max(minAmplitudeHalfHeight, min(buffer[i] * posY, maxAmplitudeHalfHeight));

    ctx.fillRect(x, posY - barHeight, barWidthValue, barHeight);
    ctx.fillRect(x, posY, barWidthValue, barHeight);
  }
}

function drawCapsuleBar(ctx, buffer, Nbars, posX, posY, barWidthValue, barSpaceValue, minAmplitudeValue, maxAmplitudeValue) {
  const fullBarWidth = barWidthValue + barSpaceValue;
  const minAmplitudeHalfHeight = minAmplitudeValue * posY;
  const maxAmplitudeHalfHeight = maxAmplitudeValue * posY;
  const radius = barWidth * barStyleCapsuleRadius;
  for (let i = 0; i < Nbars; i++) {
    const x = posX + i * fullBarWidth;
    const barHeight = max(minAmplitudeHalfHeight, min(buffer[i] * posY, maxAmplitudeHalfHeight));

    if (barHeight < 1) {
      ctx.fillRect(x, posY - 1, barWidth, 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + radius, posY - barHeight);
      try {
        ctx.roundRect(x, posY - barHeight, barWidth, barHeight * 2, radius);
      } catch {
        ctx.roundRect(x, posY - barHeight, barWidth, barHeight * 2, 0.2);
      }
      ctx.fill();
    }
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
