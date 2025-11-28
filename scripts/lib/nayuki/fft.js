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

const nayuki = (() => {
  const _transform = (real, imag) => {
    const fftSize = real.length;
    if (fftSize != imag.length) throw new Error("Mismatched lengths");
    // Is power of 2
    else if ((fftSize & (fftSize - 1)) == 0) _transformRadix2(real, imag);
    // More complicated algorithm for arbitrary sizes
    else _transformBluestein(real, imag);
  };

  // Returns the integer whose value is the reverse of the lowest 'width' bits of the integer 'val'.
  const bitReverseCache = new Map();

  const getBitReversal = (n) => {
    if (!bitReverseCache.has(n)) {
      const levels = Math.log2(n) | 0;
      const reverse = new Uint32Array(n);

      for (let i = 0; i < n; i++) {
        let val = i;
        let result = 0;

        for (let j = 0; j < levels; j++) {
          result = (result << 1) | (val & 1);
          val >>>= 1;
        }

        reverse[i] = result;
      }

      bitReverseCache.set(n, reverse);
    }

    return bitReverseCache.get(n);
  };

  const trigsLUT = new Map();

  const getTrigsLUT = (n) => {
    if (!trigsLUT.has(n)) {
      const PI2 = 2 * PI;

      const cosTable = new Float32Array(n);
      const sinTable = new Float32Array(n);

      for (let i = 0; i < n; i++) {
        const angle = (PI2 * i) / n;

        cosTable[i] = Math.cos(angle);
        sinTable[i] = Math.sin(angle);
      }

      trigsLUT.set(n, {cosTable, sinTable});
    }

    return trigsLUT.get(n);
  };

  /*
   * Computes the discrete Fourier _transform (DFT) of the given complex vector, storing the result back into the vector.
   * The vector's length must be a power of 2. Uses the Cooley-Tukey decimation-in-time radix-2 algorithm.
   */

  const _transformRadix2 = (real, imag) => {
    const fftSize = real.length;
    if (fftSize != imag.length) throw new Error("Mismatched lengths");

    const levels = Math.log2(fftSize) | 0;
    if (levels == -1) throw new Error("Length is not a power of 2");

    const {cosTable, sinTable} = getTrigsLUT(fftSize);
    const reverseIndices = getBitReversal(fftSize);

    // Bit-reversed addressing permutation
    for (let i = 0; i < fftSize; i++) {
      const j = reverseIndices[i];

      if (j > i) {
        let tmp = real[i];
        real[i] = real[j];
        real[j] = tmp;

        tmp = imag[i];
        imag[i] = imag[j];
        imag[j] = tmp;
      }
    }

    // Cooley-Tukey decimation-in-time radix-2 FFT
    for (let size = 2; size <= fftSize; size <<= 1) {
      const halfsize = size >> 1;
      const tablestep = fftSize / size;

      for (let i = 0; i < fftSize; i += size) {
        let k = 0;

        for (let j = i, iHalfSize = i + halfsize; j < iHalfSize; j++, k++) {
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
  };

  /*
   * Computes the discrete Fourier _transform (DFT) of the given complex vector, storing the result back into the vector.
   * The vector can have any length. This requires the convolution function, which in turn requires the radix-2 FFT function.
   * Uses Bluestein's chirp z-transform algorithm.
   */

  const bluesteinTrigLUT = new Map();

  const getBluesteinTrigsLUT = (n) => {
    if (!bluesteinTrigLUT.has(n)) {
      const cosTable = new Float32Array(n);
      const sinTable = new Float32Array(n);
      const n2 = n * 2;

      for (let i = 0; i < n; i++) {
        const PI_n = (PI * ((i * i) % n2)) / n;

        cosTable[i] = Math.cos(PI_n);
        sinTable[i] = Math.sin(PI_n);
      }

      bluesteinTrigLUT.set(n, {cosTable, sinTable});
    }

    return bluesteinTrigLUT.get(n);
  };

  /*
   * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
   * The vector can have any length. This requires the convolution function, which in turn requires the radix-2 FFT function.
   * Uses Bluestein's chirp z-transform algorithm.
   */

  const _transformBluestein = (real, imag) => {
    const fftSize = real.length;
    if (fftSize != imag.length) throw new Error("Mismatched lengths");

    let m = 1;
    const dbFftSize = (fftSize << 1) + 1;
    while (m < dbFftSize) m <<= 1;

    const {cosTable, sinTable} = getBluesteinTrigsLUT(fftSize);

    const aReal = new Float32Array(m);
    const aImag = new Float32Array(m);

    for (let i = 0; i < fftSize; i++) {
      const cosValue = cosTable[i];
      const sinValue = sinTable[i];

      const re = real[i];
      const im = imag[i];

      aReal[i] = re * cosValue + im * sinValue;
      aImag[i] = -re * sinValue + im * cosValue;
    }

    const bReal = new Float32Array(m);
    const bImag = new Float32Array(m);

    for (let i = 0; i < fftSize; i++) {
      const cosValue = cosTable[i];
      const sinValue = sinTable[i];

      const idx2 = m - i;

      bReal[i] = cosValue;
      bImag[i] = sinValue;

      bReal[idx2] = cosValue;
      bImag[idx2] = sinValue;
    }

    const cReal = new Float32Array(m);
    const cImag = new Float32Array(m);

    _convolveComplex(aReal, aImag, bReal, bImag, cReal, cImag);

    real.set(cReal.subarray(0, fftSize));
    imag.set(cImag.subarray(0, fftSize));
  };

  const _convolveComplex = (xReal, xImag, yReal, yImag, outReal, outImag) => {
    const fftSize = xReal.length;
    if (
      fftSize != xImag.length ||
      fftSize != yReal.length ||
      fftSize != yImag.length ||
      fftSize != outReal.length ||
      fftSize != outImag.length
    ) {
      throw new Error("Mismatched lengths");
    }

    const xRealTemp = xReal.slice();
    const xImagTemp = xImag.slice();
    const yRealTemp = yReal.slice();
    const yImagTemp = yImag.slice();

    _transform(xRealTemp, xImagTemp);
    _transform(yRealTemp, yImagTemp);

    for (let i = 0; i < fftSize; i++) {
      const xRealValue = xRealTemp[i];
      const xImagValue = xImagTemp[i];

      const yRealValue = yRealTemp[i];
      const yImagValue = yImagTemp[i];

      xRealTemp[i] = xRealValue * yRealValue - xImagValue * yImagValue;
      xImagTemp[i] = xImagValue * yRealValue + xRealValue * yImagValue;
    }

    _transform(xImagTemp, xRealTemp);

    outReal.set(xRealTemp);
    outImag.set(xImagTemp);

    // Scaling (because this FFT implementation omits it)
    for (let i = 0; i < fftSize; i++) {
      outReal[i] /= fftSize;
      outImag[i] /= fftSize;
    }
  };

  // Other Fourier Transforms

  const _dft = (real, imag) => {
    const fftSize = real.length;

    const outputRe = new Float32Array(fftSize);
    const outputIm = new Float32Array(fftSize);

    const {cosTable, sinTable} = getTrigsLUT(fftSize);

    for (let k = 0; k < fftSize; k++) {
      let idx = 0;

      let sumRe = 0;
      let sumIm = 0;

      for (let n = 0; n < fftSize; n++) {
        const cosAngle = cosTable[idx];
        const sinAngle = sinTable[idx];

        const re = real[n];
        const im = imag[n];

        sumRe += re * cosAngle - im * sinAngle;
        sumIm += re * sinAngle + im * cosAngle;

        idx += k;
      }

      outputRe[k] = sumRe;
      outputIm[k] = sumIm;
    }

    // Copy results back
    real.set(outputRe);
    imag.set(outputIm);
  };

  return {
    transform: _transform,
    transformRadix2: _transformRadix2,
    transformBluestein: _transformBluestein,

    dft: _dft,

    convolveComplex: _convolveComplex,
  };
})();
