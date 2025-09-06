function adjustCanvasSize() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  printLog(`Canvas size: ${canvas.width}x${canvas.height}`);
}

function changecanvasSize() {
  let width = gId("canvasWidth").value,
    height = gId("canvasHeight").value;
  if (width && height) {
    canvas.width = parseInt(width, 10);
    canvas.height = parseInt(height, 10);
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
  } else {
    alert("The width and height cannot be blank or negative.");
  }
}

const canvasSizeObserver = new ResizeObserver((entries) => {
  for (let entry of entries) {
    const {width, height} = entry.contentRect;

    canvas.width = width;
    canvas.height = height;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    (w = width), (h = height);
    sqSz = w * h;
  }
});

canvasSizeObserver.observe(canvas);
