var binUtils = (function () {
  function _readULEndian(offset, bits, array) {
    if (!array) throw new Error("Array is required");
    if (bits % 8 !== 0) throw new Error("Bits must be a multiple of 8");

    const bytes = bits / 8;
    let result = 0;

    for (let i = 0; i < bytes; i++) {
      result |= array[offset + i] << (8 * i);
    }

    return result >>> 0;
  }

  /**
   * Search binary inside an array
   *
   * @param array Input array for searching
   * @param text Hex keyword
   * @param start Start position
   * @param end End position, default to array.length
   * @returns position of the keyword
   */

  function _binSearch(array, text, start = 0, end = array.length) {
    if (!array) return -1;
    const arrayLength = array.length;
    end = min(end ?? arrayLength, arrayLength);

    const textLength = text.length;
    const startEndLength = end - start;

    //safety checks
    if (start < 0) {
      console.log(`Start offset out of range [0 - ${arrayLength}]: ${start}`);
      return false;
    }
    if (end > arrayLength) {
      console.log(`End offset out of range [0 - ${arrayLength}]: ${end}`);
      return false;
    }
    if (textLength > startEndLength) {
      console.log(`Bytes length is too long for search range: ${textLength} > ${startEndLength}`);
      return false;
    }

    //brute force search
    for (let i = start; i <= end - textLength; i++) {
      let ok = true;
      for (let j = 0; j < textLength; j++) {
        if (array[i + j] !== text[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return i;
    }
    return false;
  }

  function _isM4A(array) {
    if (!array || array.length < 12) return false;

    const brands = [
      [0x4d, 0x34, 0x41, 0x20], // "M4A "
      [0x69, 0x73, 0x6f, 0x6d], // "isom"
      [0x6d, 0x70, 0x34, 0x32], // "mp42"
      [0x4d, 0x34, 0x42, 0x20], // "M4B "
    ];

    // find ftyp box in the header
    const ftypPos = _binSearch(array, [0x66, 0x74, 0x79, 0x70], 0, 64);
    if (ftypPos === false) {
      printLog("ftyp not found | offset: " + ftypPos);
      return false;
    }

    // check the brand right after ftyp
    const brandStart = ftypPos + 4;
    for (const brand of brands) {
      if (_binSearch(array, brand, brandStart, brandStart + 4) !== false) {
        return brand;
      }
    }

    printLog(brands + "not found");
    return false;
  }

  return {
    binSearch: _binSearch,
    readULEndian: _readULEndian,
    isM4A: _isM4A,
  };
})();
