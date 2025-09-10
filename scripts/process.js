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
  getCurrentFrameFFT(audio.currentTime);
  const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minFreq, maxFreq);
  drawVisualizerBufferToCanvas(ctx, buffer);

  if (audio.paused || audio.ended) {
    stftRe = []; //save memory
    stftIm = [];
    return;
  }

  if (t) frameCounter();
  setTimeout(() => {
    process();
  }, frameLatency);
}

function render() {
  const totalFrames = ceil(audio.duration * recorderFrameRate);
  let frameIndex = 0;
  audio.currentTime = 0;
  audio.muted = true;
  audio.loop = false;
  startRecording();

  function renderFrame() {
    const t0 = performance.now();
    //if (!sessionStorage.getItem("isRendering")) return; //when user wants to stop rendering
    if (frameIndex >= totalFrames || audio.ended) {
      stftRe = [];
      stftIm = [];
      stopRecording();
      audio.muted = false;
      audio.loop = true;
      return;
    }

    const frameTime = frameIndex / recorderFrameRate;
    audio.currentTime = frameTime;
    getCurrentFrameFFT(frameTime);

    const buffer = getVisualizerBufferFromFFT(stftRe, stftIm, bars, threshold, minFreq, maxFreq);
    drawVisualizerBufferToCanvas(ctx, buffer);

    //compensate drift latency to next (1000 / recorderFrameRate)ms to ensure the result is consistent frames
    const wait = max(0, 1000 / recorderFrameRate - (performance.now() - t0));

    mediaRecorder.resume();
    setTimeout(() => {
      mediaRecorder.pause(); //leave some space for capturing the frame
      frameIndex++;
      renderFrame();
    }, wait);
  }

  renderFrame();
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
