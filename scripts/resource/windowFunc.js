var $windowFunc = (function () {
  function _getPreset(preset) {
    const presets = {
      rect: "1",
      triangular: "1 - abs((n - N / 2) / (N / 2))",
      welch: "1 - ((n - N / 2) / N / 2) ** 2",
      cosine: "sin((PI / N) * (n + 0.5))",
      bartlett: "(2 / (N - 1)) * ((N - 1) / 2 - abs(n - (N - 1) / 2))",
      barthann: "0.62 - 0.48 * abs(n / (N - 1) - 0.5) + \n" + "0.38 * cos(2 * PI * abs(n / (N - 1) - 0.5))",

      hann: "0.5 * (1 - cos((2 * PI * n) / N))",
      hamming: "0.54 * (1 - cos((2 * PI * n) / N))",

      blackman: "0.42 - \n" + "0.5 * cos((2 * PI * n) / N) + \n" + "0.08 * cos((4 * PI * n) / N)",
      nuttall:
        "0.355768 - \n" +
        "0.487396 * cos((2 * PI * n) / N) + \n" +
        "0.144232 * cos((4 * PI * n) / N) - \n" +
        "0.012604 * cos((6 * PI * n) / N)",
      blackmanNuttall:
        "0.3635819 - \n" +
        "0.4891775 * cos((2 * PI * n) / N) + \n" +
        "0.1365995 * cos((4 * PI * n) / N) - \n" +
        "0.0106411 * cos((6 * PI * n) / N)",
      blackmanHarris:
        "0.35875 - \n" +
        "0.48829 * cos((2 * PI * n) / N) + \n" +
        "0.14128 * cos((4 * PI * n) / N) - \n" +
        "0.01168 * cos((6 * PI * n) / N)",
      flatTop:
        "0.21557895 - \n" +
        "0.41663158 * cos((2 * PI * n) / N) + \n" +
        "0.277263158 * cos((4 * PI * n) / N) - \n" +
        "0.083578947 * cos((6 * PI * n) / N) + \n" +
        "0.006947368 * cos((6 * PI * n) / N)",

      bartlettHann: "0.62 - \n" + "0.48 * abs((n / N) - 0.5) - \n" + "0.38 * cos((2 * PI * n) / N)",

      gaussian: "exp(-0.5 * ((n - N / 2) / ((0.35 * N) / 2)) ** 2)",
      exponential: "exp(-abs(n - N / 2) * (1 / (N / 2)))",

      lanczos: "sinc((2 * n) / N - 1)",

      //other custom window functions
      fun1: "exp(0.2 - (0.25 * cos((PI * n) / (N - 1))))",
      fun2: "1 - 0.012 * ((PI * n) / N) + 0.05 * ((4 * PI * n) / N)",
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
