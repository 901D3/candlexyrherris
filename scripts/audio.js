function getVisualizerBufferFromFFT(real, imag, Nbars, threshold, minBin, maxBin, interleaved = false) {
  const barBuffer = new Float32Array(Nbars);
  const binRange = maxBin - minBin;

  let currentBin = minBin;
  const binStep = binRange / Nbars;

  for (let i = 0; i < Nbars && currentBin < maxBin; i++) {
    const endBin = Math.min(currentBin + binStep, maxBin);
    const startIdx = Math.floor(currentBin);
    const endIdx = Math.ceil(endBin);
    let mag;
    if (binValuePicking === "first") {
      if (interleaved) {
        mag = real[startIdx + realShift] + imag[startIdx + imagShift];
      } else {
        mag = Math.sqrt(real[startIdx + realShift] ** 2 + imag[startIdx + imagShift] ** 2);
      }
    } else if (binValuePicking === "last") {
      if (interleaved) {
        mag = real[endIdx + realShift] + imag[endIdx + imagShift];
      } else {
        mag = Math.sqrt(real[endIdx + realShift] ** 2 + imag[endIdx + imagShift] ** 2);
      }
    } else if (binValuePicking === "max") {
      let value;
      mag = -Infinity;

      for (let j = startIdx; j < endIdx; j++) {
        if (interleaved) {
          value = real[j + realShift] + imag[j + imagShift];
        } else {
          value = Math.sqrt(real[j + realShift] ** 2 + imag[j + imagShift] ** 2);
        }
        if (value > mag) mag = value;
      }
    } else if (binValuePicking === "avg") {
      mag = 0;

      for (let j = startIdx; j < endIdx; j++) {
        if (interleaved) {
          mag += real[j + realShift] + imag[j + imagShift];
        } else {
          mag += Math.sqrt(real[j + realShift] ** 2 + imag[j + imagShift] ** 2);
        }
      }
      mag /= endIdx - startIdx;
    } else if (binValuePicking === "rms") {
      mag = 0;

      for (let j = startIdx; j < endIdx; j++) {
        let value;
        if (interleaved) {
          value = real[j + realShift] + imag[j + imagShift];
        } else {
          value = Math.sqrt(real[j + realShift] ** 2 + imag[j + imagShift] ** 2);
        }
        mag += value ** 2;
      }
      mag = Math.sqrt(mag / (endIdx - startIdx));
    }

    barBuffer[i] = amplitudeOffset + (mag / fftSize) * postVolMultiply;

    if (barBuffer[i] < threshold) barBuffer[i] = 0;
    currentBin = endBin;
  }

  // second bar fix for interleaved effect, exactly what Sonic Candle did
  if (interleaved && interleaveEffectFix) barBuffer[1] = (barBuffer[0] + barBuffer[2]) / 2;

  return barBuffer;
}

// some other stuff

function displayInfo() {
  const binHz = sampleRate / fftSize;
  const minFreq = minBin * binHz;
  const maxFreq = maxBin * binHz;

  const binRange = maxBin - minBin;
  const freqRange = maxFreq - minFreq;

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

  gId("minFreqLbl").innerHTML = (interleaveEffect ? minFreq / 2 : minFreq) + "Hz";
  gId("maxFreqLbl").innerHTML = (interleaveEffect ? maxFreq / 2 : maxFreq) + "Hz";
  gId("freqRangeLbl").innerHTML = (interleaveEffect ? freqRange / 2 : freqRange) + "Hz";
  gId("binRangeLbl").innerHTML = maxBin;
}

function targetResolution(barWidth, barSpace, Nbars) {
  return barSpace + Nbars * (barWidth + barSpace);
}
