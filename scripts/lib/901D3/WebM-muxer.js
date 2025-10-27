/**
 * A simple and lightweight WebM muxer
 * Uses VP8 WebP images or VP9 frames to mux into video
 * v0.3.11
 *
 * https://github.com/901D3/WebM-muxer.js
 *
 * Copyright (c) 901D3
 * This project/code is licensed with MIT license
 */

"use strict";

class WebMMuxer {
  #codec;
  #width;
  #height;
  #frameRate;
  #bufferSize;

  #profile;
  #level;
  #bitDepth;
  #chromaSubsampling;
  #colorRange;
  #colorPrimaries;
  #transferCharacteristics;

  #muxingApp;
  #writingApp;

  #frameCount = 0;
  #clusterFrameCount = 0;
  #clusterTimeCode = 0;

  #blockChunks = [];

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

  constructor(initSettings) {
    if (!["vp8", "vp9"].includes(initSettings.codec)) throw new Error("Codec not supported: " + initSettings.codec);

    this.#codec = initSettings.codec;

    this.#width = initSettings.width;
    this.#height = initSettings.height;
    this.#frameRate = initSettings.frameRate;
    this.#bufferSize = initSettings.bufferSize ?? 300;

    this.#profile = initSettings.profile ?? 0;
    this.#level = initSettings.level ?? 0xff;
    this.#bitDepth = initSettings.bitDepth ?? 8;
    this.#chromaSubsampling = initSettings.chromaSubsampling ?? 1;
    this.#colorRange = initSettings.colorRange ?? 1;
    this.#colorPrimaries = initSettings.colorPrimaries ?? 1;
    this.#transferCharacteristics = initSettings.transferCharacteristics ?? 1;

    this.#muxingApp = initSettings.muxingApp ?? "WebM-muxer.js";
    this.#writingApp = initSettings.writingApp ?? "WebM-muxer.js";
  }

  /**
   *
   * @param {*} input
   * @returns
   */

  #stringToUTF8(input) {
    return new TextEncoder().encode(input);
  }

  /**
   *
   * @param {*} value
   * @returns
   */

  #toFloat64Buffer(value) {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setFloat64(0, value, false);
    return new Uint8Array(buffer);
  }

  /**
   *
   * @param {*} value
   * @returns
   */

  #toVINT(value) {
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
  }

  /**
   *
   * @param  {...any} arrays
   * @returns
   */

  #arrayConcat(...arrays) {
    const total = arrays.reduce((sum, a) => sum + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
      out.set(arr, offset);
      offset += arr.length;
    }
    return out;
  }

  /**
   * Extract frame data from VP8 frames, ignoring VP8L and VP8X as both are not supported by WebM
   *
   * @param {*} webpData
   * @returns {array}
   */

  #extractVP8Frame(webpData) {
    if (String.fromCharCode(...webpData.subarray(0, 4)) !== "RIFF") {
      throw new Error("Not a RIFF WebP file");
    }

    let offset = 12;
    while (offset < webpData.length - 8) {
      const chunkId = String.fromCharCode(...webpData.subarray(offset, offset + 4));
      const chunkSize = new DataView(webpData.buffer, webpData.byteOffset + offset + 4, 4).getUint32(0, true);
      const chunkStart = offset + 8;

      if (chunkId === "VP8 ") return webpData.subarray(chunkStart, chunkStart + chunkSize);
      else if (chunkId === "VP8L") {
        throw new Error("Lossless VP8 is not supported: " + chunkId);
      } else if (chunkId === "VP8X") {
        throw new Error("Extended VP8 is not supported: " + chunkId);
      }

      offset += 8 + chunkSize + (chunkSize & 1);
    }

    throw new Error("VP8 chunk not found in WebP data");
  }

  /**
   *
   * @param {*} array
   */

  makeEBMLHeader(array) {
    const temp = [];

    temp.push(Uint8Array.of(0x42, 0x86, 0x81, 0x01)); // EBMLVersion
    temp.push(Uint8Array.of(0x42, 0xf7, 0x81, 0x01)); // EBMLReadVersion
    temp.push(Uint8Array.of(0x42, 0xf2, 0x81, 0x04)); // EBMLMaxIDLength
    temp.push(Uint8Array.of(0x42, 0xf3, 0x81, 0x08)); // EBMLMaxSizeLength

    const doctype = this.#stringToUTF8("webm");
    temp.push(this.#arrayConcat(Uint8Array.of(0x42, 0x82), this.#toVINT(doctype.length), doctype));

    const ebmlHeaderBody = this.#arrayConcat(...temp);
    const ebmlHeader = this.#arrayConcat(
      Uint8Array.of(0x1a, 0x45, 0xdf, 0xa3),
      this.#toVINT(ebmlHeaderBody.length),
      ebmlHeaderBody
    );
    array.push(ebmlHeader);
  }

  /**
   *
   * @param {*} array
   */

  makeSegmentInfo(array) {
    const temp = [];

    // TimecodeScale
    // 1ms
    temp.push(this.#arrayConcat(Uint8Array.of(0x2a, 0xd7, 0xb1), this.#toVINT(4), Uint8Array.of(0x00, 0x0f, 0x42, 0x40)));

    // MuxingApp
    const muxingApp = this.#stringToUTF8(this.#muxingApp);
    temp.push(this.#arrayConcat(Uint8Array.of(0x4d, 0x80), this.#toVINT(muxingApp.length), muxingApp));

    // WritingApp
    const writingApp = this.#stringToUTF8(this.#writingApp);
    temp.push(this.#arrayConcat(Uint8Array.of(0x57, 0x41), this.#toVINT(writingApp.length), writingApp));

    // SegmentDuration
    const durationSec = this.#toFloat64Buffer(this.#frameCount / this.#frameRate);
    temp.push(this.#arrayConcat(Uint8Array.of(0x44, 0x89), this.#toVINT(durationSec.length), durationSec));

    const segmentInfoBody = this.#arrayConcat(...temp);
    const segmentInfo = this.#arrayConcat(
      Uint8Array.of(0x15, 0x49, 0xa9, 0x66),
      this.#toVINT(segmentInfoBody.length),
      segmentInfoBody
    );
    array.push(segmentInfo);
  }

  /**
   *
   * @param {*} array
   */

  makeStartSegment(array) {
    const segmentHeader = this.#arrayConcat(
      Uint8Array.of(0x18, 0x53, 0x80, 0x67),
      Uint8Array.of(0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)
    );
    array.push(segmentHeader);
  }

  /**
   *
   * @param {*} array
   */

  makeTrackEntry(array) {
    const temp = [];

    // TrackNumber
    temp.push(Uint8Array.of(0xd7, 0x81, 0x01));

    // TrackUID
    temp.push(Uint8Array.of(0x73, 0xc5, 0x81, 0x01));

    // FlagLacing
    temp.push(Uint8Array.of(0x9c, 0x81, 0x00));

    // Language
    const language = this.#stringToUTF8("und");
    temp.push(this.#arrayConcat(Uint8Array.of(0x22, 0xb5, 0x9c), this.#toVINT(language.length), this.#stringToUTF8("und")));

    // CodecID
    const CodecID = this.#stringToUTF8("V_" + this.#codec.toUpperCase());
    temp.push(this.#arrayConcat(Uint8Array.of(0x86), this.#toVINT(CodecID.length), CodecID));

    // CodecName
    // "VP8"
    const CodecName = this.#stringToUTF8(this.#codec.toUpperCase());
    temp.push(this.#arrayConcat(Uint8Array.of(0x25, 0x86, 0x88), this.#toVINT(CodecName.length), CodecName));

    if (this.#codec === "vp9") {
      // VP9 CodecPrivate
      const codecPrivate = Uint8Array.of(
        this.#profile,
        this.#level,
        this.#bitDepth,
        this.#chromaSubsampling,
        this.#colorRange,
        this.#colorPrimaries,
        this.#transferCharacteristics
      );
      temp.push(this.#arrayConcat(Uint8Array.of(0x63, 0xa2), this.#toVINT(codecPrivate.length), codecPrivate));
    }

    // TrackType
    // video
    temp.push(Uint8Array.of(0x83, 0x81, 0x01));

    // PixelWidth
    const pixelWidth = this.#arrayConcat(
      Uint8Array.of(0xb0),
      this.#toVINT(2),
      Uint8Array.of(this.#width >> 8, this.#width & 0xff)
    );

    // PixelHeight
    const pixelHeight = this.#arrayConcat(
      Uint8Array.of(0xba),
      this.#toVINT(2),
      Uint8Array.of(this.#height >> 8, this.#height & 0xff)
    );

    const videoElementBody = this.#arrayConcat(pixelWidth, pixelHeight);
    const videoElement = this.#arrayConcat(Uint8Array.of(0xe0), this.#toVINT(videoElementBody.length), videoElementBody);

    temp.push(videoElement);

    const trackEntryBody = this.#arrayConcat(...temp);
    const trackEntry = this.#arrayConcat(Uint8Array.of(0xae), this.#toVINT(trackEntryBody.length), trackEntryBody);

    const tracks = this.#arrayConcat(Uint8Array.of(0x16, 0x54, 0xae, 0x6b), this.#toVINT(trackEntry.length), trackEntry);

    array.push(tracks);
  }

  /**
   *
   * @param {*} timecodeMs
   * @param {*} array
   */

  makeClusterStart(timecodeMs, array) {
    // 4 bytes
    const timecodeElement = this.#arrayConcat(
      Uint8Array.of(0xe7),
      this.#toVINT(4),
      Uint8Array.of((timecodeMs >> 24) & 0xff, (timecodeMs >> 16) & 0xff, (timecodeMs >> 8) & 0xff, timecodeMs & 0xff)
    );

    // All appended SimpleBlock is saved to this.#blockChunks so we will take this.#blockChunks and concatenate it with cluster header
    const clusterBody = this.#arrayConcat(timecodeElement, ...this.#blockChunks);

    const clusterHeader = this.#arrayConcat(
      Uint8Array.of(0x1f, 0x43, 0xb6, 0x75),
      this.#toVINT(clusterBody.length),
      clusterBody
    );

    array.push(clusterHeader);

    // Flush the old one
    this.#blockChunks = [];
    this.#clusterFrameCount = 0;
  }

  /**
   *
   * @param {*} frame
   * @param {*} relativeTime
   * @param {*} keyframe
   */

  makeSimpleBlock(frame, relativeTime, keyframe) {
    const temp = [];

    temp.push(Uint8Array.of(0xa3));

    const trackNumber = Uint8Array.of(0x81);
    const timecode = Uint8Array.of((relativeTime >> 8) & 0xff, relativeTime & 0xff);
    const flags = Uint8Array.of((keyframe ? 0x80 : 0x00) | 0x00);

    const simpleBlockBody = this.#arrayConcat(trackNumber, timecode, flags, frame);
    const size = this.#toVINT(simpleBlockBody.length);

    temp.push(size);
    temp.push(simpleBlockBody);

    this.#blockChunks.push(this.#arrayConcat(...temp));

    this.#frameCount++;
    this.#clusterFrameCount++;
  }

  /**
   * A wrapper for writing header to the destination array
   *
   * @param {*} array
   *
   */

  writeHeader(array) {
    this.makeEBMLHeader(array);
    this.makeStartSegment(array);
    this.makeSegmentInfo(array);
    this.makeTrackEntry(array);
  }

  newCluster(array) {
    const timestampMs = (this.#frameCount * 1000) / this.#frameRate;

    this.makeClusterStart(this.#clusterTimeCode, array);
    this.#clusterTimeCode = Math.round(timestampMs);
  }

  /**
   *
   * @param {*} frame - Input WebP data, with header. **usually comes from toBlob()**
   * @param {*} array - Destination array to write
   */

  addFrameFromBlob(frame, array) {
    const timestampMs = (this.#frameCount * 1000) / this.#frameRate;

    if (this.#clusterFrameCount >= this.#bufferSize) {
      this.makeClusterStart(this.#clusterTimeCode, array);
      this.#clusterTimeCode = Math.round(timestampMs);
    }

    // Calculate relativeTime after update this.#clusterTimeCode
    const relativeTime = Math.round(timestampMs - this.#clusterTimeCode);
    const keyframe = this.#clusterFrameCount === 0;

    const vp8Data = this.#extractVP8Frame(frame);
    this.makeSimpleBlock(vp8Data, relativeTime, keyframe);
  }

  /**
   *
   * @param {*} frame - Input WebP data, with header. **usually comes from toBlob()**
   */

  addFrameFromBlobKeyFrame(frame) {
    const timestampMs = (this.#frameCount * 1000) / this.#frameRate;
    const relativeTime = Math.round(timestampMs - this.#clusterTimeCode);

    const vp8Data = this.#extractVP8Frame(frame);
    this.makeSimpleBlock(vp8Data, relativeTime, true);
  }

  /**
   *
   * @param {*} frame - Input WebP data, with header. **usually comes from toBlob()**
   */

  addFrameFromBlobInterFrame(frame) {
    const timestampMs = (this.#frameCount * 1000) / this.#frameRate;
    const relativeTime = Math.round(timestampMs - this.#clusterTimeCode);

    const vp8Data = this.#extractVP8Frame(frame);
    this.makeSimpleBlock(vp8Data, relativeTime, false);
  }

  /**
   *
   * @param {*} frame - Input WebP data, no header. **usually comes from WebCodecs**
   * @param {*} array - Destination array to write
   */

  addFramePreEncoded(frame, array) {
    const timestampMs = (this.#frameCount * 1000) / this.#frameRate;

    if (this.#clusterFrameCount >= this.#bufferSize) {
      this.makeClusterStart(this.#clusterTimeCode, array);
      this.#clusterTimeCode = Math.round(timestampMs);
    }

    // Calculate relativeTime after update this.#clusterTimeCode
    const relativeTime = Math.round(timestampMs - this.#clusterTimeCode);
    const keyframe = this.#clusterFrameCount === 0;

    this.makeSimpleBlock(frame, relativeTime, keyframe);
  }

  /**
   *
   * @param {*} frame - Input WebP data, no header. **usually comes from WebCodecs**
   */

  addFramePreEncodedKeyFrame(frame) {
    const timestampMs = (this.#frameCount * 1000) / this.#frameRate;
    const relativeTime = Math.round(timestampMs - this.#clusterTimeCode);

    this.makeSimpleBlock(frame, relativeTime, true);
  }

  /**
   *
   * @param {*} frame - Input WebP data, no header. **usually comes from WebCodecs**
   */

  addFramePreEncodedInterFrame(frame) {
    const timestampMs = (this.#frameCount * 1000) / this.#frameRate;
    const relativeTime = Math.round(timestampMs - this.#clusterTimeCode);

    this.makeSimpleBlock(frame, relativeTime, false);
  }

  // Updated
  /**
   *
   * @param {*} array - Input array for finalizing
   * The array usually contains the added frames from
   * addFrameFromBlob or addFramePreEncoded
   *
   * @returns {Blob}
   */

  finalize(array) {
    if (this.#blockChunks.length) this.makeClusterStart(this.#clusterTimeCode, array);

    // Only write headers after finish adding frame so we can calculate SegmentDuration
    const header = [];
    this.writeHeader(header);

    // Blob() already handles the array concatenation
    return new Blob([...header, ...array]);
  }
}
