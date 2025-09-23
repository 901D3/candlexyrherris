const d = {
  none: () => {},
  matrixThreshold: bayer,
  arithmetic: arithmetic,
  errDiffs: errDiffs,
};

function process() {
  const t0 = performance.now();
  processFrame();
  if (video.paused || video.ended) return;
  if (t) frameCounter();
  setTimeout(process, max(0, 1000 / frameRate - (performance.now() - t0)));
}

async function render() {
  if (isRecording == true) {
    printLog("Stop recording to start rendering", null, "yellow", "yellow");
    return false;
  }
  if (isRendering == true) {
    printLog("Rendering process has already started", null, "yellow", "yellow");
    return false;
  }
  isRendering = true;
  startRec.setAttribute("disabled", "");
  stopRec.setAttribute("disabled", "");
  pauseRec.setAttribute("disabled", "");
  resumeRec.setAttribute("disabled", "");

  printLog("Starting rendering");
  recorderWebmWriterSettings = new WebMWriter({
    quality: recorderWebmWriterQuality,
    fileWriter: gId("webmWriterFileWriterSelect").value,

    frameRate: recorderFrameRate,
    transparent: false, //enabling transparent is kinda useless
  });

  const totalFrames = ceil(video.duration * recorderFrameRate);
  printLog("Total frames:" + totalFrames);
  let frameIndex = 0;
  let blob;
  video.currentTime = 0;
  video.pause();
  video.muted = true;
  video.loop = false;
  video.controls = false;
  video.classList.add("offscreen_hide");

  function seek(time) {
    return new Promise((resolve) => {
      video.currentTime = time;
      video.addEventListener("seeked", function handler() {
        video.removeEventListener("seeked", handler);
        resolve();
      });
    });
  }

  function canvasToWebPBlob(canvas, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
    });
  }

  const t0 = performance.now();
  while (frameIndex < totalFrames && !video.ended) {
    const frameTime = frameIndex / recorderFrameRate;
    let t1 = performance.now();
    await seek(frameTime);
    t1 = performance.now() - t1;

    let t3 = performance.now();
    blob = await canvasToWebPBlob(canvas, recorderWebmWriterQuality);
    t3 = performance.now() - t3;

    let t4 = performance.now();
    recorderWebmWriterSettings.addFrame(new Uint8Array(await blob.arrayBuffer()), canvasWidth, canvasHeight);
    t4 = performance.now() - t4;

    printLog(
      "Dither: " +
        t1 +
        "ms\n" +
        "Canvas to WebP: " +
        t3 +
        "ms\n" +
        "WebM Writer addFrame: " +
        t4 +
        "ms\n" +
        "Total: " +
        (t1 + t3 + t4) +
        "ms\n" +
        "Rendered: " +
        (frameIndex / totalFrames) * 100 +
        "%",
      1
    );

    if (isRendering == false) {
      printLog("Rendering stopped manually");

      onComplete();
      return true;
    }
    frameIndex++;
  }
  const totalTime = performance.now() - t0;
  printLog(
    "Elapsed: " + totalTime + "ms\n" + "Rendering takes " + (totalTime / (video.duration * 1000)) * 100 + "% of video duration"
  );
  onComplete();

  async function onComplete() {
    isRendering = false;
    video.muted = false;
    video.loop = true;
    video.controls = true;
    video.classList.remove("offscreen_hide");

    await recorderWebmWriterSettings.complete().then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "video.webm";
      a.click();
      URL.revokeObjectURL(url);
      printLog("Rendered video: " + "<a href='" + url + "' target='_blank'>" + url + "</a>", null);

      isRendering = false;
      startRend.removeAttribute("disabled", "");
      stopRend.setAttribute("disabled", "");

      startRec.removeAttribute("disabled");
      stopRec.setAttribute("disabled", "");
      pauseRec.setAttribute("disabled", "");
      resumeRec.setAttribute("disabled", "");
      return true;
    });
  }
}

function processFrame() {
  ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
  const frame = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const imageData = frame.data;
  const imageDataLength = imageData.length;
  if (useLinear) {
    for (let i = 0; i < imageDataLength; i++) {
      imageData[i] = floor(linearLUT[imageData[i]]);
    }
  }
  d[ditherDropdownValue](imageData);

  ctx.putImageData(frame, 0, 0);
}

function frameCounter() {
  frm++;
  let dlT = (performance.now() - lastUpdatedTime) / 1000;
  let currentFps = 1 / dlT;
  lastUpdatedTime = performance.now();
  if (performance.now() - lLT >= 1000) {
    printLog("Fps: " + currentFps.toString().padEnd(22) + " | Latency: " + (dlT * 1000).toString().padEnd(22));
    lLT = performance.now();
  }
}

gId("showTelemetry").addEventListener("change", function (e) {
  t = e.target.checked;
});

video.addEventListener("play", function () {
  frm = 0;
  startTime = performance.now();
  lastUpdatedTime = startTime;
  lLT = startTime;
  process();
});

video.addEventListener("seeking", processFrame);
