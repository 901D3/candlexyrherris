/**
 * A simple and lightweight WebM muxer
 * Uses VP8 WebP images or VP9 frames to mux into video
 * v0.3.3
 *
 * https://github.com/901D3/WebM-muxer.js
 *
 * Copyright (c) 901D3
 * This project/code is licensed with MIT license
 */

"use strict";

const WebMMuxer = (function () {
  let codec;
  let width;
  let height;
  let frameRate;
  let bufferSize;

  let profile;
  let level;
  let bitDepth;
  let chromaSubsampling;
  let colorRange;
  let colorPrimaries;
  let transferCharacteristics;

  let muxingApp;
  let writingApp;

  let frameCount = 0;
  let clusterFrameCount = 0;
  let clusterTimeCode = 0;

  let blockChunks = [];

  /**
   *
   * @param {*} initSettings
   *
   * For VP8, you can use both addFrameFromBlob or addFramePreEncoded(WebCodecs only)
   * For VP9, addFramePreEncoded is the only choice
   *
   * bufferSize is number of frames that when clusterFrameCount exceeds bufferSize's value,
   * the muxer will write a new cluster(keyframe). default to 300 if bufferSize is null
   *
   * You can use a custom muxingApp or writingApp. default to "WebM Muxer" if
   * muxingApp or writingApp is null
   */

  const _init = (initSettings) => {
    if (!["vp8", "vp9"].includes(initSettings.codec)) throw new Error("Codec not supported: " + initSettings.codec);

    codec = initSettings.codec;

    width = initSettings.width;
    height = initSettings.height;
    frameRate = initSettings.frameRate;
    bufferSize = initSettings.bufferSize ?? 300;

    profile = initSettings.profile ?? 0;
    level = initSettings.level ?? 0xff;
    bitDepth = initSettings.bitDepth ?? 8;
    chromaSubsampling = initSettings.chromaSubsampling ?? 1;
    colorRange = initSettings.colorRange ?? 1;
    colorPrimaries = initSettings.colorPrimaries ?? 1;
    transferCharacteristics = initSettings.transferCharacteristics ?? 1;

    muxingApp = initSettings.muxingApp ?? "WebM-muxer.js";
    writingApp = initSettings.writingApp ?? "WebM-muxer.js";
  };

  /**
   *
   * @param {*} input
   * @returns
   */

  const stringToUTF8 = (input) => {
    return new TextEncoder().encode(input);
  };

  /**
   *
   * @param {*} value
   * @returns
   */

  const toFloat64Buffer = (value) => {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setFloat64(0, value, false);
    return new Uint8Array(buffer);
  };

  /**
   *
   * @param {*} value
   * @returns
   */

  const toVINT = (value) => {
    if (value < 0) throw new Error("VINT cannot be negative");

    let length = 1;
    while (length <= 8) {
      const maxValue = (1n << BigInt(7 * length)) - 1n;
      if (BigInt(value) <= maxValue) break;
      length++;
    }

    if (length > 8) throw new Error("Value too large for 8-byte VINT");

    const out = new Uint8Array(length);
    for (let i = length - 1; i >= 0; i--) {
      out[i] = Number(BigInt(value) & 0xffn);
      value >>= 8;
    }

    out[0] |= 1 << (8 - length);
    return out;
  };

  /**
   *
   * @param  {...any} arrays
   * @returns
   */

  const arrayConcat = (...arrays) => {
    const total = arrays.reduce((sum, a) => sum + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
      out.set(arr, offset);
      offset += arr.length;
    }
    return out;
  };

  /**
   * Extract frame data from VP8 frames, ignoring VP8L and VP8X as both are not supported by WebM
   *
   * @param {*} webpData
   * @returns {array}
   */

  const extractVP8Frame = (webpData) => {
    if (webpData[0] !== 0x52 && webpData[1] !== 0x49 && webpData[2] !== 0x46 && webpData[3] !== 0x46) {
      throw new Error("Not a RIFF WebP file");
    }

    for (let offset = 12, length = webpData.length - 8; offset < length; offset++) {
      const chunkId = String.fromCharCode(...webpData.subarray(offset, offset + 4));
      const chunkSize = new DataView(webpData.buffer, webpData.byteOffset + offset + 4, 4).getUint32(0, true);
      const chunkStart = offset + 8;

      if (chunkId === "VP8 ") return webpData.subarray(chunkStart, chunkStart + chunkSize);
      else if (chunkId === "VP8L") throw new Error("Lossless VP8 is not supported: " + chunkId);
    }

    throw new Error("VP8 chunk not found in WebP data");
  };

  /**
   *
   * @param {*} array
   */

  const _makeEBMLHeader = (array) => {
    const temp = [];

    temp.push(Uint8Array.of(0x42, 0x86, 0x81, 0x01)); // EBMLVersion
    temp.push(Uint8Array.of(0x42, 0xf7, 0x81, 0x01)); // EBMLReadVersion
    temp.push(Uint8Array.of(0x42, 0xf2, 0x81, 0x04)); // EBMLMaxIDLength
    temp.push(Uint8Array.of(0x42, 0xf3, 0x81, 0x08)); // EBMLMaxSizeLength

    const doctype = stringToUTF8("webm");
    temp.push(arrayConcat(Uint8Array.of(0x42, 0x82), toVINT(doctype.length), doctype));

    const ebmlHeaderBody = arrayConcat(...temp);
    const ebmlHeader = arrayConcat(Uint8Array.of(0x1a, 0x45, 0xdf, 0xa3), toVINT(ebmlHeaderBody.length), ebmlHeaderBody);
    array.push(ebmlHeader);
  };

  /**
   *
   * @param {*} array
   */

  const _makeSegmentInfo = (array) => {
    const temp = [];

    // TimecodeScale
    // 1ms
    temp.push(arrayConcat(Uint8Array.of(0x2a, 0xd7, 0xb1), toVINT(4), Uint8Array.of(0x00, 0x0f, 0x42, 0x40)));

    // MuxingApp
    const muxingAppUTF8 = stringToUTF8(muxingApp);
    temp.push(arrayConcat(Uint8Array.of(0x4d, 0x80), toVINT(muxingAppUTF8.length), muxingAppUTF8));

    // WritingApp
    const writingAppUTF8 = stringToUTF8(writingApp);
    temp.push(arrayConcat(Uint8Array.of(0x57, 0x41), toVINT(writingAppUTF8.length), writingAppUTF8));

    // SegmentDuration
    const durationSec = toFloat64Buffer(frameCount / frameRate);
    temp.push(arrayConcat(Uint8Array.of(0x44, 0x89), toVINT(durationSec.length), durationSec));

    const segmentInfoBody = arrayConcat(...temp);
    const segmentInfo = arrayConcat(Uint8Array.of(0x15, 0x49, 0xa9, 0x66), toVINT(segmentInfoBody.length), segmentInfoBody);
    array.push(segmentInfo);
  };

  /**
   *
   * @param {*} array
   */

  const _makeStartSegment = (array) => {
    const segmentHeader = arrayConcat(
      Uint8Array.of(0x18, 0x53, 0x80, 0x67),
      Uint8Array.of(0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)
    );
    array.push(segmentHeader);
  };

  /**
   *
   * @param {*} array
   */

  const _makeTrackEntry = (array) => {
    const temp = [];

    // TrackNumber
    temp.push(Uint8Array.of(0xd7, 0x81, 0x01));

    // TrackUID
    temp.push(Uint8Array.of(0x73, 0xc5, 0x81, 0x01));

    // FlagLacing
    temp.push(Uint8Array.of(0x9c, 0x81, 0x00));

    // Language
    const language = stringToUTF8("und");
    temp.push(arrayConcat(Uint8Array.of(0x22, 0xb5, 0x9c), toVINT(language.length), stringToUTF8("und")));

    // CodecID
    const CodecID = stringToUTF8("V_" + codec.toUpperCase());
    temp.push(arrayConcat(Uint8Array.of(0x86), toVINT(CodecID.length), CodecID));

    // CodecName
    // "VP8"
    const CodecName = stringToUTF8(codec.toUpperCase());
    temp.push(arrayConcat(Uint8Array.of(0x25, 0x86, 0x88), toVINT(CodecName.length), CodecName));

    if (codec === "vp9") {
      // VP9 CodecPrivate
      const codecPrivate = Uint8Array.of(
        profile,
        level,
        bitDepth,
        chromaSubsampling,
        colorRange,
        colorPrimaries,
        transferCharacteristics
      );
      temp.push(arrayConcat(Uint8Array.of(0x63, 0xa2), toVINT(codecPrivate.length), codecPrivate));
    }

    // TrackType
    // video
    temp.push(Uint8Array.of(0x83, 0x81, 0x01));

    // PixelWidth
    const pixelWidth = arrayConcat(Uint8Array.of(0xb0), toVINT(2), Uint8Array.of(width >> 8, width & 0xff));

    // PixelHeight
    const pixelHeight = arrayConcat(Uint8Array.of(0xba), toVINT(2), Uint8Array.of(height >> 8, height & 0xff));

    const videoElementBody = arrayConcat(pixelWidth, pixelHeight);
    const videoElement = arrayConcat(Uint8Array.of(0xe0), toVINT(videoElementBody.length), videoElementBody);

    temp.push(videoElement);

    const trackEntryBody = arrayConcat(...temp);
    const trackEntry = arrayConcat(Uint8Array.of(0xae), toVINT(trackEntryBody.length), trackEntryBody);

    const tracks = arrayConcat(Uint8Array.of(0x16, 0x54, 0xae, 0x6b), toVINT(trackEntry.length), trackEntry);

    array.push(tracks);
  };

  /**
   *
   * @param {*} timecodeMs
   * @param {*} array
   */

  const _makeClusterStart = (timecodeMs, array) => {
    // 4 bytes
    const timecodeElement = arrayConcat(
      Uint8Array.of(0xe7),
      toVINT(4),
      Uint8Array.of((timecodeMs >> 24) & 0xff, (timecodeMs >> 16) & 0xff, (timecodeMs >> 8) & 0xff, timecodeMs & 0xff)
    );

    // All appended SimpleBlock is saved to blockChunks so we will take blockChunks and concatenate it with cluster header
    const clusterBody = arrayConcat(timecodeElement, ...blockChunks);

    const clusterHeader = arrayConcat(Uint8Array.of(0x1f, 0x43, 0xb6, 0x75), toVINT(clusterBody.length), clusterBody);

    array.push(clusterHeader);

    // Flush the old one
    blockChunks = [];
    clusterFrameCount = 0;
  };

  /**
   *
   * @param {*} frame
   * @param {*} relativeTime
   * @param {*} keyframe
   */

  const _makeSimpleBlock = (frame, relativeTime, keyframe) => {
    const temp = [];

    temp.push(Uint8Array.of(0xa3));

    const trackNumber = Uint8Array.of(0x81);
    const timecode = Uint8Array.of((relativeTime >> 8) & 0xff, relativeTime & 0xff);
    const flags = Uint8Array.of((keyframe ? 0x80 : 0x00) | 0x00);

    const simpleBlockBody = arrayConcat(trackNumber, timecode, flags, frame);
    const size = toVINT(simpleBlockBody.length);

    temp.push(size);
    temp.push(simpleBlockBody);

    blockChunks.push(arrayConcat(...temp));

    frameCount++;
    clusterFrameCount++;
  };

  /**
   * A wrapper for writing header to the destination array
   *
   * @param {*} array
   *
   */

  const _writeHeader = (array) => {
    _makeEBMLHeader(array);
    _makeStartSegment(array);
    _makeSegmentInfo(array);
    _makeTrackEntry(array);
  };

  const _newCluster = (array) => {
    const timestampMs = (frameCount * 1000) / frameRate;

    _makeClusterStart(clusterTimeCode, array);
    clusterTimeCode = Math.round(timestampMs);
  };

  /**
   *
   * @param {*} frame - Input WebP data, with header. **usually comes from toBlob()**
   * @param {*} array - Destination array to write
   */

  const _addFrameFromBlob = (frame, array) => {
    const timestampMs = (frameCount * 1000) / frameRate;

    if (clusterFrameCount >= bufferSize) {
      _makeClusterStart(clusterTimeCode, array);
      clusterTimeCode = Math.round(timestampMs);
    }

    // Calculate relativeTime after update clusterTimeCode
    const relativeTime = Math.round(timestampMs - clusterTimeCode);
    const keyframe = clusterFrameCount === 0;

    const vp8Data = extractVP8Frame(frame);
    _makeSimpleBlock(vp8Data, relativeTime, keyframe);
  };

  /**
   *
   * @param {*} frame - Input WebP data, with header. **usually comes from toBlob()**
   */

  const _addFrameFromBlobKeyFrame = (frame) => {
    const timestampMs = (frameCount * 1000) / frameRate;
    const relativeTime = Math.round(timestampMs - clusterTimeCode);

    const vp8Data = extractVP8Frame(frame);
    _makeSimpleBlock(vp8Data, relativeTime, true);
  };

  /**
   *
   * @param {*} frame - Input WebP data, with header. **usually comes from toBlob()**
   */

  const _addFrameFromBlobInterFrame = (frame) => {
    const timestampMs = (frameCount * 1000) / frameRate;
    const relativeTime = Math.round(timestampMs - clusterTimeCode);

    const vp8Data = extractVP8Frame(frame);
    _makeSimpleBlock(vp8Data, relativeTime, false);
  };

  /**
   *
   * @param {*} frame - Input WebP data, no header. **usually comes from WebCodecs**
   * @param {*} array - Destination array to write
   */

  const _addFramePreEncoded = (frame, array) => {
    const timestampMs = (frameCount * 1000) / frameRate;

    if (clusterFrameCount >= bufferSize) {
      _makeClusterStart(clusterTimeCode, array);
      clusterTimeCode = Math.round(timestampMs);
    }

    // Calculate relativeTime after update clusterTimeCode
    const relativeTime = Math.round(timestampMs - clusterTimeCode);
    const keyframe = clusterFrameCount === 0;

    _makeSimpleBlock(frame, relativeTime, keyframe);
  };

  /**
   *
   * @param {*} frame - Input WebP data, no header. **usually comes from WebCodecs**
   */

  const _addFramePreEncodedKeyFrame = (frame) => {
    const timestampMs = (frameCount * 1000) / frameRate;
    const relativeTime = Math.round(timestampMs - clusterTimeCode);

    _makeSimpleBlock(frame, relativeTime, true);
  };

  /**
   *
   * @param {*} frame - Input WebP data, no header. **usually comes from WebCodecs**
   */

  const _addFramePreEncodedInterFrame = (frame) => {
    const timestampMs = (frameCount * 1000) / frameRate;
    const relativeTime = Math.round(timestampMs - clusterTimeCode);

    _makeSimpleBlock(frame, relativeTime, false);
  };

  /**
   *
   * @param {*} array - Input array for finalizing
   * The array usually contains the added frames from
   * addFrameFromBlob or addFramePreEncoded
   *
   * @returns {Blob}
   */

  const _finalize = (array) => {
    if (blockChunks.length) _makeClusterStart(clusterTimeCode, array);

    // Only write headers after finish adding frame so we can calculate SegmentDuration
    const header = [];
    _writeHeader(header);

    // Blob() already handles the array concatenation
    return new Blob([...header, ...array]);
  };

  return {
    init: _init,
    makeStartSegment: _makeStartSegment,
    makeTrackEntry: _makeTrackEntry,
    makeClusterStart: _makeClusterStart,
    makeSimpleBlock: _makeSimpleBlock,
    writeHeader: _writeHeader,
    newCluster: _newCluster,
    addFrameFromBlob: _addFrameFromBlob,
    addFrameFromBlobKeyFrame: _addFrameFromBlobKeyFrame,
    addFrameFromBlobInterFrame: _addFrameFromBlobInterFrame,
    addFramePreEncoded: _addFramePreEncoded,
    addFramePreEncodedKeyFrame: _addFramePreEncodedKeyFrame,
    addFramePreEncodedInterFrame: _addFramePreEncodedInterFrame,
    finalize: _finalize,
  };
})();
