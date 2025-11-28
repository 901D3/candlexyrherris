function getVisualizerBufferFromFFT(
  real,
  imag,
  Nbars,
  threshold,
  minBin,
  maxBin,
  interleaved = false
) {
  const barBuffer = new Float32Array(Nbars);
  const binRange = maxBin - minBin;

  let currentBin = minBin;
  const binStep = binRange / Nbars;

  const getMag = interleaved
    ? (i) => real[i + realShift] + imag[i + imagShift]
    : (i) => Math.sqrt(real[i + realShift] ** 2 + imag[i + imagShift] ** 2);

  for (let i = 0; i < Nbars && currentBin < maxBin; i++) {
    const endBin = Math.min(currentBin + binStep, maxBin);
    const startIdx = Math.floor(currentBin);
    const endIdx = Math.ceil(endBin);
    let mag = getMag(startIdx);

    if (binValuePicking === "max") {
      for (let j = startIdx + 1; j < endIdx; j++) {
        const v = getMag(j);
        if (v > mag) mag = v;
      }
    } else if (binValuePicking === "min") {
      for (let j = startIdx + 1; j < endIdx; j++) {
        const v = getMag(j);
        if (v < mag) mag = v;
      }
    } else if (binValuePicking === "avg") {
      for (let j = startIdx + 1; j < endIdx; j++) mag += getMag(j);

      mag /= endIdx - startIdx;
    } else if (binValuePicking === "rms") {
      for (let j = startIdx + 1; j < endIdx; j++) mag += getMag(j) ** 2;

      mag = Math.sqrt(mag / (endIdx - startIdx));
    }

    barBuffer[i] = amplitudeOffset + mag;

    if (barBuffer[i] < threshold) barBuffer[i] = 0;
    currentBin = endBin;
  }

  // Second bar fix for interleaved effect, exactly what Sonic Candle did
  if (interleaved && interleaveEffectFix) barBuffer[1] = (barBuffer[0] + barBuffer[2]) / 2;

  return barBuffer;
}
