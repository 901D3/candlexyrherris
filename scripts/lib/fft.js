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

//===== NOTICE =====
//This fft.js is a modded version of nayuki's fft.js. mostly optimized bluestein.
//

"use strict";
/*
 * Computes the discrete Fourier _transform (DFT) of the given complex vector, storing the result back into the vector.
 * The vector can have any length. This is a wrapper function.
 */
var FFTUtils = (function () {
  function _transform(real, imag) {
    const realLength = real.length;
    const imagLength = imag.length;
    if (realLength != imagLength) throw new RangeError("Mismatched lengths | real: " + realLength + " | imag: " + imagLength);

    if (realLength == 0) return;
    // Is power of 2
    else if ((realLength & (realLength - 1)) == 0) _transformRadix2(real, imag);
    // More complicated algorithm for arbitrary sizes
    else _transformBluestein(real, imag);
  }

  // Returns the integer whose value is the reverse of the lowest 'width' bits of the integer 'val'.
  function _reverseBits(val, width) {
    let result = 0;
    for (let i = 0; i < width; i++) {
      result = (result << 1) | (val & 1);
      val >>>= 1;
    }
    return result;
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
    if (realLength != imagLength) throw new RangeError("Mismatched lengths | real: " + realLength + " | imag: " + imagLength);
    if (realLength == 1) return;

    let i;
    let j;
    let size;
    let temp;

    let levels = -1;
    for (let i = 0; i < 32; i++) {
      if (1 << i == realLength) levels = i; // Equal to log2(realLength)
    }
    if (levels == -1) throw new RangeError("Length is not a power of 2");

    let {cosTable, sinTable} = getRadix2Tables(realLength);

    // Bit-reversed addressing permutation
    for (let i = 0; i < realLength; i++) {
      const j = _reverseBits(i, levels);
      if (j > i) {
        temp = real[i];
        real[i] = real[j];
        real[j] = temp;

        temp = imag[i];
        imag[i] = imag[j];
        imag[j] = temp;
      }
    }

    // Cooley-Tukey decimation-in-time radix-2 FFT
    for (size = 2; size <= realLength; size *= 2) {
      const halfsize = size / 2;
      const tablestep = realLength / size;
      for (i = 0; i < realLength; i += size) {
        for (j = i; j < i + halfsize; j++) {
          const l = j + halfsize;
          const k = (j - i) * tablestep;
          const reallValue = real[l];
          const imaglValue = imag[l];
          const realjValue = real[j];
          const imagjValue = imag[j];
          const cosTablekValue = cosTable[k];
          const sinTablekValue = sinTable[k];
          const tpre = reallValue * cosTablekValue + imaglValue * sinTablekValue;
          const tpim = -reallValue * sinTablekValue + imaglValue * cosTablekValue;
          real[l] = realjValue - tpre;
          imag[l] = imagjValue - tpim;
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

  const bluesteinCache = new Map();

  function getBluesteinTables(n) {
    if (!bluesteinCache.has(n)) {
      const cosTable = new Float32Array(n);
      const sinTable = new Float32Array(n);
      const n2 = n * 2;
      for (let i = 0; i < n; i++) {
        const j = (i * i) % n2;
        cosTable[i] = cos((PI * j) / n);
        sinTable[i] = sin((PI * j) / n);
      }
      bluesteinCache.set(n, {cosTable, sinTable});
    }
    return bluesteinCache.get(n);
  }

  /*
   * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
   * The vector can have any length. This requires the convolution function, which in turn requires the radix-2 FFT function.
   * Uses Bluestein's chirp z-transform algorithm.
   */
  function _transformBluestein(real, imag) {
    let i = 0;
    let mBlstein = 1;
    const realLength = real.length;
    const realLength2 = realLength * 2;
    if (realLength != imag.length) throw new RangeError("Mismatched lengths");
    const {cosTable, sinTable} = getBluesteinTables(realLength);

    while (mBlstein <= realLength2) mBlstein *= 2;

    const brealBlstein = new Float32Array(mBlstein);
    const bimagBlstein = new Float32Array(mBlstein);
    brealBlstein[0] = cosTable[0];
    bimagBlstein[0] = sinTable[0];

    const arealBlstein = new Float32Array(mBlstein); //Preprocessing
    const aimagBlstein = new Float32Array(mBlstein); //Preprocessing
    const crealBlstein = new Float32Array(mBlstein); //Convolution
    const cimagBlstein = new Float32Array(mBlstein); //Convolution

    // Temporary vectors and preprocessing
    for (i = 0; i < realLength; i++) {
      const cosTableValue = cosTable[i];
      const sinTableValue = sinTable[i];
      const imagValue = imag[i];
      const realValue = real[i];
      arealBlstein[i] = realValue * cosTableValue + imagValue * sinTableValue;
      aimagBlstein[i] = -realValue * sinTableValue + imagValue * cosTableValue;
    }

    for (i = 1; i < realLength; i++) {
      brealBlstein[i] = cosTable[i];
      bimagBlstein[i] = sinTable[i];
    }
    for (i = 1; i < realLength; i++) {
      const mBlsteinMi = mBlstein - i;
      brealBlstein[mBlsteinMi] = cosTable[i];
      bimagBlstein[mBlsteinMi] = sinTable[i];
    }

    // Convolution
    _convolveComplex(arealBlstein, aimagBlstein, brealBlstein, bimagBlstein, crealBlstein, cimagBlstein);

    // Postprocessing
    for (let i = 0; i < realLength; i++) {
      const cosTableValue = cosTable[i];
      const sinTableValue = sinTable[i];
      const realValue = crealBlstein[i];
      const imagValue = cimagBlstein[i];
      real[i] = realValue * cosTableValue + imagValue * sinTableValue;
      imag[i] = -realValue * sinTableValue + imagValue * cosTableValue;
    }
  }

  /*
   * Computes the circular convolution of the given real/complex vectors. Each vector's length must be the same.
   */
  function _convolveReal(xvec, yvec, outvec) {
    const n = xvec.length;
    if (n != yvec.length || n != outvec.length) throw new RangeError("Mismatched lengths");
    _convolveComplex(xvec, newArrayOfZeros(n), yvec, newArrayOfZeros(n), outvec, newArrayOfZeros(n));
  }

  let scratchXreal, scratchXimag, scratchYreal, scratchYimag;

  function ensureScratch(n) {
    if (!scratchXreal || scratchXreal.length !== n) {
      scratchXreal = new Float32Array(n);
      scratchXimag = new Float32Array(n);
      scratchYreal = new Float32Array(n);
      scratchYimag = new Float32Array(n);
    }
  }

  function _convolveComplex(xreal, ximag, yreal, yimag, outreal, outimag) {
    const n = xreal.length;
    ensureScratch(n);

    scratchXreal.set(xreal);
    scratchXimag.set(ximag);
    scratchYreal.set(yreal);
    scratchYimag.set(yimag);

    _transform(scratchXreal, scratchXimag);
    _transform(scratchYreal, scratchYimag);

    for (let i = 0; i < n; i++) {
      const xr = scratchXreal[i];
      const xi = scratchXimag[i];
      const yr = scratchYreal[i];
      const yi = scratchYimag[i];
      scratchXreal[i] = xr * yr - xi * yi;
      scratchXimag[i] = xi * yr + xr * yi;
    }

    //inverse transform
    _transform(scratchXimag, scratchXreal);

    for (let i = 0; i < n; i++) {
      outreal[i] = scratchXreal[i] / n;
      outimag[i] = scratchXimag[i] / n;
    }
  }

  return {
    transform: _transform,
    transformRadix2: _transformRadix2,
    transformBluestein: _transformBluestein,

    reverseBits: _reverseBits,

    convolveReal: _convolveReal,
    convolveComplex: _convolveComplex,
  };
})();
