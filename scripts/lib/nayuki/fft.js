/*
 * Free FFT and convolution (compiled from TypeScript)
 *
 * Copyright (c) 2022 Project Nayuki. (MIT License)
 * https://www.nayuki.io/page/free-small-fft-in-multiple-languages
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */

"use strict";
/*
 * Computes the discrete Fourier _transform (DFT) of the given complex vector, storing the result back into the vector.
 * The vector can have any length. This is a wrapper function.
 */
var nayuki = (function () {
  function _transform(real, imag) {
    const realLength = real.length;
    const imagLength = imag.length;
    if (realLength != imagLength)
      printLog("Mismatched lengths | real: " + realLength + " | imag: " + imagLength, 1, "red", "red");

    if (realLength == 0) return;
    // Is power of 2
    else if ((realLength & (realLength - 1)) == 0) _transformRadix2(real, imag);
    // More complicated algorithm for arbitrary sizes
    else _transformBluestein(real, imag);
  }

  // Returns the integer whose value is the reverse of the lowest 'width' bits of the integer 'val'.
  //LUT for reverse bit
  const bitReverseCache = new Map();

  function getBitReversal(n) {
    if (!bitReverseCache.has(n)) {
      const levels = log2(n) | 0;
      const reverse = new Uint32Array(n);
      for (let i = 0; i < n; i++) {
        let val = i,
          result = 0;
        for (let j = 0; j < levels; j++) {
          result = (result << 1) | (val & 1);
          val >>>= 1;
        }
        reverse[i] = result;
      }
      bitReverseCache.set(n, reverse);
    }
    return bitReverseCache.get(n);
  }

  //LUT table for radix-2
  const radix2Cache = new Map();

  function getRadix2Tables(n) {
    if (!radix2Cache.has(n)) {
      const halfn = n * 0.5;
      const cosTable = new Float32Array(halfn);
      const sinTable = new Float32Array(halfn);
      for (let i = 0; i < halfn; i++) {
        const _2PIMiDn = (_2PI * i) / n;
        cosTable[i] = cos(_2PIMiDn);
        sinTable[i] = sin(_2PIMiDn);
      }
      radix2Cache.set(n, {cosTable, sinTable});
    }
    return radix2Cache.get(n);
  }

  /*
   * Computes the discrete Fourier _transform (DFT) of the given complex vector, storing the result back into the vector.
   * The vector's length must be a power of 2. Uses the Cooley-Tukey decimation-in-time radix-2 algorithm.
   */
  function _transformRadix2(real, imag) {
    const realLength = real.length;
    const imagLength = imag.length;
    if (realLength != imagLength)
      printLog("Mismatched lengths | real: " + realLength + " | imag: " + imagLength, 1, "red", "red");
    if (realLength == 1) return;

    const levels = log2(realLength) | 0;
    if (levels == -1) printLog("Length is not a power of 2", 1, "red");

    const {cosTable, sinTable} = getRadix2Tables(realLength);
    const reverseIndices = getBitReversal(realLength);

    // Bit-reversed addressing permutation
    for (let i = 0; i < realLength; i++) {
      const j = reverseIndices[i];
      if (j > i) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }

    // Cooley-Tukey decimation-in-time radix-2 FFT
    for (let size = 2; size <= realLength; size <<= 1) {
      const halfsize = size >> 1;
      const tablestep = realLength / size;
      for (let i = 0; i < realLength; i += size) {
        let k = 0;
        for (let j = i; j < i + halfsize; j++, k++) {
          const kTablestep = k * tablestep;
          const l = j + halfsize;
          const realLValue = real[l];
          const imagLValue = imag[l];
          const cosTableValue = cosTable[kTablestep];
          const sinTableValue = sinTable[kTablestep];
          const tpre = realLValue * cosTableValue + imagLValue * sinTableValue;
          const tpim = -realLValue * sinTableValue + imagLValue * cosTableValue;

          real[l] = real[j] - tpre;
          imag[l] = imag[j] - tpim;
          real[j] += tpre;
          imag[j] += tpim;
        }
      }
    }
  }

  /*
   * Computes the discrete Fourier _transform (DFT) of the given complex vector, storing the result back into the vector.
   * The vector can have any length. This requires the convolution function, which in turn requires the radix-2 FFT function.
   * Uses Bluestein's chirp z-transform algorithm.
   */

  const bluesteinTrigCache = new Map();

  function getBluesteinTables(n) {
    if (!bluesteinTrigCache.has(n)) {
      const cosTable = new Float32Array(n);
      const sinTable = new Float32Array(n);
      const n2 = n * 2;
      for (let i = 0; i < n; i++) {
        const PI_n = (PI * (pow(i, 2) % n2)) / n;
        cosTable[i] = cos(PI_n);
        sinTable[i] = sin(PI_n);
      }
      bluesteinTrigCache.set(n, {cosTable, sinTable});
    }
    return bluesteinTrigCache.get(n);
  }

  const bluesteinWorkCache = new Map();

  function getBluesteinWork(n) {
    let m = 1;
    while (m < n * 2 + 1) m <<= 1;
    if (!bluesteinWorkCache.has(n)) {
      bluesteinWorkCache.set(n, {
        aReal: new Float32Array(m),
        aImag: new Float32Array(m),
        bReal: new Float32Array(m),
        bImag: new Float32Array(m),
        cReal: new Float32Array(m),
        cImag: new Float32Array(m),
        m,
      });
    }
    return bluesteinWorkCache.get(n);
  }

  /*
   * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
   * The vector can have any length. This requires the convolution function, which in turn requires the radix-2 FFT function.
   * Uses Bluestein's chirp z-transform algorithm.
   */
  function _transformBluestein(real, imag) {
    let i = 0;
    const realLength = real.length;
    if (realLength != imag.length)
      printLog("Mismatched lengths | real: " + realLength + " | imag: " + imag.length, 1, "red", "red");
    const {cosTable, sinTable} = getBluesteinTables(realLength);
    const {aReal, aImag, bReal, bImag, cReal, cImag, m} = getBluesteinWork(realLength);

    bReal[0] = cosTable[0];
    bImag[0] = sinTable[0];

    // Temporary vectors and preprocessing
    for (i = 0; i < realLength; i++) {
      const cosValue = cosTable[i];
      const sinValue = sinTable[i];
      const re = real[i];
      const im = imag[i];
      aReal[i] = re * cosValue + im * sinValue;
      aImag[i] = -re * sinValue + im * cosValue;
    }

    for (i = 1; i < realLength; i++) {
      bReal[i] = cosTable[i];
      bImag[i] = sinTable[i];
    }

    for (i = 1; i < realLength; i++) {
      const idx = m - i;
      bReal[idx] = cosTable[i];
      bImag[idx] = sinTable[i];
    }

    // Convolution
    _convolveComplex(aReal, aImag, bReal, bImag, cReal, cImag);

    // We dont need postprocessing because we only need the magnitude
    for (let i = 0; i < realLength; i++) {
      real[i] = cReal[i];
      imag[i] = cImag[i];
    }
  }

  /*
   * Computes the circular convolution of the given real/complex vectors. Each vector's length must be the same.
   */
  function _convolveReal(xvec, yvec, outvec) {
    const n = xvec.length;
    if (n != yvec.length || n != outvec.length) printLog("Mismatched lengths", 1, "red", "red");
    _convolveComplex(xvec, newArrayOfZeros(n), yvec, newArrayOfZeros(n), outvec, newArrayOfZeros(n));
  }

  function _convolveComplex(xReal, xImag, yReal, yImag, outReal, outImag) {
    const XRealLength = xReal.length;
    if (
      XRealLength != xImag.length ||
      XRealLength != yReal.length ||
      XRealLength != yImag.length ||
      XRealLength != outReal.length ||
      XRealLength != outImag.length
    )
      printLog("Mismatched lengths", 1, "red", "red");
    xReal = xReal.slice();
    xImag = xImag.slice();
    yReal = yReal.slice();
    yImag = yImag.slice();

    _transform(xReal, xImag);
    _transform(yReal, yImag);

    for (let i = 0; i < XRealLength; i++) {
      const xRealValue = xReal[i];
      const xImagValue = xImag[i];
      const yRealValue = yReal[i];
      const yImagValue = yImag[i];
      xReal[i] = xRealValue * yRealValue - xImagValue * yImagValue;
      xImag[i] = xImagValue * yRealValue + xRealValue * yImagValue;
    }

    _transform(xImag, xReal);
    // Scaling (because this FFT implementation omits it)
    for (let i = 0; i < XRealLength; i++) {
      outReal[i] = xReal[i] / XRealLength;
      outImag[i] = xImag[i] / XRealLength;
    }
  }

  //Other Fourier Transforms

  function _dft(real, imag) {
    const size = real.length;
    const minus2PI = -2 * PI;

    const outputRe = new Float32Array(size);
    const outputIm = new Float32Array(size);

    for (let k = 0; k < size; k++) {
      let sumRe = 0;
      let sumIm = 0;
      for (let n = 0; n < size; n++) {
        const angle = (minus2PI * k * n) / size;
        const cosAngle = cos(angle);
        const sinAngle = sin(angle);

        sumRe += real[n] * cosAngle - imag[n] * sinAngle;
        sumIm += real[n] * sinAngle + imag[n] * cosAngle;
      }
      outputRe[k] = sumRe;
      outputIm[k] = sumIm;
    }

    // Copy results back
    for (let i = 0; i < size; i++) {
      real[i] = outputRe[i];
      imag[i] = outputIm[i];
    }
  }

  //End of Other Fourier Transforms

  return {
    transform: _transform,
    transformRadix2: _transformRadix2,
    transformBluestein: _transformBluestein,

    dft: _dft,

    convolveReal: _convolveReal,
    convolveComplex: _convolveComplex,
  };
})();
