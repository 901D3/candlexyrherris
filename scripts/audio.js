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
//  const scale = (maxBin - minBin) / Nbars;
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

  const binsPerBar = (maxBin - minBin) / Nbars;
  const barBuffer = new Array(Nbars).fill(0);

  for (let i = 0; i < Nbars; i++) {
    const startBin = minBin + i * binsPerBar;
    const endBin = minBin + (i + 1) * binsPerBar;

    for (let j = startBin; j < endBin; j++) {
      const realValue = real[j];
      const imagValue = imag[j];
      const mag = sqrt(realValue ** 2 + imagValue ** 2) * 0.0009765625; // divide by 1024
      if (abs(realValue) > barBuffer[i]) barBuffer[i] = mag;
    }

    let value = barBuffer[i] * volMultiplier;
    if (value < threshold) value = 0;

    barBuffer[i] = value;
  }

  return barBuffer;
}

//===== MISC =====

function displayInfo() {
  if (!stftRe) return;
  let sampleRateLbl = gId("sampleRateLbl");
  let bitDepthLbl = gId("bitDepthLbl");
  let channelsLbl = gId("channelsLbl");

  let barsPerFreqLbl = gId("barsPerFreqLbl");
  let binsPerFreqLbl = gId("binsPerFreqLbl");

  let freqPerBarLbl = gId("freqPerBarLbl");
  let binsPerBarLbl = gId("binsPerBarLbl");

  let barsPerBinLbl = gId("barsPerBinLbl");
  let freqPerBinLbl = gId("freqPerBinLbl");

  sampleRateLbl.innerHTML = sampleRate + "Hz";
  bitDepthLbl.innerHTML = bitDepth + " Bits";
  channelsLbl.innerHTML = channels;

  const fftSizeValue = stftRe.length;
  const halfSampleRate = sampleRate * 0.5;
  const minBin = floor((minFreq / halfSampleRate) * fftSizeValue);
  const maxBin = min(floor((maxFreq / halfSampleRate) * fftSizeValue), fftSizeValue - 1);

  const currentFreqRange = maxFreq - minFreq;

  const barsPerFreq = bars / (maxFreq - minFreq);
  const binsPerFreq = fftSizeValue / sampleRate;

  const freqPerBar = (maxFreq - minFreq) / bars;
  const binsPerBar = bars / (maxBin - minBin);

  const freqPerBin = sampleRate / fftSizeValue;
  const barsPerBin = (maxBin - minBin) / bars;

  barsPerFreqLbl.innerHTML = barsPerFreq;
  binsPerFreqLbl.innerHTML = binsPerFreq;

  freqPerBarLbl.innerHTML = freqPerBar + "Hz";
  binsPerBarLbl.innerHTML = binsPerBar;

  freqPerBinLbl.innerHTML = freqPerBin + "Hz";
  barsPerBinLbl.innerHTML = barsPerBin;

  const frequencyRangeDesired = bars * freqPerBin;
  console.log(frequencyRangeDesired);
  gId("maxFrequencyInput").placeholder = frequencyRangeDesired;
  gId("currentFreqRangeLbl").innerHTML = currentFreqRange;
  gId("desiredFreqRangeLbl").innerHTML = frequencyRangeDesired;
}

function targetResolution(barWidth, barSpace, Nbars) {
  return barSpace + Nbars * (barWidth + barSpace);
}
