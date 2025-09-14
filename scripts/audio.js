function getVisualizerBufferFromFFT(real, imag, Nbars, threshold, minFreq, maxFreq) {
  Nbars = Nbars || 100;
  const realLength = real.length;
  const fftSizeValue = realLength * 0.5;
  const halfSampleRate = sampleRate * 0.5;

  const minBin = floor((minFreq / halfSampleRate) * fftSizeValue);
  const maxBin = min(floor((maxFreq / halfSampleRate) * fftSizeValue), fftSizeValue);
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
      const mag = sqrt(pow(realValue, 2) + pow(imagValue, 2)) * 0.0009765625; // divide by 1024
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

  gId("minBinLbl").innerHTML = minBin;
  gId("maxBinLbl").innerHTML = maxBin;
  gId("audioDataLengthLbl").innerHTML = leftChannelArray.length;
  gId("audioDurationLbl").innerHTML = audio.duration;

  gId("sampleRateLbl").innerHTML = sampleRate + "Hz";
  gId("bitDepthLbl").innerHTML = bitDepth + " Bits";
  gId("channelsLbl").innerHTML = channels;

  gId("barsPerFreqLbl").innerHTML = barsPerFreq;
  gId("binsPerFreqLbl").innerHTML = binsPerFreq;

  gId("freqPerBarLbl").innerHTML = freqPerBar + "Hz";
  gId("binsPerBarLbl").innerHTML = binsPerBar;

  gId("freqPerBinLbl").innerHTML = freqPerBin + "Hz";
  gId("barsPerBinLbl").innerHTML = barsPerBin;

  gId("freqRangeLbl").innerHTML = freqRange + "Hz";
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

  gId("frameRateRange").addEventListener("input", function () {
    sliderInputSync(gId("frameRateRange"), gId("frameRateInput"), "frameRate", undefined, "slider");
  });

  gId("frameRateInput").addEventListener("input", function () {
    sliderInputSync(gId("frameRateRange"), gId("frameRateInput"), "frameRate", 30, "input");
    if (frameRateInput == 0) {
      frameRate = 9999999999;
    }
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
      0.3,
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

  gId("backgroundColorRedRange").addEventListener("input", function () {
    sliderInputSync(gId("backgroundColorRedRange"), gId("backgroundColorRedInput"), "backgroundColorRed", undefined, "slider");
  });

  gId("backgroundColorRedInput").addEventListener("input", function () {
    sliderInputSync(gId("backgroundColorRedRange"), gId("backgroundColorRedInput"), "backgroundColorRed", 20, "input");
  });

  gId("backgroundColorGreenRange").addEventListener("input", function () {
    sliderInputSync(
      gId("backgroundColorGreenRange"),
      gId("backgroundColorGreenInput"),
      "backgroundColorGreen",
      undefined,
      "slider"
    );
  });

  gId("backgroundColorGreenInput").addEventListener("input", function () {
    sliderInputSync(gId("backgroundColorGreenRange"), gId("backgroundColorGreenInput"), "backgroundColorGreen", 20, "input");
  });

  gId("backgroundColorBlueRange").addEventListener("input", function () {
    sliderInputSync(
      gId("backgroundColorBlueRange"),
      gId("backgroundColorBlueInput"),
      "backgroundColorBlue",
      undefined,
      "slider"
    );
  });

  gId("backgroundColorBlueInput").addEventListener("input", function () {
    sliderInputSync(gId("backgroundColorBlueRange"), gId("backgroundColorBlueInput"), "backgroundColorBlue", 20, "input");
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

  gId("audioChannel").addEventListener("change", function () {
    if (gId("audioChannel").value === "left") channelsIndex = 0;
    if (gId("audioChannel").value === "right") channelsIndex = 1;
  });

  //init all vars based on input value
  sliderInputSync(gId("fftSizeRange"), gId("fftSizeInput"), "fftSize", 2048, "input");
  sliderInputSync(gId("frameRateRange"), gId("frameRateInput"), "frameRate", 33.3333333333333, "input");
  sliderInputSync(gId("volumeMultiplierRange"), gId("volumeMultiplierInput"), "volMultiplier", 1, "input");
  sliderInputSync(gId("minAmplitudeRange"), gId("minAmplitudeInput"), "minAmplitude", 1, "input");
  sliderInputSync(gId("maxAmplitudeRange"), gId("maxAmplitudeInput"), "maxAmplitude", 1, "input");
  sliderInputSync(gId("thresholdRange"), gId("thresholdInput"), "threshold", 1, "input");
  sliderInputSync(gId("minFrequencyRange"), gId("minFrequencyInput"), "minFreq", 0, "input");
  sliderInputSync(gId("maxFrequencyRange"), gId("maxFrequencyInput"), "maxFreq", 1, "input");
  sliderInputSync(gId("barsRange"), gId("barsInput"), "bars", 100, "input");
  sliderInputSync(gId("barStyleCapsuleRadiusRange"), gId("barStyleCapsuleRadiusInput"), "barStyleCapsuleRadius", 0.3, "input");

  sliderInputSync(gId("barWidthRange"), gId("barWidthInput"), "barWidth", 255, "input");
  sliderInputSync(gId("barSpaceRange"), gId("barSpaceInput"), "barSpace", 255, "input");

  sliderInputSync(gId("barColorRedRange"), gId("barColorRedInput"), "barColorRed", 255, "input");
  sliderInputSync(gId("barColorGreenRange"), gId("barColorGreenInput"), "barColorGreen", 255, "input");
  sliderInputSync(gId("barColorBlueRange"), gId("barColorBlueInput"), "barColorBlue", 255, "input");

  sliderInputSync(gId("backgroundColorRedRange"), gId("backgroundColorRedInput"), "backgroundColorRed", 20, "input");
  sliderInputSync(gId("backgroundColorGreenRange"), gId("backgroundColorGreenInput"), "backgroundColorGreen", 20, "input");
  sliderInputSync(gId("backgroundColorBlueRange"), gId("backgroundColorBlueInput"), "backgroundColorBlue", 20, "input");

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
