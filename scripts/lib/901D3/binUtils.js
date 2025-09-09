var binUtils = (function () {
  function _readULEndian(offset, bits, array) {//is it lendian???
    if (!array) throw new Error("Array is required");
    if (bits % 8 !== 0) throw new Error("Bits must be a multiple of 8");

    const bytes = bits / 8;
    let result = 0;

    for (let i = 0; i < bytes; i++) {
      result |= array[offset + i] << (8 * i);
    }

    return result >>> 0;
  }

  return {
    readULEndian: _readULEndian,
  };
})();
