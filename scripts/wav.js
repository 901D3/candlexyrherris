function readWavHeader(array) {
  audioDataArray = array;
  let pos = 0;

  //read wav file header
  const RIFF4ccOfs = binSearch(audioDataArray, [0x52, 0x49, 0x46, 0x46], 0, 8);
  if (RIFF4ccOfs == -1) {
    printLog("Not a RIFF file");
    return "!RIFF";
  }
  pos += 8; //skip another 4 bytes
  const WAVE4ccOfs = binSearch(audioDataArray, [0x57, 0x41, 0x56, 0x45], pos, pos + 4);
  if (WAVE4ccOfs == -1) {
    printLog("Not a WAVE file");
    return "!WAVE";
  }
  pos += 4;
  const fmt4ccOfs = binSearch(audioDataArray, [0x66, 0x6d, 0x74, 0x20], 0, audioDataArray.length);
  //wav file can have massive other metadatas so we search in the whole file
  if (fmt4ccOfs == -1) {
    printLog("'fmt ' not found");
    return "!'fmt '";
  }
  pos = fmt4ccOfs + 8;
  format = binUtils.readULEndian(pos, 16, audioDataArray);
  //PCM format is easier to implement than other formats
  if (format != 1) {
    printLog("Invalid audio format. must be PCM(0x01) | offset: " + pos + " | value: " + format);
    format = null;
    return;
  }
  printLog("Format: " + format);
  pos += 2;
  channels = binUtils.readULEndian(pos, 16, audioDataArray);
  //if its stereo we will use left channel only for now
  if (channels < 1 || channels > 2) {
    printLog("Invalid number of channels. must be mono(0x01) or stereo(0x02) | offset: " + pos + " | value: " + channels);
    channels = null;
    return;
  }
  printLog("Number of channels: " + channels);
  pos += 2;
  sampleRate = binUtils.readULEndian(pos, 32, audioDataArray);
  if (sampleRate != 44100 && sampleRate != 48000) {
    printLog("non-44100hz sample rate is yet to be supported | offset: " + pos + " | value: " + sampleRate);
    sampleRate = null;
    return;
  }
  printLog("Sample rate: " + sampleRate);
  pos += 10;
  bitDepth = binUtils.readULEndian(pos, 16, audioDataArray);
  if (bitDepth != 16) {
    printLog("non-16 bits is yet to be supported | offset: " + pos + " | value: " + bitDepth);
    bitDepth = null;
    return;
  }
  printLog("Bit depth: " + bitDepth);
  pos += 6;
  //go past "data" and trim the header part. audioDataArray now only contain the audio datas
  audioDataArray = audioDataArray.slice(pos, audioDataArray.length);
  displayInfo();
}

function convertWavData(sampleRateValue, bitDepthValue, formatValue, array) {
  if (!array || sampleRateValue == null || bitDepthValue == null || formatValue == null) return;
  const arrayLength = array.length;

  const bytesPerSample = floor(bitDepthValue / 8);
  const totalSamples = arrayLength / bytesPerSample;
  const numFrames = totalSamples / channels;

  convertedAudioDataArray = new Float32Array(numFrames);

  let ofs = 0;
  for (let i = 0; i < numFrames; i++) {
    let sample = 0;

    for (let b = 0; b < bytesPerSample; b++) {
      sample |= array[ofs + b] << (8 * b);
      if (sample & 0x8000) sample -= 0x10000;
    }
    convertedAudioDataArray[i] = -sample / 32768;

    ofs += bytesPerSample * channels;
  }
}
