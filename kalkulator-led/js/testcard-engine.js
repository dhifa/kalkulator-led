/**
 * LED Videotron Test Card & Pattern Engine (HTML5 Canvas 1:1 & 4K Generator)
 * Broadcast & AV Industry Grade Calibration Patterns
 */

export class TestCardEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.logoImage = null;
  }

  setLogo(imgElement) {
    this.logoImage = imgElement;
  }

  /**
   * Render complete customizable test pattern
   */
  render(calcData, options = {}) {
    const {
      patternType = 'smpte',
      showCabinetGrid = true,
      showSafeZones = false,
      showCheckerboard = false,
      showCenterCircle = false,
      showInfoBadge = true,
      showLogo = true,
      logoPosition = 'top-right',
      logoScale = 1.0,
      badgeCustom = {
        companyTitle: 'PT. TTI VIDEOTRON INDONESIA',
        projectName: 'LED SCREEN TECHNICAL CALIBRATION CARD',
        resText: '',
        specsText: '',
        footerText: '',
        position: 'bottom-center'
      },
      overrideWidth = null,
      overrideHeight = null
    } = options;

    const width = overrideWidth || calcData.resolution.width;
    const height = overrideHeight || calcData.resolution.height;

    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = true;

    // Clear canvas
    ctx.fillStyle = '#08090C';
    ctx.fillRect(0, 0, width, height);

    // Solid Color Modes (For Dead / Stuck Pixel Testing)
    if (patternType.startsWith('solid-')) {
      this.drawSolidColor(width, height, patternType);
      return;
    }

    // 1. Draw Selected Pattern
    switch (patternType) {
      case 'smpte':
        this.drawSMPTEBars(width, height);
        break;
      case 'hd-bars':
        this.drawHDColorBars(width, height);
        break;
      case 'gradient':
        this.drawGradients(width, height);
        break;
      case 'multiburst':
        this.drawMultiBurstPattern(width, height);
        break;
      case 'crosshatch':
        this.drawCrosshatchPattern(width, height);
        break;
      case 'gamma-steps':
        this.drawGammaStepsPattern(width, height);
        break;
      case 'siemens-star':
        this.drawSiemensStarPattern(width, height);
        break;
      case 'color-wheel':
        this.drawColorWheelPattern(width, height);
        break;
      case 'split-contrast':
        this.drawSplitContrastPattern(width, height);
        break;
      case 'checker':
        this.drawCheckerboardPattern(width, height);
        break;
      case 'geometry':
        this.drawGeometryPattern(width, height);
        break;
      case 'grid':
        this.drawPureCabinetGridPattern(calcData, width, height);
        break;
      default:
        this.drawSMPTEBars(width, height);
    }

    // 2. Overlays
    if (showCheckerboard && patternType !== 'checker') {
      this.drawCornerCheckerboards(width, height);
    }

    if (showCenterCircle || patternType === 'geometry') {
      this.drawCenterCircleAndCrosshairs(width, height, showInfoBadge);
    }

    if (showCabinetGrid && patternType !== 'grid') {
      this.drawCabinetSeamLines(calcData, width, height);
    }

    if (showSafeZones) {
      this.drawSafeZones(width, height);
    }

    this.drawEdgeBorders(width, height);

    if (showLogo && this.logoImage && logoPosition !== 'badge') {
      this.drawLogo(width, height, logoPosition, logoScale);
    }

    if (showInfoBadge) {
      this.drawInfoBadge(calcData, badgeCustom, width, height, showLogo && logoPosition === 'badge');
    }
  }

  drawSolidColor(w, h, type) {
    const ctx = this.ctx;
    const colorMap = {
      'solid-red': '#FF0000',
      'solid-green': '#00FF00',
      'solid-blue': '#0000FF',
      'solid-white': '#FFFFFF',
      'solid-black': '#000000'
    };
    ctx.fillStyle = colorMap[type] || '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * 1. SMPTE 75% standard color bars + PLUGE
   */
  drawSMPTEBars(w, h) {
    const ctx = this.ctx;
    const topH = Math.floor(h * 0.65);
    const midH = Math.floor(h * 0.10);
    const botH = h - topH - midH;

    const colors75 = ['#BFBFBF', '#BFBF00', '#00BFBF', '#00BF00', '#BF00BF', '#BF0000', '#0000BF'];
    const barW = w / 7;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = colors75[i];
      const startX = Math.round(i * barW);
      const endX = Math.round((i + 1) * barW);
      ctx.fillRect(startX, 0, endX - startX, topH);
    }

    const midColors = ['#0000BF', '#131313', '#BF00BF', '#131313', '#00BFBF', '#131313', '#BFBFBF'];
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = midColors[i];
      const startX = Math.round(i * barW);
      const endX = Math.round((i + 1) * barW);
      ctx.fillRect(startX, topH, endX - startX, midH);
    }

    const bY = topH + midH;
    const segW = w / 6;

    ctx.fillStyle = '#083B54'; // -I
    ctx.fillRect(0, bY, Math.round(segW), botH);
    ctx.fillStyle = '#FFFFFF'; // 100% Super White
    ctx.fillRect(Math.round(segW), bY, Math.round(segW), botH);
    ctx.fillStyle = '#390A5A'; // +Q
    ctx.fillRect(Math.round(segW * 2), bY, Math.round(segW), botH);
    ctx.fillStyle = '#000000'; // 0% Black
    ctx.fillRect(Math.round(segW * 3), bY, Math.round(segW), botH);

    // PLUGE Bars
    const plugeX = Math.round(segW * 4);
    const plugeSubW = Math.round(segW / 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(plugeX, bY, plugeSubW, botH);
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(plugeX + plugeSubW, bY, plugeSubW, botH);
    ctx.fillStyle = '#181818';
    ctx.fillRect(plugeX + plugeSubW * 2, bY, Math.round(segW) - plugeSubW * 2, botH);

    ctx.fillStyle = '#222222';
    ctx.fillRect(Math.round(segW * 5), bY, w - Math.round(segW * 5), botH);
  }

  /**
   * 2. HD 100% Full Saturation EBU Color Bars
   */
  drawHDColorBars(w, h) {
    const ctx = this.ctx;
    const topH = Math.floor(h * 0.70);
    const botH = h - topH;

    const colors100 = ['#FFFFFF', '#FFFF00', '#00FFFF', '#00FF00', '#FF00FF', '#FF0000', '#0000FF', '#000000'];
    const barW = w / 8;

    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = colors100[i];
      const startX = Math.round(i * barW);
      const endX = Math.round((i + 1) * barW);
      ctx.fillRect(startX, 0, endX - startX, topH);
    }

    // Bottom gradient ramp + 16 step gray
    const bSteps = 16;
    const bW = w / bSteps;
    for (let i = 0; i < bSteps; i++) {
      const val = Math.round((i / (bSteps - 1)) * 255);
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(Math.floor(i * bW), topH, Math.ceil(bW), botH);
    }
  }

  /**
   * 3. Multi-Burst Frequency Lines (Bandwidth & Sharpness Test)
   */
  drawMultiBurstPattern(w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#10141E';
    ctx.fillRect(0, 0, w, h);

    const sectionH = Math.floor(h / 3);
    const bursts = [1, 2, 4, 8, 16, 32]; // pixel stripe widths
    const numSections = bursts.length;
    const secW = w / numSections;

    // Top Section: Vertical frequency bursts
    for (let b = 0; b < numSections; b++) {
      const pW = bursts[b];
      const startX = b * secW;
      const endX = (b + 1) * secW;

      ctx.fillStyle = b % 2 === 0 ? '#182030' : '#141A28';
      ctx.fillRect(startX, 0, secW, sectionH);

      ctx.fillStyle = '#FFFFFF';
      for (let x = startX; x < endX; x += pW * 2) {
        ctx.fillRect(x, 20, pW, sectionH - 40);
      }

      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${pW}px Lines`, startX + secW / 2, sectionH - 10);
    }

    // Middle Section: Horizontal frequency bursts
    const midY = sectionH;
    for (let b = 0; b < numSections; b++) {
      const pH = bursts[b];
      const startX = b * secW;
      ctx.fillStyle = b % 2 === 0 ? '#141A28' : '#182030';
      ctx.fillRect(startX, midY, secW, sectionH);

      ctx.fillStyle = '#FFFFFF';
      for (let y = midY + 20; y < midY + sectionH - 30; y += pH * 2) {
        ctx.fillRect(startX + 10, y, secW - 20, pH);
      }

      ctx.fillStyle = '#FF007F';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${pH}px H-Lines`, startX + secW / 2, midY + sectionH - 10);
    }

    // Bottom Section: Continuous frequency sweep chirp
    const botY = sectionH * 2;
    for (let x = 0; x < w; x++) {
      const freq = Math.sin((x * x) / (w * 1.5));
      const val = Math.floor((freq + 1) * 127.5);
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(x, botY, 1, h - botY);
    }
  }

  /**
   * 4. Convergence Crosshatch Grid
   */
  drawCrosshatchPattern(w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#06080D';
    ctx.fillRect(0, 0, w, h);

    const gridSize = Math.max(24, Math.min(64, Math.floor(Math.min(w, h) / 20)));

    // Fine grid lines
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += gridSize / 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize / 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Major grid lines (White)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center Crosshairs (Cyan & Magenta)
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
  }

  /**
   * 5. 32-Step Gamma & Contrast Wedge Ladder
   */
  drawGammaStepsPattern(w, h) {
    const ctx = this.ctx;
    const steps = 32;
    const stepW = w / steps;
    const rowH = Math.floor(h / 5);

    // Row 1: 32 Linear Steps
    for (let i = 0; i < steps; i++) {
      const val = Math.round((i / (steps - 1)) * 255);
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(Math.floor(i * stepW), 0, Math.ceil(stepW), rowH);
    }

    // Row 2: 256-step Smooth Linear Ramp
    const grad1 = ctx.createLinearGradient(0, rowH, w, rowH);
    grad1.addColorStop(0, '#000000');
    grad1.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, rowH, w, rowH);

    // Row 3: Gamma 2.2 Corrected Ramp
    for (let x = 0; x < w; x++) {
      const norm = x / w;
      const gammaVal = Math.round(Math.pow(norm, 2.2) * 255);
      ctx.fillStyle = `rgb(${gammaVal}, ${gammaVal}, ${gammaVal})`;
      ctx.fillRect(x, rowH * 2, 1, rowH);
    }

    // Row 4: Low-light Shadow Detail Steps (0 to 15 IRE in fine steps)
    const lowSteps = 16;
    const lowW = w / lowSteps;
    for (let i = 0; i < lowSteps; i++) {
      const val = Math.round((i / (lowSteps - 1)) * 40); // 0-40 range
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(Math.floor(i * lowW), rowH * 3, Math.ceil(lowW), rowH);
    }

    // Row 5: Highlight Detail Steps (215 to 255 in fine steps)
    for (let i = 0; i < lowSteps; i++) {
      const val = 215 + Math.round((i / (lowSteps - 1)) * 40);
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(Math.floor(i * lowW), rowH * 4, Math.ceil(lowW), h - rowH * 4);
    }
  }

  /**
   * 6. Siemens Star / Radial Focus Target
   */
  drawSiemensStarPattern(w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#080B12';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.45;
    const spokes = 72;
    const angleStep = (Math.PI * 2) / spokes;

    for (let i = 0; i < spokes; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, i * angleStep, (i + 1) * angleStep);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Center clearing ring
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF0055';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 7. 360-Degree Radial Color Wheel
   */
  drawColorWheelPattern(w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#05070B';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.44;

    const sectors = 360;
    for (let i = 0; i < sectors; i++) {
      const startAngle = (i * Math.PI) / 180;
      const endAngle = ((i + 1.2) * Math.PI) / 180;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.7, `hsl(${i}, 100%, 50%)`);
      grad.addColorStop(1, '#000000');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * 8. Split Black/White & 4-Quadrant Contrast Field
   */
  drawSplitContrastPattern(w, h) {
    const ctx = this.ctx;
    const hw = w / 2;
    const hh = h / 2;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, hw, hh);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(hw, 0, hw, hh);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, hh, hw, hh);
    ctx.fillStyle = '#000000';
    ctx.fillRect(hw, hh, hw, hh);

    // Center contrast box
    const boxSize = Math.min(w, h) * 0.22;
    ctx.fillStyle = '#808080'; // 50% gray
    ctx.fillRect((w - boxSize) / 2, (h - boxSize) / 2, boxSize, boxSize);

    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.strokeRect((w - boxSize) / 2, (h - boxSize) / 2, boxSize, boxSize);
  }

  /**
   * 9. Smooth 256-step RGBW Gradients
   */
  drawGradients(w, h) {
    const ctx = this.ctx;
    const rowH = Math.floor(h / 6);

    const steps = 16;
    const stepW = w / steps;
    for (let i = 0; i < steps; i++) {
      const val = Math.round((i / (steps - 1)) * 255);
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(Math.floor(i * stepW), 0, Math.ceil(stepW), rowH);
    }

    const gradW = ctx.createLinearGradient(0, rowH, w, rowH);
    gradW.addColorStop(0, '#000000');
    gradW.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = gradW;
    ctx.fillRect(0, rowH, w, rowH);

    const gradR = ctx.createLinearGradient(0, rowH * 2, w, rowH * 2);
    gradR.addColorStop(0, '#000000');
    gradR.addColorStop(1, '#FF0000');
    ctx.fillStyle = gradR;
    ctx.fillRect(0, rowH * 2, w, rowH);

    const gradG = ctx.createLinearGradient(0, rowH * 3, w, rowH * 3);
    gradG.addColorStop(0, '#000000');
    gradG.addColorStop(1, '#00FF00');
    ctx.fillStyle = gradG;
    ctx.fillRect(0, rowH * 3, w, rowH);

    const gradB = ctx.createLinearGradient(0, rowH * 4, w, rowH * 4);
    gradB.addColorStop(0, '#000000');
    gradB.addColorStop(1, '#0000FF');
    ctx.fillStyle = gradB;
    ctx.fillRect(0, rowH * 4, w, rowH);

    const gradSpectrum = ctx.createLinearGradient(0, rowH * 5, w, rowH * 5);
    gradSpectrum.addColorStop(0 / 6, '#FF0000');
    gradSpectrum.addColorStop(1 / 6, '#FFFF00');
    gradSpectrum.addColorStop(2 / 6, '#00FF00');
    gradSpectrum.addColorStop(3 / 6, '#00FFFF');
    gradSpectrum.addColorStop(4 / 6, '#0000FF');
    gradSpectrum.addColorStop(5 / 6, '#FF00FF');
    gradSpectrum.addColorStop(1, '#FF0000');
    ctx.fillStyle = gradSpectrum;
    ctx.fillRect(0, rowH * 5, w, h - rowH * 5);
  }

  /**
   * 10. 1:1 Pixel Checkerboard Pattern
   */
  drawCheckerboardPattern(w, h) {
    const ctx = this.ctx;
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const index = (y * w + x) * 4;
        const isWhite = (x + y) % 2 === 0;
        const val = isWhite ? 240 : 15;
        data[index] = val;
        data[index + 1] = val;
        data[index + 2] = val;
        data[index + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * 11. Geometry & Aspect Circles
   */
  drawGeometryPattern(w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0F121A';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#252B3B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.moveTo(w, 0);
    ctx.lineTo(0, h);
    ctx.stroke();

    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(w, h) * 0.42;
    const circleSteps = 6;

    for (let i = 1; i <= circleSteps; i++) {
      const r = (maxRadius / circleSteps) * i;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = i === circleSteps ? '#00E5FF' : (i % 2 === 0 ? '#38435C' : '#FF007F');
      ctx.lineWidth = i === circleSteps ? 2 : 1.2;
      ctx.stroke();
    }
  }

  /**
   * 12. Pure Cabinet Grid Pattern
   */
  drawPureCabinetGridPattern(calcData, w, h) {
    const ctx = this.ctx;
    const { cabinet } = calcData;
    const { cols, rows } = cabinet;
    const pixelW = w / cols;
    const pixelH = h / rows;

    ctx.fillStyle = '#0B0E17';
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * pixelW;
        const y = r * pixelH;
        const cabIndex = r * cols + c + 1;

        ctx.fillStyle = (r + c) % 2 === 0 ? '#111624' : '#151C2E';
        ctx.fillRect(x + 1, y + 1, pixelW - 2, pixelH - 2);

        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, pixelW - 1, pixelH - 1);

        if (pixelW >= 40 && pixelH >= 30) {
          ctx.fillStyle = '#FFFFFF';
          const fontSize = Math.max(10, Math.min(26, Math.floor(pixelH * 0.18)));
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`#${cabIndex}`, x + pixelW / 2, y + pixelH / 2 - fontSize * 0.4);

          ctx.fillStyle = '#00E5FF';
          ctx.font = `${Math.max(8, Math.floor(fontSize * 0.75))}px sans-serif`;
          ctx.fillText(`[C:${c + 1} R:${r + 1}]`, x + pixelW / 2, y + pixelH / 2 + fontSize * 0.6);
        }
      }
    }
  }

  drawCornerCheckerboards(w, h) {
    const ctx = this.ctx;
    const patchSize = Math.min(80, Math.floor(Math.min(w, h) * 0.10));
    if (patchSize < 12) return;

    const offset = Math.max(15, Math.floor(Math.min(w, h) * 0.03));
    const corners = [
      { x: offset, y: offset },
      { x: w - patchSize - offset, y: offset },
      { x: offset, y: h - patchSize - offset },
      { x: w - patchSize - offset, y: h - patchSize - offset }
    ];

    corners.forEach(c => {
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1;
      ctx.strokeRect(c.x - 1, c.y - 1, patchSize + 2, patchSize + 2);

      const patchImg = ctx.createImageData(patchSize, patchSize);
      const data = patchImg.data;
      for (let py = 0; py < patchSize; py++) {
        for (let px = 0; px < patchSize; px++) {
          const idx = (py * patchSize + px) * 4;
          const isWhite = (px + py) % 2 === 0;
          const val = isWhite ? 255 : 0;
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(patchImg, c.x, c.y);
    });
  }

  drawCenterCircleAndCrosshairs(w, h, hasBadge) {
    const ctx = this.ctx;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    const radius = Math.floor(Math.min(w, h) * (hasBadge ? 0.20 : 0.28));

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 1.15, cy);
    ctx.lineTo(cx + radius * 1.15, cy);
    ctx.moveTo(cx, cy - radius * 1.15);
    ctx.lineTo(cx, cy + radius * 1.15);
    ctx.stroke();

    ctx.fillStyle = '#FF0055';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCabinetSeamLines(calcData, w, h) {
    const ctx = this.ctx;
    const { cabinet } = calcData;
    const { cols, rows } = cabinet;
    const pixelW = w / cols;
    const pixelH = h / rows;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let c = 1; c < cols; c++) {
      const x = Math.round(c * pixelW);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let r = 1; r < rows; r++) {
      const y = Math.round(r * pixelH);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSafeZones(w, h) {
    const ctx = this.ctx;
    ctx.save();

    const aW = w * 0.90;
    const aH = h * 0.90;
    const aX = (w - aW) / 2;
    const aY = (h - aH) / 2;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(aX, aY, aW, aH);

    const tW = w * 0.80;
    const tH = h * 0.80;
    const tX = (w - tW) / 2;
    const tY = (h - tH) / 2;
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(tX, tY, tW, tH);

    ctx.restore();
  }

  drawEdgeBorders(w, h) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#00FF66';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    const cornerSize = Math.min(18, Math.floor(Math.min(w, h) * 0.04));
    ctx.fillStyle = '#00FF66';

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.lineTo(0, cornerSize);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w - cornerSize, 0);
    ctx.lineTo(w, cornerSize);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(cornerSize, h);
    ctx.lineTo(0, h - cornerSize);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w - cornerSize, h);
    ctx.lineTo(w, h - cornerSize);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw Clean Transparent Logo directly on canvas
   */
  drawLogo(w, h, position, scale = 1.0) {
    if (!this.logoImage) return;
    const img = this.logoImage;
    const ctx = this.ctx;

    const imgW = img.naturalWidth || img.width || 200;
    const imgH = img.naturalHeight || img.height || 60;
    const aspect = imgW / imgH;

    const maxBoxW = Math.max(240, Math.min(800, Math.floor(w * 0.32))) * (scale || 1.0);
    const maxBoxH = Math.max(90, Math.min(300, Math.floor(h * 0.22))) * (scale || 1.0);

    let drawW = maxBoxW;
    let drawH = drawW / aspect;

    if (drawH > maxBoxH) {
      drawH = maxBoxH;
      drawW = drawH * aspect;
    }

    const margin = Math.max(25, Math.floor(Math.min(w, h) * 0.035));

    let x = margin;
    let y = margin;

    if (position === 'top-right') {
      x = w - drawW - margin;
      y = margin;
    } else if (position === 'top-left') {
      x = margin;
      y = margin;
    } else if (position === 'bottom-left') {
      x = margin;
      y = h - drawH - margin;
    } else if (position === 'bottom-right') {
      x = w - drawW - margin;
      y = h - drawH - margin;
    } else if (position === 'center') {
      x = (w - drawW) / 2;
      y = (h - drawH) / 2 - Math.floor(h * 0.08);
    }

    ctx.save();
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();
  }

  /**
   * Technical Information Badge
   */
  drawInfoBadge(calcData, badgeCustom, w, h, drawLogoInside) {
    const ctx = this.ctx;
    const { resolution, realDimensions, aspectRatio, pitchName, cabinet } = calcData;

    const line1 = badgeCustom.companyTitle || 'PT. TTI VIDEOTRON INDONESIA';
    const line2 = badgeCustom.projectName || 'LED SCREEN TEST PATTERN';
    const line3 = badgeCustom.resText || `${resolution.width} × ${resolution.height} PX  •  ${aspectRatio.ratioText} (${aspectRatio.decimalText})`;
    const line4 = badgeCustom.specsText || `${pitchName}  |  ${realDimensions.widthM}m × ${realDimensions.heightM}m (${realDimensions.areaSqm} m²)  |  ${cabinet.cols}×${cabinet.rows} (${cabinet.total} Cabs)`;
    const dateDefault = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const line5 = badgeCustom.footerText || `Technical Calibration Card  •  ${dateDefault}`;

    const badgeW = Math.min(600, Math.floor(w * 0.88));
    const badgeH = Math.min(145, Math.max(100, Math.floor(h * 0.24)));
    const badgeX = Math.floor((w - badgeW) / 2);

    let badgeY = Math.min(h - badgeH - 20, Math.floor(h * 0.72));
    if (badgeCustom.position === 'center') {
      badgeY = Math.floor((h - badgeH) / 2);
    } else if (badgeCustom.position === 'top-center') {
      badgeY = Math.max(20, Math.floor(h * 0.08));
    }

    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 20, 0.95)';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
    ctx.fill();
    ctx.stroke();

    const padding = 12;
    const availableH = badgeH - padding * 2;
    const lineSpacing = availableH / 4.8;
    const centerX = badgeX + badgeW / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (drawLogoInside && this.logoImage) {
      const logoH = badgeH - padding * 2;
      const logoAspect = this.logoImage.width / this.logoImage.height;
      const logoW = Math.min(80, logoH * logoAspect);
      ctx.drawImage(this.logoImage, badgeX + 16, badgeY + (badgeH - logoH) / 2, logoW, logoH);
    }

    const titleSize = Math.max(11, Math.min(15, Math.floor(badgeH * 0.12)));
    ctx.fillStyle = '#00E5FF';
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.fillText(line1.toUpperCase(), centerX, badgeY + padding + lineSpacing * 0.6);

    const projSize = Math.max(10, Math.min(13, Math.floor(badgeH * 0.10)));
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `600 ${projSize}px sans-serif`;
    ctx.fillText(line2, centerX, badgeY + padding + lineSpacing * 1.5);

    const resSize = Math.max(13, Math.min(22, Math.floor(badgeH * 0.17)));
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${resSize}px monospace`;
    ctx.fillText(line3, centerX, badgeY + padding + lineSpacing * 2.6);

    const specSize = Math.max(9, Math.min(12, Math.floor(badgeH * 0.09)));
    ctx.fillStyle = '#94A3B8';
    ctx.font = `${specSize}px sans-serif`;
    ctx.fillText(line4, centerX, badgeY + padding + lineSpacing * 3.7);

    const dateSize = Math.max(8, Math.min(11, Math.floor(badgeH * 0.08)));
    ctx.fillStyle = '#64748B';
    ctx.font = `${dateSize}px sans-serif`;
    ctx.fillText(line5, centerX, badgeY + padding + lineSpacing * 4.6);

    ctx.restore();
  }

  toDataURL(format = 'image/png', quality = 1.0) {
    return this.canvas.toDataURL(format, quality);
  }

  downloadImage(filename = 'led-testcard.png', format = 'image/png') {
    const dataUrl = this.toDataURL(format);
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export full 1:1 pixel native resolution image regardless of preview canvas scale
   */
  downloadFullResImage(calcData, options = {}, filename = 'led-testcard.png', format = 'image/png') {
    if (!calcData) {
      this.downloadImage(filename, format);
      return;
    }
    const nativeW = calcData.resolution.width;
    const nativeH = calcData.resolution.height;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = nativeW;
    exportCanvas.height = nativeH;

    const exportEngine = new TestCardEngine(exportCanvas);
    if (this.logoImage) {
      exportEngine.setLogo(this.logoImage);
    }
    exportEngine.render(calcData, {
      ...options,
      overrideWidth: nativeW,
      overrideHeight: nativeH
    });

    const dataUrl = exportCanvas.toDataURL(format);
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
