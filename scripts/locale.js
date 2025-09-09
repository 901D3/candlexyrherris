var locales = {
  none: "None",
  elN_A: "Your browser does not support this element",
  title: "Candlexyrherris",
  subtitle: "A web-based reimplementation of Sonic Candle with enhanced stuff",

  upload: "Upload file",
  paste_link: "Paste link",
  recorder: "Recorder",

  start: "Start",
  stop: "Stop",
  pause: "Pause",
  resume: "Resume",
  update: "Update",
  play_pause: "Play/Pause",

  mime_type: "MIME type",
  codec: "Codec",
  file_name: "File name(ext is auto)",

  width: "Width",
  height: "Height",
  volume: "Volume",
  reconnect: "Reconnect",
  refresh: "Refresh",
  space: "Space",
  number: "Number",
  threshold: "Threshold",
  variables: "Variables",

  rect: "Rectangle",
  triangular: "Triangular",
  welch: "Welch",
  cosine: "Cosine",
  bartlett: "Bartlett",
  barthann: "Barthann",
  hann: "Hann",
  hamming: "Hamming",
  blackman: "Blackman",
  nuttall: "Nuttall",
  blackman_nuttall: "Blackman Nuttall",
  blackman_harris: "Blackman Harris",
  flat_top: "Flat top",
  bartlett_hann: "Bartlett Hann",
  gaussian: "Gaussian",
  exponential: "Exponential",
  lanczos: "Lanczos",

  audio_settings_title: "Audio",
  visualizer_settings_title: "Visualizer",
  fft_size: "FFT Size",
  frame_rate: "Frame rate",
  frame_latency: "Frame latency",
  vol_multiplier: "Volume Multiplier",

  sample_rate: "Sample Rate",
  bit_depth: "Bit Depth",
  number_of_channels: "Number of channels",

  min_amplitude: "Min Amplitude",
  max_amplitude: "Max Amplitude",

  min_frequency: "Min Frequency",
  max_frequency: "Max Frequency",

  bar_style: "Bar Style",
  bar_color_red: "Red",
  bar_color_green: "Green",
  bar_color_blue: "Blue",

  capsule: "Capsule",

  capsule_radius: "Capsule radius",

  window_function: "Window function",

  process_time: "Process time",

  current_freq_range: "Curr Freq Range",

  desired_freq_range: "Desr Freq Range",
  desired_fft_size: "Desr FFT Size",
  desired_bars: "Desr Bars",

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
  bitrate: "Bitrate",
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

  gId("windowFuncInput").placeholder = `"n" for index\n`;

  gId("console").innerHTML =
    "This is just an experiment version of candlexyehrris, expect it to see bugs and unstable stuff...\n" +
    "MediaRecorder gives a less compatible video file and may not be able to play on every device, consider using FFmpeg to convert after record!\n\n" +
    "Check out the source code!<a href='https://github.com/901D3/candlexyrherris' target='_blank'>github.com/901D3/candlexyrherris</a>" +
    "View MP4 codecs to ensure compability for MediaRecorder<a href='https://cconcolato.github.io/media-mime-support/' target='_blank'>cconcolato.github.io/media-mime-support/</a>";
})();
