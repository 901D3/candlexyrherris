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
  left: "Left",
  right: "Right",
  channel: "Channel",

  mime_type: "MIME type",
  codec: "Codec",
  file_name: "File name(ext is auto)",
  start_position: "Start position",

  width: "Width",
  height: "Height",
  volume: "Volume",
  reconnect: "Reconnect",
  refresh: "Refresh",
  space: "Space",
  number: "Number",
  threshold: "Threshold",
  variables: "Variables",
  bitrate: "Bitrate",

  bin_value_picking: "Bin value picking",
  first: "First",
  max: "Max",
  average: "Average",
  RMS: "RMS",

  rect: "Rectangle",
  ramp: "Ramp",
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
  pre_vol_multiplier: "Pre volume multiplier",
  post_vol_multiplier: "Post volume multiplier",

  sample_rate: "Sample rate",
  bit_depth: "Bit depth",
  number_of_channels: "Number of channels",

  audio_data_length: "Audio data length",
  audio_duration: "Audio duration",
  window_length: "Window length",
  bin_range: "Bin range",
  min_bin: "Min bin",
  max_bin: "Max bin",
  amplitude_offset: "Amplitude offset",

  min_amplitude: "Min amplitude",
  max_amplitude: "Max amplitude",

  min_frequency: "Min frequency",
  max_frequency: "Max frequency",

  bar_style: "Bar style",
  bar_color_red: "Red",
  bar_color_green: "Green",
  bar_color_blue: "Blue",
  background_style: "Background Style",
  solid_color: "Solid Color",
  image: "Image",

  capsule: "Capsule",
  triangle_capsule: "Triangle Capsule",
  oval: "Oval",

  capsule_radius: "Capsule radius",
  triangle_capsule_height: "Triangle capsule height",

  window_function: "Window function",

  process_time: "Process time",

  freq_range: "Freq range",
  Interleave: "Interleave",

  desired_freq_range: "Desr freq range",
  desired_fft_size: "Desr FFT size",
  desired_bars: "Desr bars",

  bars_per_freq: "Bars/freq",
  bars_per_bin: "Bars/bin",
  freq_pre_bar: "Freq/bar",
  freq_pre_bin: "Freq/bin",
  bins_per_bar: "Bins/bar",
  bins_per_freq: "Bins/freq",

  true: "True",
  false: "False",
  null: "Null",

  enable_file_writer: "Enable file writer",
  webp_quality: "WebP quality",
  max_concurrent_encodes: "Max concurrent encodes",

  canvas_size_change: "Change canvas size",
  pixelated_render: "Pixelated Rendering",
  canvas_desync: "Canvas Desynchronize",
  canvas_fullscreen: "Fullscreen Mode",
  Telemetries: "Show Telemetries(drop fps)",
  startPositionTooltip: "Start position before rendering in seconds",
  fftSizeTooltip: "FFT size can be non-power of 2",
  //: "",
};

var $locale = (function () {
  function _getDataText(i, id) {
    const el = document.querySelector(`[data-text="${i}"][data-text-id="${id}"]`);
    if (!el) return false;
    return el;
  }

  function _updText(i, id, newKey) {
    const el = _getDataText(i, id);

    el.setAttribute("data-text", newKey);

    const keyName = newKey.replace(/^\$/, "");
    if (locales[keyName]) {
      el.innerHTML = locales[keyName];
    }
  }

  function _updTextDirty(i, id, newText) {
    const el = _getDataText(i, id);

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

  gId("windowFuncInput").placeholder =
    "'n' for index\n" + "'N' for frame length\n" + "'Math' namespace is defined globally and any operators is allowed";

  gId("console").innerHTML =
    "This is just an experiment version of Candlexyehrris, expect to see bugs and unstable stuff...\n" +
    "MediaRecorder and WebM Writer produce videos with limited compatibility and may not be playable on some devices.\n" +
    "Consider using FFmpeg or any video converter tools to convert the video after recording or rendering!\n\n" +
    "Check out the source code!<a href='https://github.com/901D3/candlexyrherris' target='_blank'>github.com/901D3/candlexyrherris</a>" +
    "MP4 codecs for MediaRecorder<a href='https://cconcolato.github.io/media-mime-support/' target='_blank'>cconcolato.github.io/media-mime-support/</a>";
})();
