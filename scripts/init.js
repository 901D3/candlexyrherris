function gId(i) {
  return document.getElementById(i);
}

function gIdV(i) {
  return document.getElementById(i).value;
}

function qSl(i) {
  return document.querySelector(i);
}

function qSlA(i) {
  return document.querySelectorAll(i);
}

function pFl(i) {
  return parseFloat(i);
}

function pIn(i) {
  return parseInt(i);
}

function lwC(i) {
  return i.toLowerCase();
}

function logVar(variable) {
  let varName = (function () {
    for (const key in window) {
      if (window[key] === variable) return key;
    }
  })();
  console.log(varName + ": ");
  console.log(variable);
}

function defV(v1, v2, vx) {
  //v1 for input value, v2 for default value, vx for returning v2 if v1 = vx
  if (isNaN(vx) || !isFinite(vx)) vx = 1;
  if (Number.isNaN(v1) || !isFinite(v1) || v1 === vx) return v2;
  else return v1;
}

function defVAdv(v1, v2, vmin = 0, vmax = 100, ltvmin = false, gtvmax = false) {
  if (Number.isNaN(v1) || !isFinite(v1)) return v2;
  if (ltvmin && v1 < vmin) return v2;
  if (gtvmax && v1 > vmax) return v2;

  return v1;
}

//Valve's ConVars style

var {
  abs,
  acos,
  acosh,
  asin,
  asinh,
  atan,
  atan2,
  atanh,
  cbrt,
  ceil,
  cos,
  cosh,
  exp,
  floor,
  fround,
  log,
  log10,
  log1p,
  log2,
  max,
  min,
  pow,
  random,
  round,
  sign,
  sin,
  sinh,
  sqrt,
  tan,
  tanh,
  trunc,
  LN10,
  LN2,
  LOG10E,
  LOG2E,
  PI,
  SQRT1_2,
  SQRT2,
} = Math;

var _2PI = PI * 2;

function sinc(x) {
  if (x == 0) return 1;
  const PIx = PI * x;
  return sin(PIx) / PIx;
}

var canvas = gId("canvas");
var ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
var canvasStream = canvas.captureStream();
var canvasWidth = canvas.width;
var canvasHeight = canvas.height;
ctx.fillStyle = "gray";
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

var isProcessing = false;
var desyncOpt = false;
var t = false;
var sqSz;
var audio = gId("audio");
//var audioCtx;
//if (!audioCtx) {
//  try {
//    audioCtx = new AudioContext();
//  } catch (e) {
//    printLog("Error: " + e + "| falled back to window.webkitAudioContext");
//    const AudioContextClass = window.webkitAudioContext;
//    if (AudioContextClass) audioCtx = new AudioContextClass();
//    else printLog("Web Audio API not supported in this browser");
//  }
//}

//var source = audioCtx.createMediaElementSource(audio);
//var analyser;
//var dataArray;
var bytesArray;
var audioDataArray;
var stftRe;
var stftIm;

var format;
var channels;
var sampleRate;
var bitDepth;

var fftSize;
var frameLatency;
var volMultiplier;
var minAmplitude;
var maxAmplitude;
var threshold;
var minFreq;
var maxFreq;

var bars;
var barColorRed;
var barColorGreen;
var barColorBlue;

var barWidth;
var barSpace;

var barStyle = "rect";
var barStyleCapsuleRadius = 0.3;

var recorderFrameRate = 30;
var recorderVideoBitrate = 2000000;
var recorderMimeType = "video/webm";
var recorderVideoCodec = "vp9";
var recorderOption = {
  mimeType: recorderMimeType + ";" + " codecs=" + recorderVideoCodec,
  videoBitsPerSecond: recorderVideoBitrate,
  frameRate: recorderFrameRate,
};

var windowFunc = new Function("n", "N", sinc.toString() + "; return " + gId("windowFuncInput").value + ";");

let logEntries = [];

window.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length === 1 && (e.touches[0].clientX < 50 || e.touches[0].clientX > window.innerWidth - 50)) {
      e.preventDefault();
    }
  },
  {passive: false}
);

function escapeHTML(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function printLog(message) {
  let console = gId("console");
  let maxLogEntries = 500;

  logEntries.push(message);

  if (logEntries.length > maxLogEntries) {
    logEntries.shift();
  }

  let logEntry = document.createElement("span");
  logEntry.innerHTML = message;
  console.appendChild(logEntry);

  if (console.children.length > maxLogEntries) {
    console.removeChild(console.firstChild);
  }

  console.scrollTop = console.scrollHeight;
}

function createInputOmitter(fn, delay = 250) {
  let waiting = false;

  return function (...args) {
    if (waiting) return;

    waiting = true;
    setTimeout(() => {
      fn(...args);
      waiting = false;
    }, delay);
  };
}

function varSync(input, variable, defaultValue) {
  let value = Number(input.value);

  slider.value = defVAdv(value, defaultValue, sliderMin, sliderMax, true, true);
  window[variable] = value;
}

function sliderInputSync(slider, input, variable, defaultValue, source) {
  let value;
  source = source.toLowerCase();

  if (source === "input") {
    value = Number(input.value);
    const sliderMin = Number(slider.min);
    const sliderMax = Number(slider.max);

    if (value >= sliderMin && value <= sliderMax) {
      slider.value = value;
    } else {
      const fixed = defVAdv(value, defaultValue, sliderMin, sliderMax, true, true);
      slider.value = fixed;
    }
  } else if (source === "slider") {
    value = Number(slider.value);
    input.value = value;
  }

  window[variable] = value;
}

function binSearch(array, text, start = 0, end = array.length) {
  if (!array) return -1;
  const arrayLength = array.length;
  end = Math.min(end ?? arrayLength, arrayLength);

  const textLength = text.length;
  const startEndLength = end - start;

  //safety checks
  if (start < 0) {
    console.log(`Start offset out of range [0 - ${arrayLength}]: ${start}`);
    return -1;
  }
  if (end > arrayLength) {
    console.log(`End offset out of range [0 - ${arrayLength}]: ${end}`);
    return -1;
  }
  if (textLength > startEndLength) {
    console.log(`Pattern too long for search range: ${textLength} > ${startEndLength}`);
    return -1;
  }

  //brute force search
  for (let i = start; i <= end - textLength; i++) {
    let ok = true;
    for (let j = 0; j < textLength; j++) {
      if (array[i + j] !== text[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

function createBlobFromElement(el) {
  if (!el) return;

  const blob = new Blob([el.text], {type: "plain/text"});
  const url = URL.createObjectURL(blob);

  return url;
}
