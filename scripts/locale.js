var locales = {
  none: "None",
  elN_A: "Your browser does not support this element",
  title: "Candlexyrherris",
  subtitle: "A web-based reimplementation of Sonic Candle with enhanced stuff.",

  upload: "Upload file",
  paste_link: "Paste link",
  recorder: "Recorder",

  start: "Start",
  stop: "Stop",
  pause: "Pause",
  resume: "Resume",
  update: "Update",
  play_pause: "Play/Pause",

  width: "Width",
  height: "Height",
  volume: "Volume",
  reconnect: "Reconnect",
  refresh: "Refresh",
  space: "Space",
  number: "Number",
  threshold: "Threshold",
  variables: "Variables",

  audio_settings_title: "Audio",
  visualizer_settings_title: "Visualizer",
  fft_size: "FFT Size",
  frame_rate: "Frame Rate",
  vol_multiplier: "Volume Multiplier",

  min_amplitude: "Min Amplitude",
  max_amplitude: "Max Amplitude",

  min_frequency: "Min Frequency",
  max_frequency: "Max Frequency",

  bar_style: "Bar Style",
  bar_color_red: "Red",
  bar_color_green: "Green",
  bar_color_blue: "Blue",

  rect: "Rectangle",
  rounded_ends: "Rounded Ends",

  current_freq_range: "Current Freq Range",
  desired_freq_range: "Desired Freq Range",

  bars_per_freq: "Bars/freq",
  bars_per_bin: "Bars/bin",
  freq_pre_bar: "Freq/bar",
  freq_pre_bin: "Freq/bin",
  bins_per_bar: "Bins/bar",
  bins_per_freq: "Bins/freq",

  canvas_size_change: "Change canvas size",
  pixelated_render: "Pixelated Rendering",
  canvas_desync: "Canvas Desynchronize",
  canvas_fullscreen: "Fullscreen Mode",
  Telemetries: "Show Telemetries(drop fps)",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
  //: "",
};

var $locale = (function () {
  function _updText(i, id, newKey) {
    const el = document.querySelector(`[data-text="${i}"][data-text-id="${id}"]`);
    if (!el) return;

    el.setAttribute("data-text", newKey);

    const keyName = newKey.replace(/^\$/, "");
    if (locales[keyName]) {
      el.innerHTML = locales[keyName];
    }
  }
  function _updTextDirty(i, id, newText) {
    const el = document.querySelector(`[data-text="${i}"][data-text-id="${id}"]`);
    if (!el) return;

    el.dataset.text = newText;
    el.innerText = newText;
  }
  return {
    updText: _updText,
    updTextDirty: _updTextDirty,
  };
})();

(function () {
  let keys = Object.keys(locales);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];

    let labels = document.querySelectorAll(`[data-text="$${key}"]`);
    if (!labels.length) continue;

    labels.forEach((label) => {
      label.innerText = locales[key];
    });
  }

  //  gId("console").innerHTML = `Check out the source code!<a href="https://github.com/901D3/freevideodither" target="_blank">
  //github.com/901D3/freevideodither</a>
  //View avc1 options for custom MediaRecorder settings <a href="/avc1_options.txt" target="_blank">
  //avc1_options.txt</a>`;

  gId(
    "console"
  ).innerHTML = `This is just an experiment version of candlexyehrris, expect it to see bugs and unstable stuff\nMediaRecorder gives a less compatible video file and may not be able to play on every device, consider using ffmpeg to convert after record`;
})();
