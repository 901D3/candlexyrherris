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

function sinc(x) {
  if (x == 0) return 1;
  const PIx = PI * x;
  return sin(PIx) / PIx;
}

var canvas = gId("canvas");
var ctx = canvas.getContext("2d", {
  alpha: false,
  colorSpace: "srgb",
  colorType: "float16",
  desynchronized: false,
});
ctx.imageSmoothingEnabled = false;
var canvasStream = canvas.captureStream();
var canvasWidth = canvas.width;
var canvasHeight = canvas.height;
ctx.fillStyle = "gray";
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

var isProcessing = false;
var desyncOpt = false;
var t = false;
var audio = gId("audio");
var video = document.createElement("video");
video.muted = true;
video.preload = "auto";
video.playsInline = true;
video.autoPlay = true;
video.controls = false;
video.crossOrigin = "";
var image = new Image();
image.crossOrigin = "";

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

var bytesArray;
var leftChannelArray;
var rightChannelArray;
var stftRe;
var stftIm;

var format;
var channels;
var sampleRate;
var bitDepth;
var channelIndex = 0;

var fftSize;
var frameRate;
var frameTime; // Optimization
var frameLatency;
var preVolMultiply;
var postVolMultiply;
var minAmplitude;
var maxAmplitude;
var amplitudeOffset;
var threshold;
var minBin;
var maxBin = Infinity;
var realShift;
var imagShift;
var interleaveEffect = false;
var conjugateInterleaveEffect = false;
var interleaveEffectFix = false;
var ignoreDC = 1;

var bars;
var barColorRed;
var barColorGreen;
var barColorBlue;
var backgroundColorRed;
var backgroundColorGreen;
var backgroundColorBlue;

var barWidth;
var barSpace;

var binValuePicking = "first";

var barStyle = "rect";
var barStyleCapsuleRadius = 0.5;
var barStyleTriangCapsuleHeight = 0.5;
var backgroundStyle = "solidColor";
var barOutline = false;
var barAmplitudeRounding = false;
var barWidthRounding = false;
var barPosX = 0.5;
var barPosY = 0.5;

var recorderFrameRate = 30;
var recorderFrameTime = 1000 / recorderFrameRate; // Optimization
var recorderVideoBitrate = 20000000;
var recorderMimeType = "video/webm";
var recorderVideoCodec = "vp9";
var blobQuality = 0.75;
var isRecording = false;
var isRendering = false;
var pausedRendering = false;
var resolvePromise = null;
var streamlinedRenderOption = false;

var windowFunc = new Function("n", "N", "v", sinc.toString() + "; return " + gId("windowFuncInput").value + ";");

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

function printLog(message, logToConsole, color, flag) {
  let consoleEl = gId("console");
  let maxLogEntries = 500;

  logEntries.push(message);

  if (logEntries.length > maxLogEntries) {
    logEntries.shift();
  }

  let logEntry = document.createElement("span");
  logEntry.innerHTML = message;
  logEntry.style.color = color;
  consoleEl.appendChild(logEntry);
  if (flag === "red") redFlashChangeText(logEntry, 200);
  if (flag === "orange") orangeFlashChangeText(logEntry, 200);
  if (flag === "yellow") yellowFlashChangeText(logEntry, 200);
  if (flag === "grey") greyFlashChangeText(logEntry, 200);

  if (consoleEl.children.length > maxLogEntries) {
    consoleEl.removeChild(consoleEl.firstChild);
  }

  consoleEl.scrollTop = consoleEl.scrollHeight;

  if (logToConsole === 1) {
    console.log(message);
  }
}

function createInputOmitter(fn, delay = 250) {
  let waiting = false;

  return function (...args) {
    if (waiting) return false;

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

// binSearch moved to binUtils.js

function createBlobFromElement(el) {
  if (!el) return false;

  const blob = new Blob([el.text], {type: "plain/text"});
  const url = URL.createObjectURL(blob);

  return url;
}

function flashChanges(el, fades, time, ...fadeColors) {
  if (!el) return false;

  for (let i = 0; i < fades; i++) {
    setTimeout(() => {
      const stepColor = fadeColors[i % fadeColors.length];
      el.style.backgroundColor = stepColor;
    }, i * time);
  }
}

function redFlashChangeText(el, time) {
  if (!el) return false;

  flashChanges(el, 4, time, "rgba(255, 0, 0, 1)", "rgba(255, 0, 0, 0.6)", "rgba(255, 0, 0, 0.3)", "rgba(255, 0, 0, 0.0)");
}

function orangeFlashChangeText(el, time) {
  if (!el) return false;

  flashChanges(el, 4, time, "rgba(255, 127, 0, 1)", "rgba(255, 127, 0, 0.6)", "rgba(255, 127, 0, 0.3)", "rgba(255, 127, 0, 0)");
}

function yellowFlashChangeText(el, time) {
  if (!el) return false;

  flashChanges(
    el,
    4,
    time,
    "rgba(255, 255, 0, 1)",
    "rgba(255, 255, 0, 0.6)",
    "rgba(255, 255, 0, 0.3)",
    "rgba(255, 255, 0, 0.0)"
  );
}

function greyFlashChangeText(el, time) {
  if (!el) return false;

  flashChanges(
    el,
    4,
    time,
    "rgba(127, 127, 127, 1)",
    "rgba(127, 127, 127, 0.6)",
    "rgba(127, 127, 127, 0.3)",
    "rgba(127, 127, 127, 0)"
  );
}

function hexToStr(bytes) {
  let str = "";
  const bytesLength = bytes.length;
  for (let i = 0; i < bytesLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

function strToU8(str) {
  const u8 = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    u8[i] = str.charCodeAt(i) & 0xff;
  }
  return u8;
}

function waitForResolve() {
  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
}

function waitForEvent(target, eventName) {
  return new Promise((resolve) => {
    const handler = () => {
      target.removeEventListener(eventName, handler);
      resolve();
    };
    target.addEventListener(eventName, handler);
  });
}
