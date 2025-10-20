var $windowFunc = (function () {
  function _getPreset(preset) {
    const presets = {
      rect: "1",
      ramp: "n / N",
      triangular: "1 - Math.abs((n - N / 2) / (N / 2))",
      welch: "1 - ((n - N / 2) / (N / 2)) ** 2",
      cosine: "sin((Math.PI / N) * (n + 0.5))",
      bartlett: "(2 / N) * (N / 2 - Math.abs(n - N / 2))",
      barthann: "0.62 - 0.48 * Math.abs(n / N - 0.5) + \n" + "0.38 * Math.cos(2 * Math.PI * Math.abs(n / N - 0.5))",

      hann: "0.5 * (1 - Math.cos((2 * Math.PI * n) / N))",
      hamming: "0.54 * (1 - Math.cos((2 * Math.PI * n) / N))",

      blackman: "0.42 - \n" + "0.5 * Math.cos((2 * Math.PI * n) / N) + \n" + "0.08 * Math.cos((4 * Math.PI * n) / N)",
      nuttall:
        "0.355768 - \n" +
        "0.487396 * Math.cos((2 * Math.PI * n) / N) + \n" +
        "0.144232 * Math.cos((4 * Math.PI * n) / N) - \n" +
        "0.012604 * Math.cos((6 * Math.PI * n) / N)",
      blackmanNuttall:
        "0.3635819 - \n" +
        "0.4891775 * Math.cos((2 * Math.PI * n) / N) + \n" +
        "0.1365995 * Math.cos((4 * Math.PI * n) / N) - \n" +
        "0.0106411 * Math.cos((6 * Math.PI * n) / N)",
      blackmanHarris:
        "0.35875 - \n" +
        "0.48829 * Math.cos((2 * Math.PI * n) / N) + \n" +
        "0.14128 * Math.cos((4 * Math.PI * n) / N) - \n" +
        "0.01168 * Math.cos((6 * Math.PI * n) / N)",
      flatTop:
        "0.21557895 - \n" +
        "0.41663158 * Math.cos((2 * Math.PI * n) / N) + \n" +
        "0.277263158 * Math.cos((4 * Math.PI * n) / N) - \n" +
        "0.083578947 * Math.cos((6 * Math.PI * n) / N) + \n" +
        "0.006947368 * Math.cos((6 * Math.PI * n) / N)",

      bartlettHann: "0.62 - \n" + "0.48 * Math.abs((n / N) - 0.5) - \n" + "0.38 * Math.cos((2 * Math.PI * n) / N)",

      gaussian: "Math.exp(-0.5 * ((n - N / 2) / ((0.35 * N) / 2)) ** 2)",
      exponential: "Math.exp(-Math.abs(n - N / 2) * (1 / (N / 2)))",

      lanczos: "sinc((2 * n) / N - 1)",

      //other custom window functions
      fun1: "Math.exp(0.2 - (0.25 * Math.cos((Math.PI * n) / N)))",
      fun2: "1 - 0.012 * ((Math.PI * n) / N) + 0.05 * ((4 * Math.PI * n) / N)",
      fun3: "n > ( N / 2 ) ? ((n / N) / n) : n / (N / 4)"
    };

    const choosenPreset = presets[preset];

    if (choosenPreset) {
      return choosenPreset;
    } else {
      return false;
    }
  }

  return {
    getPreset: _getPreset,
  };
})();
