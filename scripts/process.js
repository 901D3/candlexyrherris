function getCurrentFrameFFT() {
  const startSample = audio.currentTime * sampleRate;
  const frame = convertedAudioDataArray.subarray(startSample, startSample + fftSize);
  const frameLength = frame.length;

  stftRe = new Float32Array(fftSize).fill(0);
  stftIm = new Float32Array(fftSize).fill(0);

  for (let i = 0; i < frameLength; i++) stftRe[i] = frame[i];

  FFTUtils.transform(stftRe, stftIm);
}

function process() {
  getCurrentFrameFFT();
  const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minFreq, maxFreq);

  drawVisualizerBufferToCanvas(ctx, buffer);

  if (audio.paused || audio.ended) return;
  setTimeout(() => {
    process();
  }, frameLatency);
}

function drawVisualizerBufferToCanvas(ctx, buffer) {
  const totalBars = buffer.length;
  const fullBarWidth = barWidth + barSpace;
  const canvasCenterY = canvasHeight * 0.5;
  const halfHeight = canvasHeight * 0.5;
  const offsetX = (canvasWidth - totalBars * fullBarWidth + barSpace) * 0.5;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgb(" + barColorRed + ", " + barColorGreen + ", " + barColorBlue + ")";

  if (barStyle === "rect") {
    for (let i = 0; i < bars; i++) {
      const normalized = buffer[i];
      const x = offsetX + i * fullBarWidth;
      const barHeight = minAmplitude + normalized * (halfHeight - minAmplitude);

      ctx.fillRect(x, canvasCenterY - barHeight, barWidth, barHeight);
      ctx.fillRect(x, canvasCenterY, barWidth, barHeight);
    }
  }
  //else if (barStyle === "rounded") {
  //  // simple rounded caps (stub, can improve)
  //  const radius = barWidth * 0.5;
  //  for (let i = 0; i < totalBars; i++) {
  //    const x = offsetX + i * fullBarWidth;
  //    const barHeight = (buffer[i] / 255) * halfHeight;
  //
  //    // top
  //    ctx.beginPath();
  //    ctx.moveTo(x, canvasCenterY);
  //    ctx.lineTo(x, canvasCenterY - barHeight + radius);
  //    ctx.arc(x + radius, canvasCenterY - barHeight + radius, radius, PI, 0, false);
  //    ctx.lineTo(x + barWidth, canvasCenterY);
  //    ctx.closePath();
  //    ctx.fill();
  //
  //    // bottom mirrored
  //    ctx.beginPath();
  //    ctx.moveTo(x, canvasCenterY);
  //    ctx.lineTo(x, canvasCenterY + barHeight - radius);
  //    ctx.arc(x + radius, canvasCenterY + barHeight - radius, radius, -PI, 0, true);
  //    ctx.lineTo(x + barWidth, canvasCenterY);
  //    ctx.closePath();
  //    ctx.fill();
  //  }
  //}
  if (t) frameCounter();
}

function frameCounter() {
  frm++;
  let esT = (performance.now() - stT) / 1000;
  let avgFps = frm / esT;
  let dlT = (performance.now() - lsUpdT) / 1000;
  let crFps = dlT > 0 ? 1 / dlT : 0;
  lsUpdT = performance.now();
  if (performance.now() - lLT >= 1000) {
    printLog(
      `elapsed: ${esT.toString().padEnd(22)} | processed: ${frm.toString().padEnd(22)} | AvgFps: ${avgFps
        .toString()
        .padEnd(22)} | Fps: ${crFps.toString().padEnd(22)} | `
    );
    lLT = performance.now();
  }
}

gId("showTelemetries").addEventListener("change", function (e) {
  t = e.target.checked;
});

audio.addEventListener("play", function () {
  frm = 0;
  stT = performance.now();
  lsUpdT = stT;
  lLT = stT;
  displayInfo();
  process();
});

audio.addEventListener("seeking", function () {
  displayInfo();
  process();
});
