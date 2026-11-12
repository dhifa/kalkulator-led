/**
 * LED Videotron Mathematical & Hardware Calculation Engine
 */

import { LED_PITCH_PRESETS, STANDARD_RATIOS, CONTROLLER_MODELS } from './presets.js';

// Helper: Greatest Common Divisor for ratio simplification
export function getGCD(a, b) {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function simplifyRatio(width, height) {
  if (!width || !height) return { text: '1:1', decimal: 1, w: 1, h: 1 };
  const gcd = getGCD(width, height);
  const w = Math.round(width / gcd);
  const h = Math.round(height / gcd);

  // If the numbers are too large/ugly (e.g. 1920:1152 -> 5:3), standard reduction works.
  // For prime or awkward dimensions, also provide a rounded version (e.g. 1.67:1)
  const decimal = width / height;
  return {
    text: `${w}:${h}`,
    decimal: decimal,
    decimalText: `${decimal.toFixed(2)}:1`,
    w,
    h
  };
}

export function findClosestStandardRatio(width, height) {
  if (!width || !height) return null;
  const currentRatio = width / height;
  let closest = STANDARD_RATIOS[0];
  let minDiff = Math.abs(currentRatio - closest.ratio);

  for (const std of STANDARD_RATIOS) {
    const diff = Math.abs(currentRatio - std.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = std;
    }
  }

  const diffPercent = ((currentRatio - closest.ratio) / closest.ratio) * 100;

  let fitStatus = 'exact';
  if (Math.abs(diffPercent) > 1.0) {
    fitStatus = currentRatio > closest.ratio ? 'wider' : 'taller';
  }

  return {
    standard: closest,
    diffPercent: diffPercent.toFixed(1),
    fitStatus
  };
}

/**
 * Generate standard size recommendations for a given target aspect ratio
 */
export function getRatioRecommendations(targetRatioKey = '16:9', cabWidthMm = 500, cabHeightMm = 500) {
  let targetRatioVal = 16 / 9;
  if (targetRatioKey === '4:3') targetRatioVal = 4 / 3;
  else if (targetRatioKey === '21:9') targetRatioVal = 21 / 9;
  else if (targetRatioKey === '32:9') targetRatioVal = 32 / 9;
  else if (targetRatioKey === '1:1') targetRatioVal = 1.0;
  else if (targetRatioKey === '9:16') targetRatioVal = 9 / 16;
  else if (targetRatioKey === '16:10') targetRatioVal = 16 / 10;

  const cabRatio = cabWidthMm / cabHeightMm;
  const list = [];

  // Generate matrix sizes from small (e.g. 2m) to large (e.g. 25m)
  const candidateCols = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64];

  candidateCols.forEach(c => {
    const r = Math.max(1, Math.round((c * cabRatio) / targetRatioVal));
    const wM = (c * cabWidthMm) / 1000;
    const hM = (r * cabHeightMm) / 1000;
    const area = wM * hM;
    const actualRatio = (c * cabWidthMm) / (r * cabHeightMm);
    const devPct = Math.abs(((actualRatio - targetRatioVal) / targetRatioVal) * 100);
    const isExact = devPct < 0.05;

    list.push({
      cols: c,
      rows: r,
      widthM: wM,
      heightM: hM,
      areaSqm: +area.toFixed(2),
      actualRatio: +actualRatio.toFixed(3),
      deviationPct: +devPct.toFixed(1),
      isExact,
      label: `${wM.toFixed(1)} × ${hM.toFixed(1)} m (${c}×${r} cab${isExact ? ' - EXACT ⭐' : ''})`
    });
  });

  return list;
}

/**
 * Main Calculation Routine
 * @param {Object} params
 * @param {string} params.mode - 'dimension' | 'cabinet' | 'resolution' | 'ratio'
 * @param {number} params.targetWidth - in meters (if mode === 'dimension')
 * @param {number} params.targetHeight - in meters (if mode === 'dimension')
 * @param {number} params.cabinetCols - columns of cabinets (if mode === 'cabinet')
 * @param {number} params.cabinetRows - rows of cabinets (if mode === 'cabinet')
 * @param {number} params.targetPixelW - target pixel width (if mode === 'resolution')
 * @param {number} params.targetPixelH - target pixel height (if mode === 'resolution')
 * @param {string} params.targetRatio - '16:9' | '4:3' | '21:9' | '32:9' | '1:1' | '9:16' | 'custom' (if mode === 'ratio')
 * @param {string} params.ratioBaseType - 'width' | 'height' | 'area' | 'cols' (if mode === 'ratio')
 * @param {number} params.ratioBaseValue - numeric value (if mode === 'ratio')
 * @param {string} params.pitchId - id of selected pitch preset or 'custom'
 * @param {number} params.customPitch - pitch in mm (if pitchId === 'custom')
 * @param {Object} params.cabinetSize - { width: number, height: number } in mm
 * @param {number} params.customCabinetPixelW - optional override
 * @param {number} params.customCabinetPixelH - optional override
 */
export function calculateVideotron(params) {
  const preset = LED_PITCH_PRESETS.find(p => p.id === params.pitchId) || LED_PITCH_PRESETS[0]; // Default Unilumin P2.6
  const pitch = params.pitchId === 'custom' ? (params.customPitch || 2.604) : preset.pitch;

  const cabWidthMm = params.cabinetSize ? params.cabinetSize.width : (preset.standardCabinet?.width || 500);
  const cabHeightMm = params.cabinetSize ? params.cabinetSize.height : (preset.standardCabinet?.height || 500);

  // Pixels per cabinet
  let cabPixelW = params.customCabinetPixelW || Math.round(cabWidthMm / pitch);
  let cabPixelH = params.customCabinetPixelH || Math.round(cabHeightMm / pitch);

  let cols = 1;
  let rows = 1;

  if (params.mode === 'dimension') {
    const targetWMm = (params.targetWidth || 5) * 1000;
    const targetHMm = (params.targetHeight || 3) * 1000;
    cols = Math.max(1, Math.round(targetWMm / cabWidthMm));
    rows = Math.max(1, Math.round(targetHMm / cabHeightMm));
  } else if (params.mode === 'cabinet') {
    cols = Math.max(1, parseInt(params.cabinetCols || 10, 10));
    rows = Math.max(1, parseInt(params.cabinetRows || 6, 10));
  } else if (params.mode === 'resolution') {
    const targetPxW = params.targetPixelW || 1920;
    const targetPxH = params.targetPixelH || 1080;
    cols = Math.max(1, Math.round(targetPxW / cabPixelW));
    rows = Math.max(1, Math.round(targetPxH / cabPixelH));
  } else if (params.mode === 'ratio') {
    let targetRatioVal = 16 / 9;
    const targetRatioText = params.targetRatio || '16:9';
    if (targetRatioText === '16:9') targetRatioVal = 16 / 9;
    else if (targetRatioText === '4:3') targetRatioVal = 4 / 3;
    else if (targetRatioText === '21:9') targetRatioVal = 21 / 9;
    else if (targetRatioText === '32:9') targetRatioVal = 32 / 9;
    else if (targetRatioText === '1:1') targetRatioVal = 1.0;
    else if (targetRatioText === '9:16') targetRatioVal = 9 / 16;
    else if (targetRatioText === '16:10') targetRatioVal = 16 / 10;
    else if (targetRatioText === 'custom') {
      const rw = parseFloat(params.customRatioW) || 16;
      const rh = parseFloat(params.customRatioH) || 9;
      targetRatioVal = rw / rh;
    }

    const baseType = params.ratioBaseType || 'width'; // 'width' | 'height' | 'area' | 'cols'
    const baseVal = parseFloat(params.ratioBaseValue) || 6.0;
    const cabRatioFactor = cabWidthMm / cabHeightMm;

    if (baseType === 'width') {
      const targetWMm = baseVal * 1000;
      cols = Math.max(1, Math.round(targetWMm / cabWidthMm));
      rows = Math.max(1, Math.round((cols * cabRatioFactor) / targetRatioVal));
    } else if (baseType === 'height') {
      const targetHMm = baseVal * 1000;
      rows = Math.max(1, Math.round(targetHMm / cabHeightMm));
      cols = Math.max(1, Math.round((rows * targetRatioVal) / cabRatioFactor));
    } else if (baseType === 'area') {
      const targetAreaSqm = baseVal;
      const hM = Math.sqrt(targetAreaSqm / targetRatioVal);
      rows = Math.max(1, Math.round((hM * 1000) / cabHeightMm));
      cols = Math.max(1, Math.round((rows * targetRatioVal) / cabRatioFactor));
    } else if (baseType === 'cols') {
      cols = Math.max(1, Math.round(baseVal));
      rows = Math.max(1, Math.round((cols * cabRatioFactor) / targetRatioVal));
    }
  }

  // Real physical dimensions
  const realWidthMm = cols * cabWidthMm;
  const realHeightMm = rows * cabHeightMm;
  const realWidthM = realWidthMm / 1000;
  const realHeightM = realHeightMm / 1000;
  const realAreaSqm = realWidthM * realHeightM;
  const diagonalM = Math.sqrt(realWidthM * realWidthM + realHeightM * realHeightM);
  const diagonalInch = diagonalM * 39.3701;

  // Real pixel resolution
  const pixelWidth = cols * cabPixelW;
  const pixelHeight = rows * cabPixelH;
  const totalPixels = pixelWidth * pixelHeight;
  const megaPixels = totalPixels / 1000000;

  // Aspect ratio calculations
  const ratio = simplifyRatio(pixelWidth, pixelHeight);
  const physicalRatio = simplifyRatio(realWidthMm, realHeightMm);
  const standardRatioComparison = findClosestStandardRatio(pixelWidth, pixelHeight);

  // Electrical & Power Calculations
  const maxPowerPerSqm = preset.maxPowerPerSqm || 700;
  const typicalPowerPerSqm = preset.typicalPowerPerSqm || 240;

  const totalMaxWatts = Math.round(realAreaSqm * maxPowerPerSqm);
  const totalTypicalWatts = Math.round(realAreaSqm * typicalPowerPerSqm);
  const totalMaxKW = (totalMaxWatts / 1000).toFixed(2);
  const totalTypicalKW = (totalTypicalWatts / 1000).toFixed(2);

  // Current at 220V Single-Phase (Power Factor ~ 0.9)
  const current1Phase220V = (totalMaxWatts / (220 * 0.9)).toFixed(1);
  // Current at 380V Three-Phase (P / (sqrt(3) * 380 * 0.9))
  const current3Phase380V = (totalMaxWatts / (Math.sqrt(3) * 380 * 0.9)).toFixed(1);

  // Recommended breaker (1.25x safety factor)
  const recommendedBreaker1P = Math.ceil((totalMaxWatts / (220 * 0.9) * 1.25) / 5) * 5;
  const recommendedBreaker3P = Math.ceil((totalMaxWatts / (Math.sqrt(3) * 380 * 0.9) * 1.25) / 5) * 5;

  // NovaStar Controller / Sending Card Capacity (NovaStar Gigabit Port = 650,000 pixels @ 60Hz 8-bit, Maks 12 Cabinet / Tarikan)
  const GIGABIT_PORT_CAPACITY = 650000;
  const MAX_CABINETS_PER_PORT = 12;
  const totalCabinets = cols * rows;

  const portsByPixels = Math.ceil(totalPixels / GIGABIT_PORT_CAPACITY);
  const portsByCabinets = Math.ceil(totalCabinets / MAX_CABINETS_PER_PORT);
  const portsRequired = Math.max(portsByPixels, portsByCabinets);

  // Recommended single-unit NovaStar controllers matching required ports & total resolution
  const matchingModels = CONTROLLER_MODELS.filter(ctrl => ctrl.ports >= portsRequired && ctrl.capacity >= totalPixels);
  const recommendedControllers = matchingModels.length > 0 
    ? matchingModels.slice(0, 4) 
    : [CONTROLLER_MODELS[CONTROLLER_MODELS.length - 1]];

  // Multi-Unit Cascading Solutions for Rental / Event Inventory Setup
  const cascadeInventory = [
    { baseName: 'NovaStar VX1000', portsPerUnit: 10, capPerUnit: 6500000, type: 'VX All-in-One' },
    { baseName: 'NovaStar VX16s', portsPerUnit: 16, capPerUnit: 10400000, type: 'VX All-in-One' },
    { baseName: 'NovaStar VX600', portsPerUnit: 6, capPerUnit: 3900000, type: 'VX All-in-One' },
    { baseName: 'NovaStar VX400', portsPerUnit: 4, capPerUnit: 2600000, type: 'VX All-in-One' },
    { baseName: 'NovaStar MCTRL660 PRO', portsPerUnit: 6, capPerUnit: 3900000, type: 'MCTRL Master' },
    { baseName: 'NovaStar MCTRL4K', portsPerUnit: 16, capPerUnit: 10400000, type: 'MCTRL 4K' }
  ];

  const cascadeOptions = cascadeInventory.map(item => {
    const qtyByPorts = Math.ceil(portsRequired / item.portsPerUnit);
    const qtyByPixels = Math.ceil(totalPixels / item.capPerUnit);
    const qty = Math.max(1, Math.max(qtyByPorts, qtyByPixels));
    const totalPorts = qty * item.portsPerUnit;
    const totalCap = qty * item.capPerUnit;
    return {
      name: `${qty}× ${item.baseName}`,
      qty,
      baseName: item.baseName,
      type: item.type,
      totalPorts,
      portsPerUnit: item.portsPerUnit,
      totalCapacity: totalCap,
      isMultiUnit: qty > 1,
      description: qty > 1 
        ? `${qty} Unit Cascaded via Loop & NovaLCT (${totalPorts} Port Total)`
        : `1 Unit Standalone (${totalPorts} Port LAN)`
    };
  }).filter(opt => opt.qty <= 6);

  // Viewing Distances
  const minViewingDist = (pitch * 1.0).toFixed(1); // 1m per 1mm pitch
  const optimalViewingDistMin = (pitch * 2.0).toFixed(1);
  const optimalViewingDistMax = (pitch * 3.5).toFixed(1);

  // Total Weight Estimation
  const weightPerSqm = preset.weightPerSqm || 25;
  const totalWeightKg = Math.round(realAreaSqm * weightPerSqm);
  const weightPerCabinetKg = (totalWeightKg / (cols * rows)).toFixed(1);

  // Difference from requested dimensions if mode was 'dimension'
  let requestedDiff = null;
  if (params.mode === 'dimension') {
    const reqW = params.targetWidth || 5;
    const reqH = params.targetHeight || 3;
    requestedDiff = {
      widthDiffM: (realWidthM - reqW).toFixed(3),
      heightDiffM: (realHeightM - reqH).toFixed(3),
      widthDiffPercent: (((realWidthM - reqW) / reqW) * 100).toFixed(1),
      heightDiffPercent: (((realHeightM - reqH) / reqH) * 100).toFixed(1)
    };
  }

  // Magnimage EC90 Optimizer (Max 8.3M Pixels)
  const ec90Optimizer = calculateEC90Optimizer(pixelWidth, pixelHeight);

  return {
    pitch,
    pitchName: preset.name,
    category: preset.category,
    brightness: preset.typicalBrightness,
    cabinet: {
      widthMm: cabWidthMm,
      heightMm: cabHeightMm,
      pixelW: cabPixelW,
      pixelH: cabPixelH,
      cols,
      rows,
      total: cols * rows,
      weightPerCabinetKg
    },
    realDimensions: {
      widthM: realWidthM.toFixed(3),
      heightM: realHeightM.toFixed(3),
      widthMm: realWidthMm,
      heightMm: realHeightMm,
      areaSqm: realAreaSqm.toFixed(2),
      diagonalM: diagonalM.toFixed(2),
      diagonalInch: diagonalInch.toFixed(1),
      requestedDiff
    },
    resolution: {
      width: pixelWidth,
      height: pixelHeight,
      totalPixels,
      megaPixels: megaPixels.toFixed(3),
      totalPixelsFormatted: totalPixels.toLocaleString('id-ID')
    },
    ec90Optimizer,
    aspectRatio: {
      ratioText: ratio.text,
      decimalText: ratio.decimalText,
      decimal: ratio.decimal,
      standardComparison: standardRatioComparison,
      physicalRatioText: physicalRatio.text
    },
    power: {
      maxWatts: totalMaxWatts,
      typicalWatts: totalTypicalWatts,
      maxKW: totalMaxKW,
      typicalKW: totalTypicalKW,
      current1Phase220V,
      current3Phase380V,
      recommendedBreaker1P,
      recommendedBreaker3P
    },
    controller: {
      portsRequired,
      portCapacity: GIGABIT_PORT_CAPACITY,
      maxCabinetsPerPort: MAX_CABINETS_PER_PORT,
      portsByPixels,
      portsByCabinets,
      portLoadPercent: ((totalPixels / (portsRequired * GIGABIT_PORT_CAPACITY)) * 100).toFixed(1),
      recommendedModels: recommendedControllers,
      cascadeOptions
    },
    ergonomics: {
      minViewingDist,
      optimalViewingDistMin,
      optimalViewingDistMax,
      totalWeightKg
    }
  };
}

/**
 * Magnimage EC90 Optimizer (Downscaler)
 * Calculates optimal downscale resolution for DisplayPort 1.2 link (Max 8.3M Pixels)
 * Locking exact aspect ratio & ensuring Width and Height are divisible by 8.
 * @param {number} nativeWidth 
 * @param {number} nativeHeight 
 */
export function calculateEC90Optimizer(nativeWidth, nativeHeight) {
  const MAX_PIXELS = 8300000;
  const totalPixels = nativeWidth * nativeHeight;

  // Condition A: If Native Total Pixels <= 8,300,000
  if (totalPixels <= MAX_PIXELS) {
    return {
      isSafe: true,
      maxPixels: MAX_PIXELS,
      nativeWidth,
      nativeHeight,
      totalPixels,
      targetWidth: nativeWidth,
      targetHeight: nativeHeight,
      targetPixels: totalPixels,
      scalePercent: '100.0',
      message: 'Safe for 1 Cable DP (No Downscale Needed)'
    };
  }

  // Condition B: If Native Total Pixels > 8,300,000
  const nativeRatio = nativeWidth / nativeHeight;
  const maxTinggi = Math.floor(Math.sqrt(MAX_PIXELS / nativeRatio));

  let targetLebar = 0;
  let targetTinggi = 0;

  for (let h = Math.floor(maxTinggi / 8) * 8; h > 0; h -= 8) {
    let w = h * nativeRatio;
    if (Math.abs(w % 1) < 0.0001 && Math.round(w) % 8 === 0) {
      targetTinggi = h;
      targetLebar = Math.round(w);
      break;
    }
  }

  // Fallback if no clean integer is found
  if (targetTinggi === 0 || targetLebar === 0) {
    let bestH = Math.floor(maxTinggi / 8) * 8;
    let bestW = Math.floor((bestH * nativeRatio) / 8) * 8;
    while (bestW * bestH > MAX_PIXELS && bestH > 8) {
      bestH -= 8;
      bestW = Math.floor((bestH * nativeRatio) / 8) * 8;
    }
    targetTinggi = bestH;
    targetLebar = bestW;
  }

  const targetPixels = targetLebar * targetTinggi;
  const scalePercent = ((targetPixels / totalPixels) * 100).toFixed(1);

  return {
    isSafe: false,
    maxPixels: MAX_PIXELS,
    nativeWidth,
    nativeHeight,
    totalPixels,
    targetWidth: targetLebar,
    targetHeight: targetTinggi,
    targetPixels,
    scalePercent,
    message: 'Downscale Required (> 8.3M Pixels)'
  };
}
