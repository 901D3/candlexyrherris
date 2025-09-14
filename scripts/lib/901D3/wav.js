//Turn into library so it can be used by anyone and not tied to this project

/**
 * A simple WAV file reader and converter
 * 901D3's wav.js is licensed under the GPLv3 license
 */

var wavjs = (function () {
  function _readWavHeader(inArray) {
    const t0 = performance.now();
    if (!inArray) {
      printLog("Unknown input array");
    }
    let outArray = inArray;
    let pos = 0;

    const RIFFFourCC = binUtils.binSearch(outArray, [0x52, 0x49, 0x46, 0x46], 0, 4);
    //read wav file header
    if (RIFFFourCC === false) {
      printLog("[Wav reader] > Invalid endianness: | offset: " + pos);
      return false;
      //will support big endian in the future
      //const RIFX4ccOfs = binUtils.binSearch(outArray, [0x52, 0x49, 0x46, 0x58], 0, 4);
      //if (RIFX4ccOfs===-1) {
      //  printLog("Invalid endianness");
      //  return "!RIFX";
      //}
    }
    pos += 8; //skip another 4 bytes

    const WAVEFourCC = binUtils.binSearch(outArray, [0x52, 0x49, 0x46, 0x46], 0, 4);
    if (WAVEFourCC === false) {
      printLog("[Wav reader] > Not a WAVE file");
      return false;
    }
    //pos += 4;

    //wav file can have massive other metadatas so we search in the whole file and select the first match
    const fmtFourCC = binUtils.binSearch(outArray, [0x66, 0x6d, 0x74, 0x20], 0, outArray.length);
    if (fmtFourCC === false) {
      printLog("[Wav reader] > 'fmt ' not found");
      return false;
    }
    pos = fmtFourCC + 8;

    const formatValue = binUtils.readULEndian(pos, 16, outArray);
    //PCM format is easier to implement than other formats
    if (formatValue === 1 || formatValue === 3 || formatValue === 65534) {
      // 65534 for 24 bit
      pos += 2;
    } else if (formatValue != 1) {
      printLog(
        "[Wav reader] > Invalid audio format. must be PCM(0x01), float(0x03) or extensible PCM(0xFEFF) | offset: " +
          pos +
          " | value: " +
          format
      );
      formatValue = null;
      return false;
    }

    const channelsValue = binUtils.readULEndian(pos, 16, outArray); //-1 for convenient
    if (channelsValue < 1 || channelsValue > 2) {
      printLog(
        "[Wav reader] > Invalid number of channels. must be mono(0x01) or stereo(0x02) | offset: " +
          pos +
          " | value: " +
          channels
      );
      channelsValue = null;
      return false;
    }
    pos += 2;

    const sampleRateValue = binUtils.readULEndian(pos, 32, outArray);
    if (sampleRateValue === -1) {
      printLog("[Wav reader] > Invalid sample rate | offset: " + pos + " | value: " + sampleRateValue);
      sampleRateValue = null;
      return false;
    }
    pos += 10;

    const bitDepthValue = binUtils.readULEndian(pos, 16, outArray);
    if (![16, 24, 32].includes(bitDepthValue)) {
      printLog("[Wav reader] > Unsupported bit depth | offset: " + pos + " | value: " + bitDepthValue);
      bitDepthValue = null;
      return false;
    }
    pos += 24;

    const data = binUtils.binSearch(outArray, [0x64, 0x61, 0x74, 0x61], pos, outArray.length);
    if (data === -1) {
      printLog("[Wav reader] > 'data' not found | offset: " + pos);
      return false;
    }

    printLog("Reading wav header took " + (performance.now() - t0) + "ms");
    return {
      format: formatValue,
      channels: channelsValue,
      sampleRate: sampleRateValue,
      bitDepth: bitDepthValue,
      //go past "data" and trim the header part. outArray now only contain the audio data
      outArray: outArray.subarray(pos + 4, outArray.length),
    };
  }

  function _convertWavData(sampleRateValue, bitDepthValue, formatValue, array, discard) {
    if (!array || sampleRateValue === null || bitDepthValue === null || formatValue === null) return;
    const arrayLength = array.length;

    const bytesPerSample = floor(bitDepthValue / 8);
    const totalSamples = arrayLength / bytesPerSample;
    const numFrames = totalSamples / channels;
    const norm = pow(2, bitDepthValue - 1); //normalization(arbitrary bit depth anyway)

    const leftChannel = new Float32Array(numFrames);
    const rightChannel = new Float32Array(numFrames);

    let ofs = 0;
    if (bitDepthValue === 16) {
      for (let i = 0; i < numFrames; i++) {
        let sample = array[ofs] | (array[ofs + 1] << 8);
        if (sample & 0x8000) sample -= 0x10000;

        leftChannel[i] = sample / norm;

        if (channels === 2) {
          sample = array[ofs + 2] | (array[ofs + 3] << 8);
          if (sample & 0x8000) sample -= 0x10000;

          rightChannel[i] = sample / norm;
        }

        ofs += bytesPerSample * channels;
      }
    } else if (bitDepthValue === 24) {
      for (let i = 0; i < numFrames; i++) {
        // left channel
        let sample = array[ofs + 1] | (array[ofs + 2] << 8) | (array[ofs + 3] << 16);
        if (sample & 0x800000) sample |= 0xff000000;
        leftChannel[i] = sample / norm;

        if (channels === 2) {
          // right channel is 3 bytes after left
          sample = array[ofs + 3] | (array[ofs + 4] << 8) | (array[ofs + 5] << 16);
          if (sample & 0x800000) sample |= 0xff000000;
          rightChannel[i] = sample / norm;
        }

        ofs += bytesPerSample * channels; // move to next frame
      }
    }
    //else if (bitDepthValue === 32 && formatValue === 3) {
    //const dv = new DataView(array, array.byteOffset, array.byteLength);
    //for (let i = 0; i < numFrames; i++) {
    //  const sample = dv.getFloat32(ofs, true);
    //  outArray[i] = sample;
    //  ofs += bytesPerSample * channels;
    //  }
    //}
    else {
      printLog("Unsupported bit depth: " + bitDepth);
      return;
    }

    if (discard === 1) array = []; //save memory

    return {leftChannel, rightChannel};
  }

  return {
    readWavHeader: _readWavHeader,
    convertWavData: _convertWavData,
  };
})();
