function getCurrentFrameFFT() {
  const startSample = audio.currentTime * sampleRate;
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
  getCurrentFrameFFT();
  const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minFreq, maxFreq);

  drawVisualizerBufferToCanvas(ctx, buffer);

  if (audio.paused || audio.ended) {
    stftRe = []; //save memory
    stftIm = [];
    return;
  }

  setTimeout(() => {
    process();
  }, frameLatency);
}

function drawVisualizerBufferToCanvas(ctx, buffer) {
  const fullBarWidth = barWidth + barSpace;
  const halfHeight = canvasHeight * 0.5;
  const offsetX = (canvasWidth - buffer.length * fullBarWidth + barSpace) * 0.5;
  const minAmplitudeHalfHeight = minAmplitude * halfHeight;
  const maxAmplitudeHalfHeight = maxAmplitude * halfHeight;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgb(" + barColorRed + ", " + barColorGreen + ", " + barColorBlue + ")";

  if (barStyle === "rect") {
    drawRectBar(ctx, buffer, bars, offsetX, halfHeight, barWidth, barSpace, minAmplitudeHalfHeight, maxAmplitudeHalfHeight);
  } else if (barStyle === "capsule") {
    drawCapsuleBar(ctx, buffer, bars, offsetX, halfHeight, barWidth, barSpace, minAmplitudeHalfHeight, maxAmplitudeHalfHeight);
  }
  if (t) frameCounter();
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
  let elapsed = (performance.now() - startTime) / 1000;
  let avgFps = frm / elapsed;
  let dlT = (performance.now() - lastUpdatedTime) / 1000;
  let currentFps = dlT > 0 ? 1 / dlT : 0;
  lastUpdatedTime = performance.now();
  if (performance.now() - lLT >= 1000) {
    printLog(
      "elapsed: " +
        elapsed.toString().padEnd(22) +
        " | Fps: " +
        currentFps.toString().padEnd(22) +
        " | AvgFps: " +
        avgFps.toString().padEnd(22) +
        " | "
    );
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
