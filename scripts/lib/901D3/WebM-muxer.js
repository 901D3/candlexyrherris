/**
 * A simple and lightweight WebM muxer
 * Uses VP8 WebP images to mux into video
 *
 * https://github.com/901D3/WebM-muxer.js
 *
 * Copyright (c) 901D3
 * This project/code is licensed with MIT license
 */

"use strict";

class WebMMuxer {
  #width;
  #height;
  #frameRate;
  #bufferSize;

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
   * bufferSize is number of frames that when clusterFrameCount exceeds bufferSize's value,
   * the muxer will write a new cluster(keyframe). default to 300 if bufferSize is null
   *
   * You can use a custom muxingApp or writingApp. default to "WebM Muxer" if
   * muxingApp or writingApp is null
   */

  constructor(initSettings) {
    this.#width = initSettings.width;
    this.#height = initSettings.height;
    this.#frameRate = initSettings.frameRate;
    this.#bufferSize = initSettings.bufferSize ?? 300;

    this.#muxingApp = initSettings.muxingApp ?? "WebM Muxer";
    this.#writingApp = initSettings.writingApp ?? "WebM Muxer";
  }

  #stringToUTF8(input) {
    return new TextEncoder().encode(input);
  }

  #toFloat64Buffer(value) {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setFloat64(0, value, false);
    return new Uint8Array(buffer);
  }

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
    // Gets patched when calling finalize()
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
    // "V_VP8"
    const CodecID = this.#stringToUTF8("V_VP8");
    temp.push(this.#arrayConcat(Uint8Array.of(0x86), this.#toVINT(CodecID.length), CodecID));

    // CodecName
    // "VP8"
    const CodecName = this.#stringToUTF8("VP8");
    temp.push(this.#arrayConcat(Uint8Array.of(0x25, 0x86, 0x88), this.#toVINT(CodecName.length), CodecName));

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

  /**
   *
   * @param {*} timecodeMs
   * @param {*} array
   */

  makeClusterStart(timecodeMs, array) {
    const timecodeElement = Uint8Array.of(0xe7, 0x82, (timecodeMs >> 8) & 0xff, timecodeMs & 0xff);
    // push all accumulated SimpleBlocks
    const clusterBody = this.#arrayConcat(timecodeElement, ...this.#blockChunks);

    const clusterSize = this.#toVINT(clusterBody.length);
    const clusterHeader = this.#arrayConcat(Uint8Array.of(0x1f, 0x43, 0xb6, 0x75), clusterSize, clusterBody);
    array.push(clusterHeader);
  }

  /**
   *
   * @param {*} frame
   * @param {*} relativeTime
   * @param {*} keyframe
   * @param {*} array
   */

  makeSimpleBlock(frame, relativeTime, keyframe, array) {
    const temp = [];

    temp.push(Uint8Array.of(0xa3));

    const trackNumber = Uint8Array.of(0x81); // track 1
    const timecode = Uint8Array.of((relativeTime >> 8) & 0xff, relativeTime & 0xff);
    const flags = Uint8Array.of(keyframe ? 0x80 : 0x00);

    const simpleBlockBody = this.#arrayConcat(trackNumber, timecode, flags, frame);
    const size = this.#toVINT(simpleBlockBody.length);

    temp.push(size);
    temp.push(simpleBlockBody);

    const block = this.#arrayConcat(...temp);
    array.push(block);
    this.#blockChunks.push(block);
  }

  /**
   *
   * @param {*} frame - Input WebP data, with header. **usually comes from toBlob()**
   * @param {*} array - Destination array to write
   */

  addFrameFromBlob(frame, array) {
    const timestampMs = Math.round(this.#frameCount * (1000 / this.#frameRate));

    let cursor = -1;
    for (let i = 0; i < 36; i++) {
      if (frame[i] === 0x56 && frame[i + 1] === 0x50 && frame[i + 2] === 0x38) {
        cursor = i;
        break;
      }
    }

    if (cursor == -1) throw new Error("'VP8' not found in WebP frame");

    if (this.#frameCount === 0 || this.#clusterFrameCount >= this.#bufferSize) {
      this.#clusterFrameCount = 0;
      this.#blockChunks = [];
      this.#clusterTimeCode = timestampMs;
      this.makeClusterStart(this.#clusterTimeCode, array);
    }

    const keyframe = this.#clusterFrameCount === 0;
    this.makeSimpleBlock(frame, timestampMs - this.#clusterTimeCode, keyframe, array);

    this.#frameCount++;
    this.#clusterFrameCount++;
  }

  /**
   *
   * @param {*} frame - Input WebP data, no header. **usually comes from WebCodecs**
   * @param {*} array - Destination array to write
   */

  addFramePreEncoded(frame, array) {
    const timestampMs = Math.round(this.#frameCount * (1000 / this.#frameRate));

    // Make a new cluster if buffer exceeded or first frame
    if (this.#frameCount === 0 || this.#clusterFrameCount >= this.#bufferSize) {
      this.#clusterFrameCount = 0;
      this.#blockChunks = [];
      this.#clusterTimeCode = timestampMs;
      this.makeClusterStart(this.#clusterTimeCode, array);
    }

    // First frame of the cluster must be a keyframe
    const keyframe = this.#clusterFrameCount === 0;

    this.makeSimpleBlock(frame, timestampMs - this.#clusterTimeCode, keyframe, array);

    this.#frameCount++;
    this.#clusterFrameCount++;
  }

  /**
   *
   * @param {*} array - Input array for finalizing
   * The array usually contains the added frames from
   * addFrameFromBlob or addFramePreEncoded
   *
   * @returns {Blob}
   */

  finalize(array) {
    if (this.#blockChunks.length) {
      this.makeClusterStart(this.#clusterTimeCode, array);
      this.#blockChunks = [];
    }

    const dataOnly = this.#arrayConcat(...array);

    // Only write headers after finish adding frame so we can calculate SegmentDuration
    const header = [];
    this.writeHeader(header);
    const fullHeader = this.#arrayConcat(...header);

    const final = this.#arrayConcat(fullHeader, dataOnly);
    return new Blob([final]);
  }
}
