var barDrawer = (function () {
  function _drawRectBar(
    ctx,
    buffer,
    Nbars,
    posX,
    posY,
    barWidthValue,
    barSpaceValue,
    minAmplitudeValue,
    maxAmplitudeValue,
    barOutline = false,
    barAmplitudeRounding = false,
    barWidthRounding = false
  ) {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue + barSpaceValue;
    const anchorX = posX * canvasWidth - halfN * fullBarWidth;

    for (let i = halfN - 1; i >= 0; i--) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      const y = posY - barHeight;

      if (barOutline) ctx.strokeRect(x, y, barWidthValue, barHeight * 2);
      else ctx.fillRect(x, y, barWidthValue, barHeight * 2);
    }

    for (let i = halfN; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      const y = posY - barHeight;

      if (barOutline) ctx.strokeRect(x, y, barWidthValue, barHeight * 2);
      else ctx.fillRect(x, y, barWidthValue, barHeight * 2);
    }
  }

  function _drawCapsuleBar(
    ctx,
    buffer,
    Nbars,
    posX,
    posY,
    barWidthValue,
    barSpaceValue,
    minAmplitudeValue,
    maxAmplitudeValue,
    barOutline = false,
    barAmplitudeRounding = false,
    barWidthRounding = false,
    capsuleRadius
  ) {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue + barSpaceValue;
    const anchorX = posX * canvasWidth - halfN * fullBarWidth;

    capsuleRadius = barWidthValue * barStyleCapsuleRadius;
    for (let i = halfN - 1; i >= 0; i--) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      const y = posY - barHeight;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidthValue, barHeight * 2, capsuleRadius);
      if (barOutline) ctx.stroke();
      else ctx.fill();
    }

    for (let i = halfN; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      const y = posY - barHeight;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidthValue, barHeight * 2, capsuleRadius);
      if (barOutline) ctx.stroke();
      else ctx.fill();
    }
  }

  function _drawTriCapsuleBar(
    ctx,
    buffer,
    Nbars,
    posX,
    posY,
    barWidthValue,
    barSpaceValue,
    minAmplitudeValue,
    maxAmplitudeValue,
    barOutline = false,
    barAmplitudeRounding = false,
    barWidthRounding = false,
    triangleHeight
  ) {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue + barSpaceValue;
    const halfW = barWidthValue / 2;
    const anchorX = posX * canvasWidth - halfN * fullBarWidth;

    const maxTriangleHeight = barWidthValue * triangleHeight;
    for (let i = halfN - 1; i >= 0; i--) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      const triH = Math.min(maxTriangleHeight, barHeight);
      const topY = posY - barHeight + triH;
      const bottomY = posY + barHeight - triH;
      const xBarWidth = x + barWidthValue;
      const xHalfBarWidth = x + halfW;

      ctx.beginPath();
      ctx.moveTo(xHalfBarWidth, topY - triH);
      ctx.lineTo(xBarWidth, topY);
      ctx.lineTo(xBarWidth, bottomY);
      ctx.lineTo(xHalfBarWidth, bottomY + triH);
      ctx.lineTo(x, bottomY);
      ctx.lineTo(x, topY);
      ctx.closePath();
      if (barOutline) ctx.stroke();
      else ctx.fill();
    }

    for (let i = halfN; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      const triH = Math.min(maxTriangleHeight, barHeight);
      const topY = posY - barHeight + triH;
      const bottomY = posY + barHeight - triH;
      const xBarWidth = x + barWidthValue;
      const xHalfBarWidth = x + halfW;

      ctx.beginPath();
      ctx.moveTo(xHalfBarWidth, topY - triH);
      ctx.lineTo(xBarWidth, topY);
      ctx.lineTo(xBarWidth, bottomY);
      ctx.lineTo(xHalfBarWidth, bottomY + triH);
      ctx.lineTo(x, bottomY);
      ctx.lineTo(x, topY);
      ctx.closePath();
      if (barOutline) ctx.stroke();
      else ctx.fill();
    }
  }

  function _drawOvalBar(
    ctx,
    buffer,
    Nbars,
    posX,
    posY,
    barWidthValue,
    barSpaceValue,
    minAmplitudeValue,
    maxAmplitudeValue,
    barOutline = false,
    barAmplitudeRounding = false,
    barWidthRounding = false
  ) {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue + (barSpaceValue * barWidthValue + barSpaceValue);
    const anchorX = posX * canvasWidth - halfN * fullBarWidth + fullBarWidth / 2;

    const dbPI = PI * 2;

    for (let i = halfN - 1; i >= 0; i--) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.beginPath();
      ctx.ellipse(x, posY, barWidthValue, barHeight, 0, 0, dbPI);
      if (barOutline) ctx.stroke();
      else ctx.fill();
    }

    for (let i = halfN; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.beginPath();
      ctx.ellipse(x, posY, barWidthValue, barHeight, 0, 0, dbPI);
      if (barOutline) ctx.stroke();
      else ctx.fill();
    }
  }

  function _drawLines(
    ctx,
    buffer,
    Nbars,
    posX,
    posY,
    barWidthValue,
    minAmplitudeValue,
    maxAmplitudeValue,
    barOutline = false,
    barAmplitudeRounding = false,
    barWidthRounding = false
  ) {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue;
    const anchorX = posX * canvasWidth - halfN * fullBarWidth;

    ctx.beginPath();

    // Top-left
    for (let i = halfN - 1; i >= 0; i--) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.lineTo(x, posY - barHeight);
    }

    // Bottom-left
    for (let i = 0; i < halfN; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.lineTo(x, posY + barHeight);
    }

    // Top-right
    for (let i = halfN; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.lineTo(x, posY - barHeight);
      if (i == Nbars - 1) ctx.lineTo(x, posY + barHeight);
    }

    // Bottom-right
    for (let i = Nbars - 1; i >= halfN; i--) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = round(x);

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.lineTo(x, posY + barHeight);
    }

    if (barOutline) ctx.stroke();
    else ctx.fill();
  }

  return {
    drawRectBar: _drawRectBar,
    drawCapsuleBar: _drawCapsuleBar,
    drawTriCapsuleBar: _drawTriCapsuleBar,
    drawOvalBar: _drawOvalBar,
    drawLines: _drawLines,
  };
})();
