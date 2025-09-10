//Turn into library so it can be used by anyone and not tied to this project

function readWavHeader(inArray, outArray) {
  outArray = inArray;
  let pos = 0;

  //read wav file header
  const RIFF4ccOfs = binSearch(outArray, [0x52, 0x49, 0x46, 0x46], 0, 4);
  if (RIFF4ccOfs == -1) {
    printLog("Invalid endianness");
    return "!RIFX";
    //will support big endian in the future
    //const RIFX4ccOfs = binSearch(outArray, [0x52, 0x49, 0x46, 0x58], 0, 4);
    //if (RIFX4ccOfs == -1) {
    //  printLog("Invalid endianness");
    //  return "!RIFX";
    //}
  }
  pos += 8; //skip another 4 bytes
  const WAVE4ccOfs = binSearch(outArray, [0x57, 0x41, 0x56, 0x45], pos, pos + 4);
  if (WAVE4ccOfs == -1) {
    printLog("Not a WAVE file");
    return "!WAVE";
  }
  pos += 4;
  //wav file can have massive other metadatas so we search in the whole file and select the first match
  const fmt4ccOfs = binSearch(outArray, [0x66, 0x6d, 0x74, 0x20], 0, outArray.length);
  if (fmt4ccOfs == -1) {
    printLog("'fmt ' not found");
    return "!'fmt '";
  }
  pos = fmt4ccOfs + 8;
  format = binUtils.readULEndian(pos, 16, outArray);
  //PCM format is easier to implement than other formats
  if (format == 1 || format == 3 || format == 65534) {
    // 65534 for 24 bit
    pos += 2;
  } else if (format != 1) {
    printLog(
      "Invalid audio format. must be PCM(0x01), float(0x03) or extensible PCM(0xFEFF) | offset: " + pos + " | value: " + format
    );
    format = null;
    return;
  }
  channels = binUtils.readULEndian(pos, 16, outArray);
  if (channels < 1 || channels > 2) {
    printLog("Invalid number of channels. must be mono(0x01) or stereo(0x02) | offset: " + pos + " | value: " + channels);
    channels = null;
    return;
  }
  pos += 2;
  sampleRate = binUtils.readULEndian(pos, 32, outArray);
  if (sampleRate == -1) {
    printLog("Invalid sample rate | offset: " + pos + " | value: " + sampleRate);
    sampleRate = null;
    return;
  }
  pos += 10;
  bitDepth = binUtils.readULEndian(pos, 16, outArray);
  if (![16, 24, 32].includes(bitDepth)) {
    printLog("Unsupported bit depth | offset: " + pos + " | value: " + bitDepth);
    bitDepth = null;
    return;
  }
  pos += 24;
  const data = binSearch(outArray, [0x64, 0x61, 0x74, 0x61], pos, outArray.length);
  if (data == -1) {
    printLog("'data' not found | offset: " + pos + " | value: " + bitDepth);
    return;
  }
  //go past "data" and trim the header part. outArray now only contain the audio data
  return outArray.slice(pos + 4, outArray.length);
}

function convertWavData(sampleRateValue, bitDepthValue, formatValue, array, outArray, discard) {
  if (!array || sampleRateValue == null || bitDepthValue == null || formatValue == null) return;
  const arrayLength = array.length;

  const bytesPerSample = floor(bitDepthValue / 8);
  const totalSamples = arrayLength / bytesPerSample;
  const numFrames = totalSamples / channels;
  const norm = pow(2, bitDepthValue - 1); //normalization(arbitrary bit depth anyway)

  outArray = new Float32Array(numFrames);

  let ofs = 0;
  if (bitDepthValue == 16) {
    for (let i = 0; i < numFrames; i++) {
      let sample = array[ofs] | (array[ofs + 1] << 8);
      if (sample & 0x8000) sample -= 0x10000;
      outArray[i] = sample / norm;
      ofs += bytesPerSample * channels;
    }
  } else if (bitDepthValue == 24) {
    for (let i = 0; i < numFrames; i++) {
      let sample = array[ofs] | (array[ofs + 1] << 8) | (array[ofs + 2] << 16);
      if (sample & 0x800000) sample |= 0xff000000;
      outArray[i] = sample / norm;
      ofs += bytesPerSample * channels;
    }
  }
  //else if (bitDepthValue == 32 && formatValue == 3) {
  //const dv = new DataView(array, array.byteOffset, array.byteLength);
  //for (let i = 0; i < numFrames; i++) {
  //  const sample = dv.getFloat32(ofs, true);
  //  outArray[i] = sample;
  //  ofs += bytesPerSample * channels;
  //  }
  //}
  else {
    printLog("Unsupported bit depth");
    return;
  }

  if (discard == 1) array = []; //save memory

  return outArray;
}
