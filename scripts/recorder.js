var chunks = [];

const option = {
  mimeType: "video/webm; codecs=vp9", //see freevideodither.glitch.com/avc1_options.txt for custom avc1 options
  videoBitsPerSecond: 5000000, //media recorder bitrate
  frameRate: frameRate,
};

const mediaRecorder = new MediaRecorder(canvasStream, option);

mediaRecorder.ondataavailable = (e) => {
  chunks.push(e.data);
  printLog("chunks pushed");
};

var startRec = gId("startRecording");
var stopRec = gId("stopRecording");
var pauseRec = gId("pauseRecording");
var resumeRec = gId("resumeRecording");

mediaRecorder.onstop = () => {
  const blob = new Blob(chunks);
  const recordedVideoUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.download = "video.webm";
  downloadLink.href = recordedVideoUrl;
  downloadLink.click();
  printLog(`Download link: ${downloadLink}`);
};

function startRecording() {
  chunks = [];
  mediaRecorder.start();
  printLog("MediaRecorder started");
  startRec.setAttribute("disabled", "");
  stopRec.removeAttribute("disabled");
  pauseRec.removeAttribute("disabled");
  resumeRec.setAttribute("disabled", "");
}

function stopRecording() {
  mediaRecorder.stop();
  chunks = [];
  startRec.removeAttribute("disabled");
  stopRec.setAttribute("disabled", "");
  pauseRec.setAttribute("disabled", "");
  resumeRec.setAttribute("disabled", "");
}

function pauseRecording() {
  mediaRecorder.pause();
  printLog("MediaRecorder stopped");
  startRec.setAttribute("disabled", "");
  stopRec.removeAttribute("disabled");
  pauseRec.setAttribute("disabled", "");
  resumeRec.removeAttribute("disabled");
  printLog("MediaRecorder paused");
}

function resumeRecording() {
  mediaRecorder.resume();
  printLog("MediaRecorder resumed");
  startRec.setAttribute("disabled", "");
  stopRec.removeAttribute("disabled");
  pauseRec.removeAttribute("disabled");
  resumeRec.setAttribute("disabled", "");
}

startRec.addEventListener("click", startRecording);
stopRec.addEventListener("click", stopRecording);
pauseRec.addEventListener("click", pauseRecording);
resumeRec.addEventListener("click", resumeRecording);
