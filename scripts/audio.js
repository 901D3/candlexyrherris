function getVisualizerBufferFromFFT(real, imag, Nbars, threshold, minBin, maxBin, interleaved = false) {
  const barBuffer = new Float32Array(Nbars).fill(0);
  const binRange = maxBin - minBin;

  let currentBin = minBin;
  const binStep = binRange / Nbars;

  let readBin = (j) => {
    return {
      re: real[j + realShift],
      im: imag[j + imagShift],
    };
  };
  if (interleaved) {
    readBin = (dummy, halfIdx, check) => {
      const re = check ? real[halfIdx + realShift] : imag[halfIdx + imagShift];
      const im = check ? imag[halfIdx + realShift] : real[halfIdx + 1 + imagShift];
      return {
        re,
        im,
      };
    };
  }

  for (let i = 0; i < Nbars && currentBin < maxBin; i++) {
    const barValue = barBuffer[i];
    const endBin = Math.min(currentBin + binStep, maxBin);
    const startIdx = Math.floor(currentBin);
    const endIdx = Math.ceil(endBin);

    for (let j = startIdx; j < endIdx; j++) {
      const check = j % 2 === 0;
      const {re: realV, im: imagV} = readBin(j, floor(j / 2), check);
      barBuffer[i] = Math.sqrt(realV ** 2 + imagV ** 2) / fftSize;
    }

    if (barValue < threshold) barBuffer[i] = 0;
    currentBin = endBin;
  }

  //second bar fix for virtual interleaved, exactly what Sonic Candle did
  if (interleaved && fftInterleaveFix) barBuffer[1] = (barBuffer[0] + barBuffer[2]) / 2;

  return barBuffer;
}

//===== MISC =====

function displayInfo() {
  const binHz = sampleRate / fftSize;
  const minFreq = minBin * binHz;
  const maxFreq = maxBin * binHz;

  const binRange = maxBin - minBin;
  const freqRange = maxFreq - minFreq;

  const freqPerBar = freqRange / bars;
  const freqPerBin = freqRange / binRange;

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

  gId("minFreqLbl").innerHTML = minFreq + "Hz";
  gId("maxFreqLbl").innerHTML = maxFreq + "Hz";
  gId("freqRangeLbl").innerHTML = freqRange + "Hz";
  gId("binRangeLbl").innerHTML = maxBin;

  gId("desiredFreqRangeLbl").innerHTML = bars * (freqPerBin * 2) + "Hz";
  gId("desiredFftSizeLbl").innerHTML = sampleRate / freqPerBar;
  gId("desiredBarsLbl").innerHTML = freqRange / freqPerBar;
}

function targetResolution(barWidth, barSpace, Nbars) {
  return barSpace + Nbars * (barWidth + barSpace);
}
