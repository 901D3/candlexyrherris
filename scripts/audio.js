function getVisualizerBufferFromFFT(real, imag, Nbars, threshold, minFreq, maxFreq, dupSize) {
  Nbars = Nbars || 100;
  const realLength = real.length;
  const fftSizeValue = realLength * 0.5;
  const nyquist = sampleRate * dupSize * 0.5;

  const minBin = floor((minFreq / nyquist) * fftSizeValue);
  const maxBin = min(floor((maxFreq / nyquist) * fftSizeValue), fftSizeValue);
  const binRange = maxBin - minBin;

  const barBuffer = new Float32Array(Nbars).fill(0);

  let currentBin = minBin;
  const binStep = binRange / Nbars;

  for (let i = 0; i < Nbars && currentBin < maxBin; i++) {
    const endBin = min(currentBin + binStep, maxBin);

    const startIdx = floor(currentBin);
    const endIdx = ceil(endBin);

    for (let j = startIdx; j < endIdx; j++) {
      const mag = sqrt(real[j + realShift] ** 2 + imag[j + imagShift] ** 2) / fftSizeValue;
      if (mag > barBuffer[i]) barBuffer[i] = mag;
    }

    barBuffer[i] = barBuffer[i] >= threshold ? barBuffer[i] : 0;

    currentBin = endBin;
  }

  return barBuffer;
}

//===== MISC =====

function displayInfo() {
  const nyquist = sampleRate * 0.5;
  const minBin = floor((minFreq / nyquist) * fftSize);
  const maxBin = min(floor((maxFreq / nyquist) * fftSize), fftSize - 1);

  const binRange = maxBin - minBin;
  const freqRange = maxFreq - minFreq;

  const freqPerBar = freqRange / bars;
  const freqPerBin = freqRange / binRange;

  gId("minBinLbl").innerHTML = minBin;
  gId("maxBinLbl").innerHTML = maxBin;
  gId("audioDataLengthLbl").innerHTML = leftChannelArray.length;
  gId("audioDurationLbl").innerHTML = audio.duration;
  gId("windowLengthLbl").innerHTML = (fftSize / sampleRate) * 1000 + "ms";

  gId("sampleRateLbl").innerHTML = sampleRate + "Hz";
  gId("bitDepthLbl").innerHTML = bitDepth + " Bits";
  gId("channelsLbl").innerHTML = channels;

  gId("freqPerBarLbl").innerHTML = freqRange / bars + "Hz";
  gId("barsPerFreqLbl").innerHTML = bars / freqRange;

  gId("binsPerFreqLbl").innerHTML = binRange / freqRange;
  gId("freqPerBinLbl").innerHTML = freqPerBin + "Hz";

  gId("binsPerBarLbl").innerHTML = binRange / bars;
  gId("barsPerBinLbl").innerHTML = bars / binRange;

  gId("freqRangeLbl").innerHTML = freqRange + "Hz";
  gId("desiredFreqRangeLbl").innerHTML = bars * (freqPerBin * 2) + "Hz";
  gId("desiredFftSizeLbl").innerHTML = sampleRate / freqPerBar;
  gId("desiredBarsLbl").innerHTML = freqRange / freqPerBar;
}

function targetResolution(barWidth, barSpace, Nbars) {
  return barSpace + Nbars * (barWidth + barSpace);
}
