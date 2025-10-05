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

  gId("minBinRange").addEventListener("input", function () {
    sliderInputSync(gId("minBinRange"), gId("minBinInput"), "minBin", undefined, "slider");
    displayInfo();
  });

  gId("minBinInput").addEventListener("input", function () {
    sliderInputSync(gId("minBinRange"), gId("minBinInput"), "minBin", 0, "input");
    displayInfo();
  });

  gId("maxBinRange").addEventListener("input", function () {
    sliderInputSync(gId("maxBinRange"), gId("maxBinInput"), "maxBin", undefined, "slider");
    displayInfo();
  });

  gId("maxBinInput").addEventListener("input", function () {
    sliderInputSync(gId("maxBinRange"), gId("maxBinInput"), "maxBin", 1, "input");
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

  gId("backgroundStyle").addEventListener("change", function () {
    backgroundStyle = gId("backgroundStyle").value;
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

  gId("realShiftRange").addEventListener("input", function () {
    sliderInputSync(gId("realShiftRange"), gId("realShiftInput"), "realShift", undefined, "slider");
  });

  gId("realShiftInput").addEventListener("input", function () {
    sliderInputSync(gId("realShiftRange"), gId("realShiftInput"), "realShift", 1, "input");
  });

  gId("imagShiftRange").addEventListener("input", function () {
    sliderInputSync(gId("imagShiftRange"), gId("imagShiftInput"), "imagShift", undefined, "slider");
  });

  gId("imagShiftInput").addEventListener("input", function () {
    sliderInputSync(gId("imagShiftRange"), gId("imagShiftInput"), "imagShift", 1, "input");
  });

  //init all vars based on input value
  sliderInputSync(gId("fftSizeRange"), gId("fftSizeInput"), "fftSize", 2048, "input");
  sliderInputSync(gId("frameRateRange"), gId("frameRateInput"), "frameRate", 33.3333333333333, "input");
  sliderInputSync(gId("volumeMultiplierRange"), gId("volumeMultiplierInput"), "volMultiplier", 1, "input");
  sliderInputSync(gId("minAmplitudeRange"), gId("minAmplitudeInput"), "minAmplitude", 1, "input");
  sliderInputSync(gId("maxAmplitudeRange"), gId("maxAmplitudeInput"), "maxAmplitude", 1, "input");
  sliderInputSync(gId("thresholdRange"), gId("thresholdInput"), "threshold", 1, "input");
  sliderInputSync(gId("minBinRange"), gId("minBinInput"), "minBin", 0, "input");
  sliderInputSync(gId("maxBinRange"), gId("maxBinInput"), "maxBin", 1, "input");
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
  sliderInputSync(gId("realShiftRange"), gId("realShiftInput"), "realShift", 1, "input");
  sliderInputSync(gId("imagShiftRange"), gId("imagShiftInput"), "imagShift", 1, "input");
  gId("windowFuncInput").value = $windowFunc.getPreset(gId("windowFuncSelect").value);
  try {
    windowFunc = new Function(
      "n", //index
      "N", //stft real array length
      sinc.toString() + "; return " + gId("windowFuncInput").value + ";"
    );
  } catch {}
  canvasStream = canvas.captureStream(recorderFrameRate);
})();
