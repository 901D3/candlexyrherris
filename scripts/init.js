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

var {floor, ceil, round, trunc, sign, abs, exp, log, log2, log10, pow, random, min, max, sqrt, sin, cos, tan, PI} = Math;
var _2PI = PI * 2;

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
var bytesArray;
var audioDataArray;
var convertedAudioDataArray;
var dataArray;
var stftRe;
var stftIm;

var format;
var channels;
var sampleRate;
var bitDepth;

var fftSize = 2048;
var frameRate = 30;
var frameLatency = 1000 / frameRate;
var volMultiplier = 1;
var minAmplitude = 1;
var maxAmplitude = 255;
var threshold = 0;
var minFreq = 20;
var maxFreq = 4000;

var bars = 100;
var barColorRed = 255;
var barColorGreen = 255;
var barColorBlue = 255;
var barStyle = "rect";
var barWidth = 2.78;
var barSpace = 2;

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
  let urlRegex = /https?:\/\/[^\s]+/g;
  let codeRegex = /`([^`]+)`/g;

  let messageWithLinks = escapeHTML(message).replace(urlRegex, function (url) {
    return `<a href="${url}" target="_blank">${url}</a>`;
  });

  messageWithLinks = messageWithLinks.replace(codeRegex, function (_, code) {
    return `<code style="background:#eee;padding:2px 4px;border-radius:4px;font-family:monospace">${code}</code>`;
  });

  urlRegex = /blob?:[^\s]+/g;

  messageWithLinks = escapeHTML(message).replace(urlRegex, function (url) {
    return `<a href="${url}" target="_blank">${url}</a>`;
  });

  messageWithLinks = messageWithLinks.replace(codeRegex, function (_, code) {
    return `<code style="background:#eee;padding:2px 4px;border-radius:4px;font-family:monospace">${code}</code>`;
  });

  logEntries.push(messageWithLinks);

  if (logEntries.length > maxLogEntries) {
    logEntries.shift();
  }

  let logEntry = document.createElement("div");
  logEntry.innerHTML = messageWithLinks + "<br>";
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

//connect sliders, inputs and vars, returna default value to slider if input is out of slider's range
gId("fftSizeRange").addEventListener("input", function () {
  sliderInputSync(gId("fftSizeRange"), gId("fftSizeInput"), "fftSize", 2048, "slider");
  displayInfo();
});

gId("fftSizeInput").addEventListener("input", function () {
  sliderInputSync(gId("fftSizeRange"), gId("fftSizeInput"), "fftSize", 2048, "input");
  displayInfo();
});

gId("frameRateRange").addEventListener("input", function () {
  sliderInputSync(gId("frameRateRange"), gId("frameRateInput"), "frameRate", 30, "slider");
  frameLatency = 1000 / frameRate;
  canvasStream = canvas.captureStream(frameRate);
});

gId("frameRateInput").addEventListener("input", function () {
  sliderInputSync(gId("frameRateRange"), gId("frameRateInput"), "frameRate", 30, "input");
  frameLatency = 1000 / frameRate;
  canvasStream = canvas.captureStream(frameRate);
});

gId("volumeMultiplierRange").addEventListener("input", function () {
  sliderInputSync(gId("volumeMultiplierRange"), gId("volumeMultiplierInput"), "volMultiplier", 1, "slider");
});

gId("volumeMultiplierInput").addEventListener("input", function () {
  sliderInputSync(gId("volumeMultiplierRange"), gId("volumeMultiplierInput"), "volMultiplier", 1, "input");
});

gId("minAmplitudeRange").addEventListener("input", function () {
  sliderInputSync(gId("minAmplitudeRange"), gId("minAmplitudeInput"), "minAmplitude", 1, "slider");
});

gId("minAmplitudeInput").addEventListener("input", function () {
  sliderInputSync(gId("minAmplitudeRange"), gId("minAmplitudeInput"), "minAmplitude", 1, "input");
});

gId("maxAmplitudeRange").addEventListener("input", function () {
  sliderInputSync(gId("maxAmplitudeRange"), gId("maxAmplitudeInput"), "maxAmplitude", 1, "slider");
});

gId("maxAmplitudeInput").addEventListener("input", function () {
  sliderInputSync(gId("maxAmplitudeRange"), gId("maxAmplitudeInput"), "maxAmplitude", 1, "input");
});

gId("thresholdRange").addEventListener("input", function () {
  sliderInputSync(gId("thresholdRange"), gId("thresholdInput"), "threshold", 1, "slider");
});

gId("thresholdInput").addEventListener("input", function () {
  sliderInputSync(gId("thresholdRange"), gId("thresholdInput"), "threshold", 1, "input");
});

gId("minFrequencyRange").addEventListener("input", function () {
  sliderInputSync(gId("minFrequencyRange"), gId("minFrequencyInput"), "minFreq", 0, "slider");
  displayInfo();
});

gId("minFrequencyInput").addEventListener("input", function () {
  sliderInputSync(gId("minFrequencyRange"), gId("minFrequencyInput"), "minFreq", 0, "input");
  displayInfo();
});

gId("maxFrequencyRange").addEventListener("input", function () {
  sliderInputSync(gId("maxFrequencyRange"), gId("maxFrequencyInput"), "maxFreq", 1, "slider");
  displayInfo();
});

gId("maxFrequencyInput").addEventListener("input", function () {
  sliderInputSync(gId("maxFrequencyRange"), gId("maxFrequencyInput"), "maxFreq", 1, "input");
  displayInfo();
});

gId("barStyle").addEventListener("change", function () {
  barStyle = gId("barStyle").value;
});

gId("barsRange").addEventListener("input", function () {
  sliderInputSync(gId("barsRange"), gId("barsInput"), "bars", 100, "slider");
  displayInfo();
});

gId("barsInput").addEventListener("input", function () {
  sliderInputSync(gId("barsRange"), gId("barsInput"), "bars", 100, "input");
  displayInfo();
});

gId("barWidthRange").addEventListener("input", function () {
  sliderInputSync(gId("barWidthRange"), gId("barWidthInput"), "barWidth", 255, "slider");
});

gId("barWidthInput").addEventListener("input", function () {
  sliderInputSync(gId("barWidthRange"), gId("barWidthInput"), "barWidth", 255, "input");
});

gId("barSpaceRange").addEventListener("input", function () {
  sliderInputSync(gId("barSpaceRange"), gId("barSpaceInput"), "barSpace", 255, "slider");
});

gId("barSpaceInput").addEventListener("input", function () {
  sliderInputSync(gId("barSpaceRange"), gId("barSpaceInput"), "barSpace", 255, "input");
});

gId("barColorRedRange").addEventListener("input", function () {
  sliderInputSync(gId("barColorRedRange"), gId("barColorRedInput"), "barColorRed", 255, "slider");
});

gId("barColorRedInput").addEventListener("input", function () {
  sliderInputSync(gId("barColorRedRange"), gId("barColorRedInput"), "barColorRed", 255, "input");
});

gId("barColorGreenRange").addEventListener("input", function () {
  sliderInputSync(gId("barColorGreenRange"), gId("barColorGreenInput"), "barColorGreen", 255, "slider");
});

gId("barColorGreenInput").addEventListener("input", function () {
  sliderInputSync(gId("barColorGreenRange"), gId("barColorGreenInput"), "barColorGreen", 255, "input");
});

gId("barColorBlueRange").addEventListener("input", function () {
  sliderInputSync(gId("barColorBlueRange"), gId("barColorBlueInput"), "barColorBlue", 255, "slider");
});

gId("barColorBlueInput").addEventListener("input", function () {
  sliderInputSync(gId("barColorBlueRange"), gId("barColorBlueInput"), "barColorBlue", 255, "input");
});

(function () {
  //init all vars based on input value
  sliderInputSync(gId("fftSizeRange"), gId("fftSizeInput"), "fftSize", 2048, "input");
  sliderInputSync(gId("frameRateRange"), gId("frameRateInput"), "frameRate", 30, "input");
  sliderInputSync(gId("volumeMultiplierRange"), gId("volumeMultiplierInput"), "volMultiplier", 1, "input");
  sliderInputSync(gId("minAmplitudeRange"), gId("minAmplitudeInput"), "minAmplitude", 1, "input");
  sliderInputSync(gId("maxAmplitudeRange"), gId("maxAmplitudeInput"), "maxAmplitude", 1, "input");
  sliderInputSync(gId("thresholdRange"), gId("thresholdInput"), "threshold", 1, "input");
  sliderInputSync(gId("minFrequencyRange"), gId("minFrequencyInput"), "minFreq", 0, "input");
  sliderInputSync(gId("maxFrequencyRange"), gId("maxFrequencyInput"), "maxFreq", 1, "input");
  sliderInputSync(gId("barsRange"), gId("barsInput"), "bars", 100, "input");
  sliderInputSync(gId("barWidthRange"), gId("barWidthInput"), "barWidth", 255, "input");
  sliderInputSync(gId("barSpaceRange"), gId("barSpaceInput"), "barSpace", 255, "input");
  sliderInputSync(gId("barColorRedRange"), gId("barColorRedInput"), "barColorRed", 255, "input");
  sliderInputSync(gId("barColorGreenRange"), gId("barColorGreenInput"), "barColorGreen", 255, "input");
  sliderInputSync(gId("barColorBlueRange"), gId("barColorBlueInput"), "barColorBlue", 255, "input");
  frameLatency = 1000 / frameRate;
  canvasStream = canvas.captureStream(frameRate);
})();
