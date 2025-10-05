var barDrawer = (function () {
  function _drawRectBar(ctx, buffer, Nbars, posX, posY, barWidthValue, barSpaceValue, minAmplitudeValue, maxAmplitudeValue) {
    const fullBarWidth = barWidthValue + barSpaceValue;
    for (let i = 0; i < Nbars; i++) {
      const x = posX + i * fullBarWidth;
      const barHeight = max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));

      ctx.fillRect(x, posY - barHeight, barWidthValue, barHeight);
      ctx.fillRect(x, posY, barWidthValue, barHeight);
    }
  }

  function _drawCapsuleBar(ctx, buffer, Nbars, posX, posY, barWidthValue, barSpaceValue, minAmplitudeValue, maxAmplitudeValue) {
    const fullBarWidth = barWidthValue + barSpaceValue;
    const radius = barWidthValue * barStyleCapsuleRadius;
    for (let i = 0; i < Nbars; i++) {
      const x = posX + i * fullBarWidth;
      const barHeight = max(minAmplitudeValue, min(buffer[i] * posY, maxAmplitudeValue));

      ctx.beginPath();
      ctx.moveTo(x + radius, posY - barHeight);
      try {
        ctx.roundRect(x, posY - barHeight, barWidthValue, barHeight * 2, radius);
      } catch {
        ctx.roundRect(x, posY - barHeight, barWidthValue, barHeight * 2, 0.2);
      }
      ctx.fill();
    }
  }

  return {
    drawRectBar: _drawRectBar,
    drawCapsuleBar: _drawCapsuleBar,
  };
})();
