//function initAudioContext() {
//  analyser = "";
//  analyser = audioCtx.createAnalyser();
//  analyser.fftSize = fftSize;
//  analyser.smoothingTimeConstant = 0;
//  reconnectAudio();
//
//  dataArray = new Float32Array(analyser.frequencyBinCount);
//}

//function reconnectAudio() {
//  if (source) source.disconnect();
//  source.connect(analyser);
//  analyser.connect(audioCtx.destination);
//}

//function applyAudioSettings() {
//  fftSize = parseInt(gIdV("fftSizeInput")) || 2048;
//  frameRate = parseInt(gIdV("frameRateInput")) || 30;
//  volMultiplier = parseFloat(gIdV("volumeMultiplierInput")) || 1;
//
//  if (!analyser) return;
//
//  if (fftSize != analyser.fftSize) {
//    analyser.fftSize = fftSize;
//    dataArray = new Float32Array(analyser.frequencyBinCount);
//  } else {
//    analyser.fftSize = fftSize;
//  }
//}

//function getVisualizerBuffer(Nbars, threshold, minFreq, maxFreq) {
//  Nbars = Nbars || 100;
//  analyser.getFloatFrequencyData(dataArray);
//  const dataLength = dataArray.length;
//
//  const minBin = (minFreq / (audioCtx.sampleRate * 0.5)) * dataLength;
//  const maxBin = min((maxFreq / (audioCtx.sampleRate * 0.5)) * dataLength, dataLength - 1);
//
//  const scale = binRange / Nbars;
//  const barBuffer = new Array(Nbars).fill(0);
//  const _3dbScale = 1 / pow(10, -3 / 20);
//
//  for (let i = 0; i < Nbars; i++) {
//    let sum = 0;
//    const start = minBin + i * scale;
//    const end = minBin + (i + 1) * scale;
//
//    for (let j = start; j < end; j += 1) {
//      const idx = floor(j);
//      const frac = j - idx;
//      const next = min(idx + 1, maxBin);
//
//      // convert dB to linear amplitude
//      const val = pow(10, dataArray[idx] / 20) * _3dbScale;
//      const nextVal = pow(10, dataArray[next] / 20) * _3dbScale;
//
//      sum += val * (1 - frac) + nextVal * frac;
//    }
//
//    let value = (sum / scale) * volMultiplier;
//
//    // apply threshold, min, max
//    if (value < threshold) value = 0;
//
//    barBuffer[i] = value;
//  }
//
//  return barBuffer;
//}

function getVisualizerBufferFromFFT(real, imag, Nbars, threshold, minFreq, maxFreq) {
  Nbars = Nbars || 100;
  const realLength = real.length;
  const fftSizeValue = realLength * 0.5;
  const halfSampleRate = sampleRate * 0.5;

  const minBin = floor((minFreq / halfSampleRate) * fftSizeValue);
  const maxBin = min(floor((maxFreq / halfSampleRate) * fftSizeValue), fftSizeValue - 1);
  const binRange = maxBin - minBin;

  const binsPerBar = binRange / Nbars;
  const barBuffer = new Array(Nbars).fill(0);

  for (let i = 0; i < Nbars; i++) {
    const barBufferValue = barBuffer[i];
    const startBin = minBin + i * binsPerBar;
    const endBin = minBin + (i + 1) * binsPerBar;

    for (let j = startBin; j < endBin; j++) {
      const realValue = real[j];
      const imagValue = imag[j];
      const mag = sqrt(realValue ** 2 + imagValue ** 2) * 0.0009765625; // divide by 1024
      if (abs(realValue) > barBufferValue) barBuffer[i] = mag;
    }

    let value = barBuffer[i] * volMultiplier;
    if (value < threshold) value = 0;

    barBuffer[i] = value;
  }

  return barBuffer;
}

//===== MISC =====

function displayInfo() {
  let sampleRateLbl = gId("sampleRateLbl");
  let bitDepthLbl = gId("bitDepthLbl");
  let channelsLbl = gId("channelsLbl");

  let barsPerFreqLbl = gId("barsPerFreqLbl");
  let binsPerFreqLbl = gId("binsPerFreqLbl");

  let freqPerBarLbl = gId("freqPerBarLbl");
  let binsPerBarLbl = gId("binsPerBarLbl");

  let barsPerBinLbl = gId("barsPerBinLbl");
  let freqPerBinLbl = gId("freqPerBinLbl");

  const halfSampleRate = sampleRate * 0.5;
  const minBin = floor((minFreq / halfSampleRate) * fftSize);
  const maxBin = min(floor((maxFreq / halfSampleRate) * fftSize), fftSize - 1);

  const binRange = maxBin - minBin;
  const freqRange = maxFreq - minFreq;

  const barsPerFreq = bars / freqRange;
  const binsPerFreq = fftSize / sampleRate;

  const freqPerBar = freqRange / bars;
  const binsPerBar = bars / binRange;

  const freqPerBin = sampleRate / fftSize;
  const barsPerBin = binRange / bars;

  const frequencyRangeDesired = bars * freqPerBin;
  const fftSizeDesired = sampleRate / freqPerBar;
  const barsDesired = freqRange / freqPerBar;

  sampleRateLbl.innerHTML = sampleRate + "Hz";
  bitDepthLbl.innerHTML = bitDepth + " Bits";
  channelsLbl.innerHTML = channels;

  barsPerFreqLbl.innerHTML = barsPerFreq;
  binsPerFreqLbl.innerHTML = binsPerFreq;

  freqPerBarLbl.innerHTML = freqPerBar + "Hz";
  binsPerBarLbl.innerHTML = binsPerBar;

  freqPerBinLbl.innerHTML = freqPerBin + "Hz";
  barsPerBinLbl.innerHTML = barsPerBin;

  gId("maxFrequencyInput").placeholder = frequencyRangeDesired;
  gId("freqRangeLbl").innerHTML = freqRange;
  gId("desiredFreqRangeLbl").innerHTML = frequencyRangeDesired;
  gId("desiredFftSizeLbl").innerHTML = fftSizeDesired;
  gId("desiredBarsLbl").innerHTML = barsDesired;
}

function targetResolution(barWidth, barSpace, Nbars) {
  return barSpace + Nbars * (barWidth + barSpace);
}

//connect sliders, inputs and vars, returna default value to slider if input is out of slider's range
(function () {
  gId("fftSizeRange").addEventListener("input", function () {
    sliderInputSync(gId("fftSizeRange"), gId("fftSizeInput"), "fftSize", undefined, "slider");
    displayInfo();
  });

  gId("fftSizeInput").addEventListener("input", function () {
    sliderInputSync(gId("fftSizeRange"), gId("fftSizeInput"), "fftSize", 2048, "input");
    displayInfo();
  });

  gId("frameLatencyRange").addEventListener("input", function () {
    sliderInputSync(gId("frameLatencyRange"), gId("frameLatencyInput"), "frameLatency", undefined, "slider");
  });

  gId("frameLatencyInput").addEventListener("input", function () {
    sliderInputSync(gId("frameLatencyRange"), gId("frameLatencyInput"), "frameLatency", 33.3333333333333, "input");
  });

  gId("volumeMultiplierRange").addEventListener("input", function () {
    sliderInputSync(gId("volumeMultiplierRange"), gId("volumeMultiplierInput"), "volMultiplier", undefined, "slider");
  });

  gId("volumeMultiplierInput").addEventListener("input", function () {
    sliderInputSync(gId("volumeMultiplierRange"), gId("volumeMultiplierInput"), "volMultiplier", 1, "input");
  });

  gId("minAmplitudeRange").addEventListener("input", function () {
    sliderInputSync(gId("minAmplitudeRange"), gId("minAmplitudeInput"), "minAmplitude", undefined, "slider");
  });

  gId("minAmplitudeInput").addEventListener("input", function () {
    sliderInputSync(gId("minAmplitudeRange"), gId("minAmplitudeInput"), "minAmplitude", 1, "input");
  });

  gId("maxAmplitudeRange").addEventListener("input", function () {
    sliderInputSync(gId("maxAmplitudeRange"), gId("maxAmplitudeInput"), "maxAmplitude", undefined, "slider");
  });

  gId("maxAmplitudeInput").addEventListener("input", function () {
    sliderInputSync(gId("maxAmplitudeRange"), gId("maxAmplitudeInput"), "maxAmplitude", 1, "input");
  });

  gId("thresholdRange").addEventListener("input", function () {
    sliderInputSync(gId("thresholdRange"), gId("thresholdInput"), "threshold", undefined, "slider");
  });

  gId("thresholdInput").addEventListener("input", function () {
    sliderInputSync(gId("thresholdRange"), gId("thresholdInput"), "threshold", 1, "input");
  });

  gId("minFrequencyRange").addEventListener("input", function () {
    sliderInputSync(gId("minFrequencyRange"), gId("minFrequencyInput"), "minFreq", undefined, "slider");
    displayInfo();
  });

  gId("minFrequencyInput").addEventListener("input", function () {
    sliderInputSync(gId("minFrequencyRange"), gId("minFrequencyInput"), "minFreq", 0, "input");
    displayInfo();
  });

  gId("maxFrequencyRange").addEventListener("input", function () {
    sliderInputSync(gId("maxFrequencyRange"), gId("maxFrequencyInput"), "maxFreq", undefined, "slider");
    displayInfo();
  });

  gId("maxFrequencyInput").addEventListener("input", function () {
    sliderInputSync(gId("maxFrequencyRange"), gId("maxFrequencyInput"), "maxFreq", 1, "input");
    displayInfo();
  });

  gId("barStyle").addEventListener("change", function () {
    barStyle = gId("barStyle").value;
    const barStyleControls = {
      rect: [],
      capsule: ["capsuleRadiusDisp"],
    };

    const allIds = Object.values(barStyleControls).flat();

    allIds.forEach((id) => gId(id).classList.add("hidden"));

    barStyleControls[barStyle]?.forEach((id) => gId(id).classList.remove("hidden"));
  });

  gId("barStyleCapsuleRadiusRange").addEventListener("input", function () {
    sliderInputSync(
      gId("barStyleCapsuleRadiusRange"),
      gId("barStyleCapsuleRadiusInput"),
      "barStyleCapsuleRadius",
      undefined,
      "slider"
    );
  });

  gId("barStyleCapsuleRadiusInput").addEventListener("input", function () {
    sliderInputSync(
      gId("barStyleCapsuleRadiusRange"),
      gId("barStyleCapsuleRadiusInput"),
      "barStyleCapsuleRadius",
      100,
      "input"
    );
  });

  gId("barsRange").addEventListener("input", function () {
    sliderInputSync(gId("barsRange"), gId("barsInput"), "bars", undefined, "slider");
    displayInfo();
  });

  gId("barsInput").addEventListener("input", function () {
    sliderInputSync(gId("barsRange"), gId("barsInput"), "bars", 100, "input");
    displayInfo();
  });

  gId("barWidthRange").addEventListener("input", function () {
    sliderInputSync(gId("barWidthRange"), gId("barWidthInput"), "barWidth", undefined, "slider");
  });

  gId("barWidthInput").addEventListener("input", function () {
    sliderInputSync(gId("barWidthRange"), gId("barWidthInput"), "barWidth", 255, "input");
  });

  gId("barSpaceRange").addEventListener("input", function () {
    sliderInputSync(gId("barSpaceRange"), gId("barSpaceInput"), "barSpace", undefined, "slider");
  });

  gId("barSpaceInput").addEventListener("input", function () {
    sliderInputSync(gId("barSpaceRange"), gId("barSpaceInput"), "barSpace", 255, "input");
  });

  gId("barColorRedRange").addEventListener("input", function () {
    sliderInputSync(gId("barColorRedRange"), gId("barColorRedInput"), "barColorRed", undefined, "slider");
  });

  gId("barColorRedInput").addEventListener("input", function () {
    sliderInputSync(gId("barColorRedRange"), gId("barColorRedInput"), "barColorRed", 255, "input");
  });

  gId("barColorGreenRange").addEventListener("input", function () {
    sliderInputSync(gId("barColorGreenRange"), gId("barColorGreenInput"), "barColorGreen", undefined, "slider");
  });

  gId("barColorGreenInput").addEventListener("input", function () {
    sliderInputSync(gId("barColorGreenRange"), gId("barColorGreenInput"), "barColorGreen", 255, "input");
  });

  gId("barColorBlueRange").addEventListener("input", function () {
    sliderInputSync(gId("barColorBlueRange"), gId("barColorBlueInput"), "barColorBlue", undefined, "slider");
  });

  gId("barColorBlueInput").addEventListener("input", function () {
    sliderInputSync(gId("barColorBlueRange"), gId("barColorBlueInput"), "barColorBlue", 255, "input");
  });

  gId("windowFuncInput").addEventListener("input", function () {
    try {
      windowFunc = new Function("n", "N", sinc.toString() + "; return " + gId("windowFuncInput").value + ";");
    } catch {}
  });

  gId("windowFuncSelect").addEventListener("change", function () {
    gId("windowFuncInput").value = $windowFunc.getPreset(gId("windowFuncSelect").value);
    try {
      windowFunc = new Function("n", "N", sinc.toString() + "; return " + gId("windowFuncInput").value + ";");
    } catch {}
  });

  //init all vars based on input value
  sliderInputSync(gId("fftSizeRange"), gId("fftSizeInput"), "fftSize", 2048, "input");
  sliderInputSync(gId("frameLatencyRange"), gId("frameLatencyInput"), "frameLatency", 33.3333333333333, "input");
  sliderInputSync(gId("volumeMultiplierRange"), gId("volumeMultiplierInput"), "volMultiplier", 1, "input");
  sliderInputSync(gId("minAmplitudeRange"), gId("minAmplitudeInput"), "minAmplitude", 1, "input");
  sliderInputSync(gId("maxAmplitudeRange"), gId("maxAmplitudeInput"), "maxAmplitude", 1, "input");
  sliderInputSync(gId("thresholdRange"), gId("thresholdInput"), "threshold", 1, "input");
  sliderInputSync(gId("minFrequencyRange"), gId("minFrequencyInput"), "minFreq", 0, "input");
  sliderInputSync(gId("maxFrequencyRange"), gId("maxFrequencyInput"), "maxFreq", 1, "input");
  sliderInputSync(gId("barsRange"), gId("barsInput"), "bars", 100, "input");
  sliderInputSync(gId("barWidthRange"), gId("barWidthInput"), "barWidth", 255, "input");
  sliderInputSync(gId("barSpaceRange"), gId("barSpaceInput"), "barSpace", 255, "input");
  sliderInputSync(gId("barColorRedRange"), gId("barColorRedInput"), "barColorRed", 255, "input");
  sliderInputSync(gId("barColorGreenRange"), gId("barColorGreenInput"), "barColorGreen", 255, "input");
  sliderInputSync(gId("barColorBlueRange"), gId("barColorBlueInput"), "barColorBlue", 255, "input");
  sliderInputSync(gId("recorderFrameRateRange"), gId("recorderFrameRateInput"), "recorderFrameRate", 30, "input");
  gId("windowFuncInput").value = $windowFunc.getPreset(gId("windowFuncSelect").value);
  try {
    windowFunc = new Function(
      "n", //index
      "N", //stft real array length
      `return ${gId("windowFuncInput").value};`
    );
  } catch {}
  canvasStream = canvas.captureStream(recorderFrameRate);
})();
