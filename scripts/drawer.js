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
    barAmplitudeRounding = false,
    barWidthRounding = false
  ) {
    const fullBarWidth = barWidthValue + barSpaceValue;
    for (let i = 0; i < Nbars; i++) {
      const x = barWidthRounding ? round(posX + i * fullBarWidth) : posX + i * fullBarWidth;
      const barHeight = barAmplitudeRounding
        ? round(max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue)))
        : max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));

      ctx.fillRect(x, posY - barHeight, barWidthValue, barHeight);
      ctx.fillRect(x, posY, barWidthValue, barHeight);
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
    barAmplitudeRounding = false,
    barWidthRounding = false,
    capsuleRadius
  ) {
    const fullBarWidth = barWidthValue + barSpaceValue;
    capsuleRadius = barWidthValue * barStyleCapsuleRadius;
    for (let i = 0; i < Nbars; i++) {
      const x = barWidthRounding ? round(posX + i * fullBarWidth) : posX + i * fullBarWidth;
      const barHeight = barAmplitudeRounding
        ? round(max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue)))
        : max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));
      const topY = posY - barHeight;

      ctx.beginPath();
      ctx.moveTo(x + capsuleRadius, topY);
      ctx.roundRect(x, topY, barWidthValue, barHeight * 2, capsuleRadius);
      ctx.fill();
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
    barAmplitudeRounding = false,
    barWidthRounding = false,
    triangleHeight
  ) {
    const fullBarWidth = barWidthValue + barSpaceValue;
    const halfW = barWidthValue / 2;
    const maxTriangleHeight = barWidthValue * triangleHeight;

    for (let i = 0; i < Nbars; i++) {
      const x = barWidthRounding ? round(posX + i * fullBarWidth) : posX + i * fullBarWidth;
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
      ctx.fill();
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
    barAmplitudeRounding = false,
    barWidthRounding = false
  ) {
    const dbPI = PI * 2;
    const fullBarWidth = barWidthValue * 2 + barSpaceValue;

    for (let i = 0; i < Nbars; i++) {
      const x = barWidthRounding ? round(posX + i * fullBarWidth) : posX + i * fullBarWidth;
      const barHeight = barAmplitudeRounding
        ? round(max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue)))
        : max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));

      ctx.beginPath();
      ctx.ellipse(x + barWidthValue, posY, barWidthValue, barHeight, 0, 0, dbPI);
      ctx.fill();
    }
  }

  return {
    drawRectBar: _drawRectBar,
    drawCapsuleBar: _drawCapsuleBar,
    drawTriCapsuleBar: _drawTriCapsuleBar,
    drawOvalBar: _drawOvalBar,
  };
})();
