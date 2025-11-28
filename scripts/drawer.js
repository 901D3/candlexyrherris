var barDrawer = (function () {
  const _drawRectBar = (
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
  ) => {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);

    for (let i = 0; i < Nbars; i++) {
      const fullBarWidth = barWidthValue + barSpaceValue;
      const anchorX = posX * canvasWidth - halfN * fullBarWidth;

      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = Math.round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      const y = posY - barHeight;

      if (barOutline) ctx.strokeRect(x, y, barWidthValue, barHeight * 2);
      else ctx.fillRect(x, y, barWidthValue, barHeight * 2);
    }
  };

  const _drawCapsuleBar = (
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
  ) => {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue + barSpaceValue;
    const anchorX = posX * canvasWidth - halfN * fullBarWidth;

    capsuleRadius = barWidthValue * barStyleCapsuleRadius;

    for (let i = 0; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = Math.round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      const y = posY - barHeight;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidthValue, barHeight * 2, capsuleRadius);

      if (barOutline) ctx.stroke();
      else ctx.fill();
    }
  };

  const _drawTriCapsuleBar = (
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
  ) => {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue + barSpaceValue;
    const halfW = barWidthValue / 2;
    const anchorX = posX * canvasWidth - halfN * fullBarWidth;

    const maxTriangleHeight = barWidthValue * triangleHeight;

    for (let i = 0; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = Math.round(x);
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
  };

  const _drawOvalBar = (
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
  ) => {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue + (barSpaceValue * barWidthValue + barSpaceValue);
    const anchorX = posX * canvasWidth - halfN * fullBarWidth + fullBarWidth / 2;

    for (let i = 0, dbPI = PI * 2; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = Math.round(x);
      if (barOutline) x += 0.5;

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.beginPath();

      ctx.ellipse(x, posY, barWidthValue, barHeight, 0, 0, dbPI);

      if (barOutline) ctx.stroke();
      else ctx.fill();
    }
  };

  const _drawLines = (
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
  ) => {
    posY *= canvasHeight;
    if (barOutline) posY -= 0.5;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue;
    const anchorX = posX * canvasWidth - halfN * fullBarWidth;

    ctx.beginPath();

    // Half-top
    for (let i = 0; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = Math.round(x);

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.lineTo(x, posY - barHeight);
    }

    // Half-bottom
    for (let i = Nbars - 1; i >= 0; i--) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = Math.round(x);

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      ctx.lineTo(x, posY + barHeight);

      if (i === 0) ctx.lineTo(x, posY - barHeight);
    }

    if (barOutline) ctx.stroke();
    else ctx.fill();
  };

  const _drawPeaks = (
    ctx,
    buffer,
    Nbars,
    posX,
    posY,
    barWidthValue,
    barSpaceValue,
    minAmplitudeValue,
    maxAmplitudeValue,
    barAmplitudeRounding = false,
    barWidthRounding = false,
    peakHeight
  ) => {
    posY *= canvasHeight;
    const halfN = Math.floor(Nbars / 2);
    const fullBarWidth = barWidthValue + barSpaceValue;
    const anchorX = posX * canvasWidth - halfN * fullBarWidth;

    for (let i = 0; i < Nbars; i++) {
      let x = anchorX + i * fullBarWidth;
      if (barWidthRounding) x = Math.round(x);

      let barHeight = Math.max(minAmplitudeValue, Math.min(buffer[i], maxAmplitudeValue));
      if (barAmplitudeRounding) barHeight = Math.round(barHeight);

      // Top peak
      ctx.fillRect(x, posY - barHeight - peakHeight / 2, barWidthValue, peakHeight);

      // Bottom peak
      ctx.fillRect(x, posY + barHeight - peakHeight / 2, barWidthValue, peakHeight);
    }
  };

  return {
    drawRectBar: _drawRectBar,
    drawCapsuleBar: _drawCapsuleBar,
    drawTriCapsuleBar: _drawTriCapsuleBar,
    drawOvalBar: _drawOvalBar,
    drawLines: _drawLines,
    drawPeaks: _drawPeaks,
  };
})();
