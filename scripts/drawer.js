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
    if (barOutline) {
      posY -= 0.5;
    }
    const fullBarWidth = barWidthValue + barSpaceValue;

    for (let i = 0; i < Nbars; i++) {
      const x = barOutline
        ? barWidthRounding
          ? round(posX + i * fullBarWidth) + 0.5
          : posX + i * fullBarWidth + 0.5
        : barWidthRounding
        ? round(posX + i * fullBarWidth)
        : posX + i * fullBarWidth;
      const barHeight = barAmplitudeRounding
        ? round(max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue)))
        : max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));
      const y = posY - barHeight;

      if (barOutline) {
        ctx.strokeRect(x, y, barWidthValue, barHeight * 2);
      } else {
        ctx.fillRect(x, y, barWidthValue, barHeight * 2);
      }
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
    const fullBarWidth = barWidthValue + barSpaceValue;
    capsuleRadius = barWidthValue * barStyleCapsuleRadius;
    for (let i = 0; i < Nbars; i++) {
      const x = barOutline
        ? barWidthRounding
          ? round(posX + i * fullBarWidth) + 0.5
          : posX + i * fullBarWidth + 0.5
        : barWidthRounding
        ? round(posX + i * fullBarWidth)
        : posX + i * fullBarWidth;
      const barHeight = barAmplitudeRounding
        ? round(max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue)))
        : max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));
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
    const fullBarWidth = barWidthValue + barSpaceValue;
    const halfW = barWidthValue / 2;
    const maxTriangleHeight = barWidthValue * triangleHeight;

    for (let i = 0; i < Nbars; i++) {
      const x = barOutline
        ? barWidthRounding
          ? round(posX + i * fullBarWidth) + 0.5
          : posX + i * fullBarWidth + 0.5
        : barWidthRounding
        ? round(posX + i * fullBarWidth)
        : posX + i * fullBarWidth;
      const barHeight = barAmplitudeRounding
        ? round(max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue)))
        : max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));

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
    const dbPI = PI * 2;
    const fullBarWidth = barWidthValue * 2 + barSpaceValue;

    for (let i = 0; i < Nbars; i++) {
      const x = barOutline
        ? barWidthRounding
          ? round(posX + i * fullBarWidth) + 0.5
          : posX + i * fullBarWidth + 0.5
        : barWidthRounding
        ? round(posX + i * fullBarWidth)
        : posX + i * fullBarWidth;
      const barHeight = barAmplitudeRounding
        ? round(max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue)))
        : max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));

      ctx.beginPath();
      ctx.ellipse(x + barWidthValue, posY, barWidthValue, barHeight, 0, 0, dbPI);
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
    ctx.beginPath();
    for (let i = 0; i < Nbars; i++) {
      const x = barWidthRounding ? Math.round(posX + i * barWidthValue) : posX + i * barWidthValue;

      const barHeight = barAmplitudeRounding
        ? Math.round(Math.max(minAmplitudeValue, Math.min(buffer[i] * posY, maxAmplitudeValue)))
        : Math.max(minAmplitudeValue, Math.min(buffer[i] * posY, maxAmplitudeValue));

      ctx.lineTo(x, posY - barHeight);
      if (i == Nbars - 1) ctx.lineTo(x, posY + barHeight);
    }

    for (let i = Nbars - 1; i >= 0; i--) {
      const x = barWidthRounding ? Math.round(posX + i * barWidthValue) : posX + i * barWidthValue;

      const barHeight = barAmplitudeRounding
        ? Math.round(Math.max(minAmplitudeValue, Math.min(buffer[i] * posY, maxAmplitudeValue)))
        : Math.max(minAmplitudeValue, Math.min(buffer[i] * posY, maxAmplitudeValue));

      ctx.lineTo(x, posY + barHeight);
      if (i == 0) ctx.lineTo(x, posY - barHeight);
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
