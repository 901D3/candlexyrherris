var chunks = [];

var mediaRecorder = new MediaRecorder(canvasStream);

var startRec = gId("startRecording");
var stopRec = gId("stopRecording");
var pauseRec = gId("pauseRecording");
var resumeRec = gId("resumeRecording");
var startRend = gId("startRendering");
var stopRend = gId("stopRendering");

function startRecording() {
  mediaRecorder = new MediaRecorder(canvasStream, {
    mimeType: recorderMimeType + ";" + " codecs=" + recorderVideoCodec,
    videoBitsPerSecond: recorderVideoBitrate,
    frameRate: recorderFrameRate,
  });

  const allowedMimes = ["video/webm", "video/mp4", "video/matroska", "video/quicktime", "video/x-m4v", "video/mp2t"];
  const allowedMimesLength = allowedMimes.length;
  let isValidMime = false;

  for (let i = 0; i < allowedMimesLength; i++) {
    if (recorderMimeType === allowedMimes[i]) {
      isValidMime = true;
      break;
    }
  }

  if (!isValidMime) {
    printLog("Invalid MIME type");
    return false;
  }

  mediaRecorder.ondataavailable = (e) => {
    chunks.push(e.data);
    printLog("chunks pushed");
  };

  mediaRecorder.onstop = () => {
    let recorderVideoFileExt = "webm";

    const mime = recorderMimeType.trim().toLowerCase();

    if (mime === "video/webm") {
      recorderVideoFileExt = "webm";
    } else if (mime === "video/mp4") {
      recorderVideoFileExt = "mp4";
    } else if (mime === "video/x-matroska") {
      recorderVideoFileExt = "mkv";
    } else if (mime === "video/quicktime") {
      recorderVideoFileExt = "mov";
    } else if (mime === "video/x-m4v") {
      recorderVideoFileExt = "m4v";
    } else if (mime === "video/ogg") {
      recorderVideoFileExt = "ogv";
    } else if (mime === "video/mp2t") {
      recorderVideoFileExt = "ts";
    } else {
      console.log("Invalid MIME type:", recorderMimeType);
      return false;
    }

    const blob = new Blob(chunks);
    const recordedVideoUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.download = (gId("recorderFileName").value || "video") + "." + recorderVideoFileExt;
    downloadLink.href = recordedVideoUrl;
    downloadLink.click();
    printLog("Download link: " + downloadLink);
  };

  const mimeTypeString = recorderMimeType + ";" + " codecs=" + recorderVideoCodec;
  const isTypeSupportedMimeType = MediaRecorder.isTypeSupported(mimeTypeString);
  printLog("mimeType: " + mimeTypeString);
  printLog("videoBitsPerSecond: " + recorderVideoBitrate);
  printLog("frameRate: " + recorderFrameRate);
  printLog("isTypeSupported: " + isTypeSupportedMimeType);

  chunks = [];
  mediaRecorder.start();
  printLog("MediaRecorder started");
  isRecording = true;
  //sessionStorage.setItem("isRecording", "1");

  startRec.setAttribute("disabled", "");
  stopRec.removeAttribute("disabled");
  pauseRec.removeAttribute("disabled");
  resumeRec.setAttribute("disabled", "");
  startRend.setAttribute("disabled", "");

  gId("recorderMimeTypeInput").setAttribute("disabled", "");
  gId("recorderCodecInput").setAttribute("disabled", "");
  gId("recorderFrameRateRange").setAttribute("disabled", "");
  gId("recorderFrameRateInput").setAttribute("disabled", "");
  gId("recorderVideoBitrateRange").setAttribute("disabled", "");
  gId("recorderVideoBitrateInput").setAttribute("disabled", "");
}

function stopRecording() {
  mediaRecorder.stop();
  printLog("MediaRecorder stopped");
  isRecording = false;
  //sessionStorage.removeItem("isRecording");

  startRec.removeAttribute("disabled");
  stopRec.setAttribute("disabled", "");
  pauseRec.setAttribute("disabled", "");
  resumeRec.setAttribute("disabled", "");
  startRend.removeAttribute("disabled", "");

  gId("recorderMimeTypeInput").removeAttribute("disabled", "");
  gId("recorderCodecInput").removeAttribute("disabled", "");
  gId("recorderFrameRateRange").removeAttribute("disabled", "");
  gId("recorderFrameRateInput").removeAttribute("disabled", "");
  gId("recorderVideoBitrateRange").removeAttribute("disabled", "");
  gId("recorderVideoBitrateInput").removeAttribute("disabled", "");
}

function pauseRecording() {
  mediaRecorder.pause();

  startRec.setAttribute("disabled", "");
  stopRec.removeAttribute("disabled");
  pauseRec.setAttribute("disabled", "");
  resumeRec.removeAttribute("disabled");
}

function resumeRecording() {
  mediaRecorder.resume();

  startRec.setAttribute("disabled", "");
  stopRec.removeAttribute("disabled");
  pauseRec.removeAttribute("disabled");
  resumeRec.setAttribute("disabled", "");
}

function startRendering() {
  render();

  startRend.setAttribute("disabled", "");
  stopRend.removeAttribute("disabled", "");

  startRec.setAttribute("disabled", "");
  stopRec.setAttribute("disabled", "");
  pauseRec.setAttribute("disabled", "");
  resumeRec.setAttribute("disabled", "");
}

function stopRendering() {
  isRendering = false;
  startRend.removeAttribute("disabled", "");
  stopRend.setAttribute("disabled", "");

  startRec.removeAttribute("disabled");
  stopRec.setAttribute("disabled", "");
  pauseRec.setAttribute("disabled", "");
  resumeRec.setAttribute("disabled", "");
}

(function () {
  startRec.addEventListener("click", startRecording);
  stopRec.addEventListener("click", stopRecording);
  pauseRec.addEventListener("click", pauseRecording);
  resumeRec.addEventListener("click", resumeRecording);
  startRend.addEventListener("click", startRendering);
  stopRend.addEventListener("click", stopRendering);

  gId("recorderMimeTypeInput").addEventListener("input", function () {
    recorderMimeType = gId("recorderMimeTypeInput").value.trim().toLowerCase();
    recorderOption = {
      mimeType: recorderMimeType + ";" + " codecs=" + recorderVideoCodec,
      videoBitsPerSecond: recorderVideoBitrate,
      frameRate: recorderFrameRate,
    };
  });

  gId("recorderCodecInput").addEventListener("input", function () {
    recorderVideoCodec = gId("recorderCodecInput").value.trim().toLowerCase();
    recorderOption = {
      mimeType: recorderMimeType + ";" + " codecs=" + recorderVideoCodec,
      videoBitsPerSecond: recorderVideoBitrate,
      frameRate: recorderFrameRate,
    };
  });

  gId("recorderFrameRateRange").addEventListener("input", function () {
    sliderInputSync(gId("recorderFrameRateRange"), gId("recorderFrameRateInput"), "recorderFrameRate", undefined, "slider");
    canvasStream = canvas.captureStream(recorderFrameRate);
    recorderOption = {
      mimeType: recorderMimeType + ";" + " codecs=" + recorderVideoCodec,
      videoBitsPerSecond: recorderVideoBitrate,
      frameRate: recorderFrameRate,
    };
  });

  gId("recorderFrameRateInput").addEventListener("input", function () {
    sliderInputSync(gId("recorderFrameRateRange"), gId("recorderFrameRateInput"), "recorderFrameRate", 30, "input");
    canvasStream = canvas.captureStream(recorderFrameRate);
    recorderOption = {
      mimeType: recorderMimeType + ";" + " codecs=" + recorderVideoCodec,
      videoBitsPerSecond: recorderVideoBitrate,
      frameRate: recorderFrameRate,
    };
  });

  gId("recorderVideoBitrateRange").addEventListener("input", function () {
    sliderInputSync(
      gId("recorderVideoBitrateRange"),
      gId("recorderVideoBitrateInput"),
      "recorderVideoBitrate",
      undefined,
      "slider"
    );
    canvasStream = canvas.captureStream(recorderFrameRate);
    recorderOption = {
      mimeType: recorderMimeType + ";" + " codecs=" + recorderVideoCodec,
      videoBitsPerSecond: recorderVideoBitrate,
      frameRate: recorderFrameRate,
    };
  });

  gId("recorderVideoBitrateInput").addEventListener("input", function () {
    sliderInputSync(gId("recorderVideoBitrateRange"), gId("recorderVideoBitrateInput"), "recorderVideoBitrate", 30, "input");
    canvasStream = canvas.captureStream(recorderFrameRate);
  });

  gId("recorderWebmWriterQualityRange").addEventListener("input", function () {
    sliderInputSync(
      gId("recorderWebmWriterQualityRange"),
      gId("recorderWebmWriterQualityInput"),
      "recorderWebmWriterQuality",
      undefined,
      "slider"
    );
  });

  gId("recorderWebmWriterQualityInput").addEventListener("input", function () {
    sliderInputSync(
      gId("recorderWebmWriterQualityRange"),
      gId("recorderWebmWriterQualityInput"),
      "recorderWebmWriterQuality",
      0.9,
      "input"
    );
  });

  //stop recording and download the video when user reload
  window.addEventListener("load", () => {
    const nav = performance.getEntriesByType("navigation")[0];
    const reloaded = nav && nav.type === "reload";

    if (reloaded && sessionStorage.getItem("isRendering") === "1") {
      stopRecording();
      sessionStorage.removeItem("isRendering");
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (sessionStorage.getItem("isRendering") === "1") {
      e.preventDefault();
      e.returnValue = "Leaving or reloading this page will discard recording. Do you want to proceed?";
      stopRecording();
      sessionStorage.removeItem("isRendering");
    }
  });

  window.addEventListener("keydown", (e) => {
    if (
      sessionStorage.getItem("isRendering") === "1" &&
      (e.key === "F5" || (e.ctrlKey && e.key === "r") || (e.ctrlKey && e.key === "w"))
    ) {
      stopRecording();
      sessionStorage.removeItem("isRendering");
    }
  });

  recorderMimeType = gId("recorderMimeTypeInput").value.trim().toLowerCase();
  recorderVideoCodec = gId("recorderCodecInput").value.trim().toLowerCase();
  sliderInputSync(gId("recorderFrameRateRange"), gId("recorderFrameRateInput"), "recorderFrameRate", 30, "input");
  canvasStream = canvas.captureStream(recorderFrameRate);
  recorderOption = {
    mimeType: recorderMimeType + ";" + " codecs=" + recorderVideoCodec,
    videoBitsPerSecond: recorderVideoBitrate,
    frameRate: recorderFrameRate,
  };
  sliderInputSync(
    gId("recorderWebmWriterQualityRange"),
    gId("recorderWebmWriterQualityInput"),
    "recorderWebmWriterQuality",
    0.9,
    "input"
  );
})();
