var audioBufferDecode = (function () {
  async function _decode(array) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(array.buffer);

    return {
      channels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
      leftChannel: audioBuffer.getChannelData(0),
      rightChannel: audioBuffer.numberOfChannels === 2 ? audioBuffer.getChannelData(1) : null,
    };
  }

  return {
    decode: _decode,
  };
})();
