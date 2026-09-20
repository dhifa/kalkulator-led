/**
 * LED Videotron Pro Suite - Main Application Controller
 */

import { LED_PITCH_PRESETS, CABINET_PRESETS } from './presets.js';
import { calculateVideotron, getRatioRecommendations } from './calculator.js';
import { TestCardEngine } from './testcard-engine.js';
import { VideoTestGenerator } from './video-generator.js';
import { CablingDiagramVisualizer } from './cabling-diagram.js';

// Application State
const state = {
  mode: 'dimension', // 'dimension' | 'ratio' | 'cabinet' | 'resolution'
  pitchId: 'p2.6',
  cabinetTypeId: 'cab-500x500',
  targetWidth: 5.0,
  targetHeight: 3.0,
  cabinetCols: 10,
  cabinetRows: 6,
  targetPixelW: 1920,
  targetPixelH: 1152,

  // Ratio Mode Parameters
  targetRatio: '16:9',
  customRatioW: 16,
  customRatioH: 9,
  ratioBaseType: 'width', // 'width' | 'height' | 'area' | 'cols'
  ratioBaseValue: 6.0,
  
  // Custom cabinet if selected
  customCabW: 500,
  customCabH: 500,

  // Test card options
  patternType: 'smpte',
  showCabinetGrid: true,
  showSafeZones: false,
  showCheckerboard: false,
  showCenterCircle: false,
  showInfoBadge: true,
  showMovingBar: true,
  showDigitalClock: true,
  motionMode: 'radar-pulse', // 'radar-pulse' | 'rotating-radar' | 'horizontal-bar' | 'vertical-bar' | 'diagonal-bar' | 'bouncing-ball'

  // Custom Logo Options
  showLogo: true,
  logoPosition: 'top-right', // 'top-right' | 'top-left' | 'badge' | 'center'
  logoScale: 1.0,

  // Custom 5-Line Badge Options
  badgeCustom: {
    companyTitle: 'PT. TRANS TECHNOLOGY INDONESIA (TTI)',
    projectName: 'LED SCREEN TECHNICAL CALIBRATION CARD',
    resText: '',
    specsText: '',
    footerText: 'TTI Engineering Team • Calibration Passed',
    position: 'bottom-center'
  },

  // Cabling options
  activePortFilter: 'all',

  // Current calculation output
  calcData: null
};

// Global Engines
let testCardEngine = null;
let videoGenerator = null;
let cablingVisualizer = null;
let fullscreenEngine = null;
let fullscreenVideo = null;
let currentLogoImg = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initPresetsUI();
  initEngines();
  loadDefaultLogo();
  bindEventListeners();
  recalculateAll();
});

/**
 * Load default TTI logo
 * @param {'horizontal' | 'icon'} type
 */
function loadDefaultLogo(type = 'horizontal') {
  const img = new Image();
  const filePath = type === 'icon' ? 'assets/logo-icon.png' : 'assets/logo-horizontal.png';
  const labelText = type === 'icon' ? 'Logo TTI Icon (Square)' : 'Logo TTI Full (Horizontal)';

  img.onload = () => {
    currentLogoImg = img;
    if (testCardEngine) testCardEngine.setLogo(img);
    if (fullscreenEngine) fullscreenEngine.setLogo(img);

    const previewThumb = document.getElementById('logoPreviewThumb');
    if (previewThumb) previewThumb.src = filePath;
    const statusText = document.getElementById('logoStatusText');
    if (statusText) statusText.textContent = labelText;

    state.showLogo = true;
    const toggle = document.getElementById('toggleShowLogo');
    if (toggle) toggle.checked = true;

    updateTestCardCanvas();
  };
  img.src = filePath;
}

/**
 * Initialize Preset Selectors in UI
 */
function initPresetsUI() {
  // 1. Populate Pitch Select Grid (Unilumin P2.6 Series Only)
  const pitchContainer = document.getElementById('pitchSelectContainer');
  pitchContainer.innerHTML = '';

  LED_PITCH_PRESETS.forEach(preset => {
    const isChecked = preset.id === state.pitchId;
    const item = document.createElement('label');
    item.className = 'pitch-card-option';
    item.innerHTML = `
      <input type="radio" name="pitchSelection" value="${preset.id}" ${isChecked ? 'checked' : ''}>
      <div class="pitch-card-box">
        <span class="pitch-title">${preset.name}</span>
        <span class="pitch-sub" style="color: var(--accent-cyan); font-size: 0.68rem;">UNILUMIN • ${preset.pitch}mm (${preset.cabinetPixels.width}×${preset.cabinetPixels.height}px)</span>
      </div>
    `;
    pitchContainer.appendChild(item);
  });

  const activePreset = LED_PITCH_PRESETS.find(p => p.id === state.pitchId) || LED_PITCH_PRESETS[0];
  const catEl = document.getElementById('selectedPitchCategory');
  if (catEl && activePreset) {
    catEl.textContent = activePreset.description;
  }

  // 2. Populate Cabinet Types Dropdown
  const cabinetSelect = document.getElementById('selectCabinetType');
  cabinetSelect.innerHTML = '';
  CABINET_PRESETS.forEach(cab => {
    const opt = document.createElement('option');
    opt.value = cab.id;
    opt.textContent = cab.name;
    if (cab.id === state.cabinetTypeId) opt.selected = true;
    cabinetSelect.appendChild(opt);
  });

  // 3. Render Initial Ratio Recommendations
  renderRatioRecommendations();
}

/**
 * Render quick exact ratio match chips
 */
function renderRatioRecommendations() {
  const container = document.getElementById('ratioExactPresetsContainer');
  if (!container) return;

  const targetRatio = document.getElementById('selectTargetRatio')?.value || '16:9';
  const selectedCab = CABINET_PRESETS.find(c => c.id === state.cabinetTypeId) || CABINET_PRESETS[0];
  const cabW = selectedCab.width;
  const cabH = selectedCab.height;

  const list = getRatioRecommendations(targetRatio, cabW, cabH);
  container.innerHTML = list.slice(0, 8).map(item => `
    <button type="button" class="chip-btn ${item.isExact ? 'chip-btn-active' : ''}" data-ratiocols="${item.cols}" data-ratiorows="${item.rows}" data-ratiow="${item.widthM}" data-ratioh="${item.heightM}" style="${item.isExact ? 'border-color: var(--accent-cyan); color: var(--accent-cyan); font-weight: 700; background: rgba(0, 229, 255, 0.08);' : ''}">
      ${item.widthM} × ${item.heightM} m (${item.cols}×${item.rows} cab${item.isExact ? ' ⭐' : ''})
    </button>
  `).join('');

  container.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = parseFloat(btn.getAttribute('data-ratiow'));
      const h = parseFloat(btn.getAttribute('data-ratioh'));
      const cols = parseInt(btn.getAttribute('data-ratiocols'), 10);
      const baseType = document.getElementById('selectRatioBaseType')?.value || 'width';
      const baseInput = document.getElementById('inputRatioBaseValue');
      if (baseInput) {
        if (baseType === 'width') baseInput.value = w;
        else if (baseType === 'height') baseInput.value = h;
        else if (baseType === 'area') baseInput.value = +(w * h).toFixed(2);
        else if (baseType === 'cols') baseInput.value = cols;
      }
      recalculateAll();
    });
  });
}

/**
 * Initialize Canvas & Visualization Engines
 */
function initEngines() {
  const mainCanvas = document.getElementById('testcardCanvas');
  if (mainCanvas) {
    testCardEngine = new TestCardEngine(mainCanvas);
    videoGenerator = new VideoTestGenerator(mainCanvas, testCardEngine);
    videoGenerator.startAnimation();
  }

  const cablingContainer = document.getElementById('cablingDiagramContainer');
  if (cablingContainer) {
    cablingVisualizer = new CablingDiagramVisualizer(
      cablingContainer,
      stats => {
        updateCustomCablingUI(stats);
      },
      zoom => {
        const zoomText = document.getElementById('cablingZoomPercentText');
        if (zoomText) zoomText.textContent = `${Math.round(zoom * 100)}%`;
      }
    );
  }

  const fsCanvas = document.getElementById('fullscreenCanvas');
  if (fsCanvas) {
    fullscreenEngine = new TestCardEngine(fsCanvas);
    fullscreenVideo = new VideoTestGenerator(fsCanvas, fullscreenEngine);
  }
}

/**
 * Recalculate everything and update UI components
 */
function recalculateAll() {
  // Read inputs according to active mode
  if (state.mode === 'dimension') {
    state.targetWidth = parseFloat(document.getElementById('inputTargetW').value) || 5.0;
    state.targetHeight = parseFloat(document.getElementById('inputTargetH').value) || 3.0;
  } else if (state.mode === 'ratio') {
    state.targetRatio = document.getElementById('selectTargetRatio')?.value || '16:9';
    state.customRatioW = parseFloat(document.getElementById('inputCustomRatioW')?.value) || 16;
    state.customRatioH = parseFloat(document.getElementById('inputCustomRatioH')?.value) || 9;
    state.ratioBaseType = document.getElementById('selectRatioBaseType')?.value || 'width';
    state.ratioBaseValue = parseFloat(document.getElementById('inputRatioBaseValue')?.value) || 6.0;
  } else if (state.mode === 'cabinet') {
    state.cabinetCols = parseInt(document.getElementById('inputCabinetCols').value, 10) || 10;
    state.cabinetRows = parseInt(document.getElementById('inputCabinetRows').value, 10) || 6;
  } else if (state.mode === 'resolution') {
    state.targetPixelW = parseInt(document.getElementById('inputPixelW').value, 10) || 1920;
    state.targetPixelH = parseInt(document.getElementById('inputPixelH').value, 10) || 1080;
  }

  // Get cabinet dimension
  const selectedCab = CABINET_PRESETS.find(c => c.id === state.cabinetTypeId) || CABINET_PRESETS[0];
  let cabinetSize = { width: selectedCab.width, height: selectedCab.height };

  if (state.cabinetTypeId === 'cab-custom') {
    cabinetSize.width = parseFloat(document.getElementById('inputCustomCabW').value) || 500;
    cabinetSize.height = parseFloat(document.getElementById('inputCustomCabH').value) || 500;
  }

  // Execute Math Calculation
  state.calcData = calculateVideotron({
    mode: state.mode,
    targetWidth: state.targetWidth,
    targetHeight: state.targetHeight,
    cabinetCols: state.cabinetCols,
    cabinetRows: state.cabinetRows,
    targetPixelW: state.targetPixelW,
    targetPixelH: state.targetPixelH,
    targetRatio: state.targetRatio,
    customRatioW: state.customRatioW,
    customRatioH: state.customRatioH,
    ratioBaseType: state.ratioBaseType,
    ratioBaseValue: state.ratioBaseValue,
    pitchId: state.pitchId,
    cabinetSize
  });

  // Auto-sync badge inputs if left default
  syncBadgeFieldsWithCalc(false);

  // Update UI Stats & Displays
  updateResultsUI(state.calcData);

  // Update Test Card Canvas
  updateTestCardCanvas();

  // Update Cabling Diagram
  updateCablingDiagram();
}

/**
 * Sync custom badge inputs with calculation data
 */
function syncBadgeFieldsWithCalc(force = false) {
  if (!state.calcData) return;
  const { resolution, aspectRatio, pitchName, realDimensions, cabinet } = state.calcData;

  const autoRes = `${resolution.width} × ${resolution.height} PX  •  ${aspectRatio.ratioText} (${aspectRatio.decimalText})`;
  const autoSpecs = `${pitchName}  |  ${realDimensions.widthM}m × ${realDimensions.heightM}m (${realDimensions.areaSqm} m²)  |  ${cabinet.cols}×${cabinet.rows} (${cabinet.total} Cabs)`;

  const resInput = document.getElementById('inputBadgeResolution');
  const specsInput = document.getElementById('inputBadgeSpecs');

  if (resInput && (force || !state.badgeCustom.resText)) {
    resInput.value = autoRes;
    state.badgeCustom.resText = autoRes;
  }

  if (specsInput && (force || !state.badgeCustom.specsText)) {
    specsInput.value = autoSpecs;
    state.badgeCustom.specsText = autoSpecs;
  }
}

/**
 * Update UI result cards with calculation output
 */
function updateResultsUI(calc) {
  // 1. Hero Resolution Card
  document.getElementById('badgePitchTag').textContent = `${calc.pitchName}`;
  document.getElementById('badgeCabinetCount').textContent = `${calc.cabinet.total} Cabinet (${calc.cabinet.cols}×${calc.cabinet.rows})`;
  document.getElementById('badgeTotalPixels').textContent = `${calc.resolution.totalPixelsFormatted} Pixels (${calc.resolution.megaPixels} MP)`;
  document.getElementById('resPixelDisplay').textContent = `${calc.resolution.width} × ${calc.resolution.height}`;
  
  document.getElementById('aspectRatioVal').textContent = calc.aspectRatio.ratioText;
  document.getElementById('aspectDecimalVal').textContent = `(${calc.aspectRatio.decimalText})`;

  const stdComp = calc.aspectRatio.standardComparison;
  let ratioComment = `Rasio Layar: <strong>${calc.aspectRatio.ratioText} (${calc.aspectRatio.decimalText})</strong>. `;
  if (stdComp) {
    if (stdComp.fitStatus === 'exact') {
      ratioComment += `Sempurna 100% cocok dengan format standar <strong>${stdComp.standard.label}</strong> (Bebas distorsi / tanpa crop).`;
    } else if (stdComp.fitStatus === 'wider') {
      ratioComment += `Mendekati standar <strong>${stdComp.standard.label}</strong> — Layar lebih lebar ${stdComp.diffPercent}% (Letterbox pada video 16:9).`;
    } else {
      ratioComment += `Mendekati standar <strong>${stdComp.standard.label}</strong> — Layar lebih tinggi ${Math.abs(stdComp.diffPercent)}% (Pillarbox/crop pada video 16:9).`;
    }
  }
  document.getElementById('ratioComparisonText').innerHTML = ratioComment;

  // Magnimage EC90 Optimizer Card Update
  const ec90 = calc.ec90Optimizer;
  if (ec90) {
    const badgeEl = document.getElementById('ec90StatusBadge');
    const safeView = document.getElementById('ec90SafeView');
    const downscaleView = document.getElementById('ec90DownscaleView');
    const nativePixEl = document.getElementById('ec90NativePixelText');

    if (nativePixEl) {
      nativePixEl.textContent = calc.resolution.totalPixelsFormatted;
    }

    if (ec90.isSafe) {
      // Condition A: Native Total Pixels <= 8,300,000
      if (badgeEl) {
        badgeEl.className = 'pill pill-green';
        badgeEl.textContent = 'Safe for 1 Cable DP (No Downscale Needed)';
      }
      if (safeView) safeView.style.display = 'block';
      if (downscaleView) downscaleView.style.display = 'none';
    } else {
      // Condition B: Native Total Pixels > 8,300,000
      if (badgeEl) {
        badgeEl.className = 'pill pill-amber';
        badgeEl.textContent = 'Downscale Required (> 8.3M Pixels)';
      }
      if (safeView) safeView.style.display = 'none';
      if (downscaleView) downscaleView.style.display = 'block';

      const targetResEl = document.getElementById('ec90TargetResDisplay');
      if (targetResEl) targetResEl.textContent = `${ec90.targetWidth} × ${ec90.targetHeight}`;

      const targetPixEl = document.getElementById('ec90TargetPixelDisplay');
      if (targetPixEl) targetPixEl.textContent = `${ec90.targetPixels.toLocaleString('id-ID')} Pixels`;

      const scalePctEl = document.getElementById('ec90ScalePercentDisplay');
      if (scalePctEl) scalePctEl.textContent = `${ec90.scalePercent}% Scale`;

      const ratioEl = document.getElementById('ec90RatioDisplay');
      if (ratioEl) ratioEl.textContent = `${calc.aspectRatio.ratioText} (${calc.aspectRatio.decimalText})`;

      const edidEl = document.getElementById('ec90EdidText');
      if (edidEl) edidEl.textContent = `${ec90.targetWidth} × ${ec90.targetHeight}`;
    }
  }

  // 2. Physical Dimension Card
  document.getElementById('realDimensionsDisplay').textContent = `${calc.realDimensions.widthM} × ${calc.realDimensions.heightM} m`;
  document.getElementById('realAreaBadge').textContent = `${calc.realDimensions.areaSqm} m²`;
  document.getElementById('valRealMm').textContent = `${calc.realDimensions.widthMm} × ${calc.realDimensions.heightMm} mm`;
  document.getElementById('valDiagonal').textContent = `${calc.realDimensions.diagonalM} m (${calc.realDimensions.diagonalInch}")`;

  if (calc.realDimensions.requestedDiff) {
    const diff = calc.realDimensions.requestedDiff;
    if (Math.abs(diff.widthDiffM) < 0.001 && Math.abs(diff.heightDiffM) < 0.001) {
      document.getElementById('dimensionDifferenceSubtext').textContent = 'Persis sesuai ukuran diminta (100% presisi susunan cabinet).';
    } else {
      document.getElementById('dimensionDifferenceSubtext').textContent = `Disesuaikan dengan kelipatan modul cabinet (${diff.widthDiffM >= 0 ? '+' : ''}${diff.widthDiffM}m L, ${diff.heightDiffM >= 0 ? '+' : ''}${diff.heightDiffM}m T).`;
    }
  } else {
    document.getElementById('dimensionDifferenceSubtext').textContent = `Total luas bidang visual videotron: ${calc.realDimensions.areaSqm} m²`;
  }

  // 3. Cabinet & Grid Card
  document.getElementById('totalCabinetBadge').textContent = `${calc.cabinet.total} Pcs`;
  document.getElementById('cabinetGridDisplay').textContent = `${calc.cabinet.cols} Kolom × ${calc.cabinet.rows} Baris`;
  document.getElementById('cabinetSpecSubtext').textContent = `Cabinet ${calc.cabinet.widthMm} × ${calc.cabinet.heightMm} mm (Resolusi/cab: ${calc.cabinet.pixelW} × ${calc.cabinet.pixelH} px).`;
  document.getElementById('valTotalCab').textContent = `${calc.cabinet.total} Unit`;
  document.getElementById('valTotalWeight').textContent = `~${calc.ergonomics.totalWeightKg} kg (~${calc.cabinet.weightPerCabinetKg} kg/cab)`;

  // 4. Power & Electrical Card
  document.getElementById('powerMaxBadge').textContent = `Max: ${calc.power.maxKW} kW`;
  document.getElementById('powerDisplay').textContent = `${calc.power.typicalKW} kW / ${calc.power.maxKW} kW`;
  document.getElementById('valCurrent1P').textContent = `${calc.power.current1Phase220V} A (MCB ${calc.power.recommendedBreaker1P}A)`;
  document.getElementById('valCurrent3P').textContent = `${calc.power.current3Phase380V} A (MCB ${calc.power.recommendedBreaker3P}A)`;

  // 5. NovaStar Processor & Sending Card
  document.getElementById('portsBadge').textContent = `${calc.controller.portsRequired} Port LAN`;
  const primaryController = calc.controller.recommendedModels[0];
  document.getElementById('controllerNameDisplay').textContent = primaryController ? primaryController.name : 'NovaStar VX Series';
  document.getElementById('controllerPortSubtext').textContent = `Membutuhkan ${calc.controller.portsRequired} Port Gigabit Ethernet NovaStar (${calc.resolution.totalPixelsFormatted} Pixels, Maks 12 Cabinet per tarikan kabel).`;
  document.getElementById('portLoadPercentText').textContent = `${calc.controller.portLoadPercent}% Kapasitas Total Port (${calc.controller.portsRequired} Port Gigabit)`;
  document.getElementById('portLoadBarFill').style.width = `${Math.min(100, calc.controller.portLoadPercent)}%`;

  // Render Single-Unit NovaStar model options chips
  const altContainer = document.getElementById('controllerAlternativeList');
  if (altContainer && calc.controller.recommendedModels) {
    altContainer.innerHTML = calc.controller.recommendedModels.map(m => `
      <span class="pill" style="font-size: 0.68rem; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.25); color: #e2e8f0; padding: 0.2rem 0.45rem;" title="${m.maxRes}">
        <span style="color: var(--accent-cyan); font-weight: 700;">[${m.series}]</span> ${m.name} <span style="opacity: 0.7;">(${m.ports} Port)</span>
      </span>
    `).join('');
  }

  // Render Multi-Unit Cascading options (e.g. 2x VX1000, 2x VX16s, 2x VX600)
  const cascadeContainer = document.getElementById('cascadeAlternativeList');
  if (cascadeContainer && calc.controller.cascadeOptions) {
    cascadeContainer.innerHTML = calc.controller.cascadeOptions.map(cas => `
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.03); border: 1px solid ${cas.isMultiUnit ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)'}; border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.72rem;">
        <div>
          <span style="color: ${cas.isMultiUnit ? 'var(--accent-cyan)' : '#fff'}; font-weight: 700;">${cas.name}</span>
          <span style="color: var(--text-muted); font-size: 0.66rem; margin-left: 0.3rem;">(${cas.totalPorts} Port Total / ${(cas.totalCapacity / 1000000).toFixed(1)}M px)</span>
        </div>
        <span class="pill ${cas.isMultiUnit ? 'pill-magenta' : 'pill-green'}" style="font-size: 0.62rem; padding: 0.1rem 0.35rem;">
          ${cas.isMultiUnit ? `${cas.qty} Unit Cascade` : 'Single'}
        </span>
      </div>
    `).join('');
  }

  // Studio Header Tags
  document.getElementById('studioResTag').textContent = `${calc.resolution.width} × ${calc.resolution.height} PX`;
  document.getElementById('studioAspectTag').textContent = `${calc.aspectRatio.ratioText} Ratio (${calc.aspectRatio.decimalText})`;

  updatePortFilterOptions(calc.controller.portsRequired);
}

/**
 * Get current test card rendering options
 */
function getTestCardOptions() {
  return {
    patternType: state.patternType,
    showCabinetGrid: state.showCabinetGrid,
    showSafeZones: state.showSafeZones,
    showCheckerboard: state.showCheckerboard,
    showCenterCircle: state.showCenterCircle,
    showInfoBadge: state.showInfoBadge,
    showMovingBar: state.showMovingBar,
    showDigitalClock: state.showDigitalClock,
    motionMode: state.motionMode,
    showLogo: state.showLogo,
    logoPosition: state.logoPosition,
    logoScale: state.logoScale,
    badgeCustom: state.badgeCustom
  };
}

/**
 * Update Canvas Test Card
 */
function updateTestCardCanvas() {
  if (!videoGenerator || !state.calcData) return;

  const options = getTestCardOptions();
  videoGenerator.setParams(state.calcData, options);

  if (!videoGenerator.isPlaying) {
    testCardEngine.render(state.calcData, options);
  }
}

/**
 * Update Cabling Diagram
 */
function updateCablingDiagram() {
  if (!cablingVisualizer || !state.calcData) return;
  
  // Update matrix dimension badge
  const matrixBadge = document.getElementById('cablingMatrixBadge');
  if (matrixBadge) {
    matrixBadge.textContent = `${state.calcData.cabinet.cols} Kolom × ${state.calcData.cabinet.rows} Baris`;
  }
  const areaBadge = document.getElementById('cablingAreaBadge');
  if (areaBadge) {
    areaBadge.textContent = `${state.calcData.cabinet.total} Cabinet (~${state.calcData.realDimensions.areaSqm} m²)`;
  }

  cablingVisualizer.render(state.calcData, {
    activePort: state.activePortFilter,
    showDataFlow: true
  });
  if (cablingVisualizer.mode === 'custom') {
    updateCustomCablingUI(cablingVisualizer.getCustomStats());
  }
}

/**
 * Update UI controls for Custom Cabling Mode (Palette & Progress)
 */
function updateCustomCablingUI(stats) {
  if (!stats) return;
  const statusEl = document.getElementById('customProgressStatus');
  if (statusEl) {
    const pct = stats.totalCabinets > 0 ? Math.round((stats.totalAssigned / stats.totalCabinets) * 100) : 0;
    statusEl.innerHTML = `<span style="color: ${stats.remainingCabinets === 0 ? 'var(--accent-green)' : 'var(--accent-cyan)'};">${stats.totalAssigned} / ${stats.totalCabinets} Cabinet Terpasang (${pct}%)</span>`;
  }

  const portBtnGroup = document.getElementById('customPortButtonGroup');
  if (!portBtnGroup) return;

  const buttonsHtml = stats.portDetails.map(pd => {
    const isActive = pd.port === stats.activePort;
    const isOver = pd.isOverloaded;
    const isExtraEmpty = pd.port > (stats.portsRequired || 1) && pd.cabCount === 0;

    return `
      <div class="custom-port-chip-wrapper" style="display: inline-flex; align-items: center; position: relative;">
        <button type="button" class="btn btn-sm custom-port-select-btn" data-port="${pd.port}"
          style="font-size: 0.75rem; padding: 0.3rem 0.65rem; border-radius: 4px; display: flex; align-items: center; gap: 0.35rem; cursor: pointer;
                 background: ${isActive ? 'rgba(0, 229, 255, 0.22)' : 'rgba(255,255,255,0.04)'};
                 border: 1px solid ${isActive ? pd.color : 'rgba(255,255,255,0.1)'};
                 color: ${isActive ? '#fff' : 'var(--text-secondary)'};">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${pd.color}; display: inline-block;"></span>
          <strong>Port ${pd.port}</strong>
          <span style="font-size: 0.68rem; color: ${isOver ? '#f43f5e' : (isActive ? pd.color : 'var(--text-muted)')}; font-weight: ${isOver ? 'bold' : 'normal'};">
            (${pd.cabCount}/12 Cab • ${pd.loadPercent}%)${pd.exceedsCabinetLimit ? ' ⚠️ >12' : (isOver ? ' ⚠️ OVER' : '')}
          </span>
        </button>
        ${isExtraEmpty ? `
          <button type="button" class="btn-remove-port" data-remove-port="${pd.port}" title="Hapus Port ${pd.port}"
            style="background: transparent; border: none; color: #f43f5e; font-size: 0.75rem; cursor: pointer; padding: 0 0.25rem; margin-left: -0.2rem; opacity: 0.7;">
            ✕
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  const addBtnHtml = `
    <button type="button" class="btn btn-secondary btn-sm" id="btnInlineAddPort"
      style="font-size: 0.72rem; padding: 0.3rem 0.65rem; border-style: dashed; border-color: rgba(0, 229, 255, 0.4); color: var(--accent-cyan); cursor: pointer;"
      title="Tambah Tarikan / Port Kabel Baru">
      ➕ Tarikan Port ${stats.portDetails.length + 1}
    </button>
  `;

  portBtnGroup.innerHTML = buttonsHtml + addBtnHtml;

  // Attach click listeners to port buttons
  portBtnGroup.querySelectorAll('.custom-port-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const port = parseInt(btn.getAttribute('data-port'), 10);
      cablingVisualizer.setActiveCustomPort(port);
      updateCustomCablingUI(cablingVisualizer.getCustomStats());
    });
  });

  // Attach delete listeners to extra empty ports
  portBtnGroup.querySelectorAll('.btn-remove-port').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const port = parseInt(btn.getAttribute('data-remove-port'), 10);
      cablingVisualizer.removeCustomPort(port);
    });
  });

  // Inline Add Port Button Click
  document.getElementById('btnInlineAddPort')?.addEventListener('click', () => {
    cablingVisualizer.addNewCustomPort();
  });
}

/**
 * Update Port Filter dropdown options
 */
function updatePortFilterOptions(portsRequired) {
  const select = document.getElementById('selectPortFilter');
  if (!select) return;
  select.innerHTML = '<option value="all">Semua Port Controller</option>';
  for (let p = 1; p <= portsRequired; p++) {
    const opt = document.createElement('option');
    opt.value = String(p);
    opt.textContent = `Hanya Port ${p}`;
    if (state.activePortFilter === String(p)) opt.selected = true;
    select.appendChild(opt);
  }
}

/**
 * Bind all DOM Event Listeners
 */
function bindEventListeners() {
  // Navigation Tabs Switching
  const navTabs = document.querySelectorAll('#mainNavTabs .tab-btn');
  navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      navTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetViewId = btn.getAttribute('data-target');
      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
      const targetSec = document.getElementById(targetViewId);
      if (targetSec) targetSec.classList.add('active');

      if (targetViewId === 'tab-cabling') {
        updateCablingDiagram();
      }
      if (targetViewId === 'tab-testcard') {
        if (videoGenerator) videoGenerator.startAnimation();
      } else {
        if (videoGenerator) videoGenerator.stopAnimation();
      }
    });
  });

  // Action Buttons jumping to other tabs
  document.getElementById('btnGoToStudio')?.addEventListener('click', () => {
    document.getElementById('navTabTestcard')?.click();
  });
  document.getElementById('btnOpenTestStudio')?.addEventListener('click', () => {
    document.getElementById('navTabTestcard')?.click();
  });
  document.getElementById('btnViewCabling')?.addEventListener('click', () => {
    document.getElementById('navTabCabling')?.click();
  });

  // Mode Switcher Buttons
  const modeBtns = document.querySelectorAll('#calcModeGroup .mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.getAttribute('data-mode');

      document.getElementById('inputGroupDimension').style.display = state.mode === 'dimension' ? 'block' : 'none';
      const ratioGroup = document.getElementById('inputGroupRatio');
      if (ratioGroup) ratioGroup.style.display = state.mode === 'ratio' ? 'block' : 'none';
      document.getElementById('inputGroupCabinet').style.display = state.mode === 'cabinet' ? 'block' : 'none';
      document.getElementById('inputGroupResolution').style.display = state.mode === 'resolution' ? 'block' : 'none';

      if (state.mode === 'ratio') {
        renderRatioRecommendations();
      }

      recalculateAll();
    });
  });

  // Target Ratio Select Change
  document.getElementById('selectTargetRatio')?.addEventListener('change', e => {
    state.targetRatio = e.target.value;
    const isCustom = e.target.value === 'custom';
    const customRow = document.getElementById('ratioCustomInputsRow');
    if (customRow) customRow.style.display = isCustom ? 'flex' : 'none';
    renderRatioRecommendations();
    recalculateAll();
  });

  // Ratio Base Type Select Change
  document.getElementById('selectRatioBaseType')?.addEventListener('change', e => {
    state.ratioBaseType = e.target.value;
    const unitLabel = document.getElementById('ratioBaseUnitLabel');
    if (unitLabel) {
      if (e.target.value === 'width') unitLabel.textContent = 'Meter (L)';
      else if (e.target.value === 'height') unitLabel.textContent = 'Meter (T)';
      else if (e.target.value === 'area') unitLabel.textContent = 'm² (Luas)';
      else if (e.target.value === 'cols') unitLabel.textContent = 'Kolom';
    }
    recalculateAll();
  });

  // Numeric Inputs
  ['inputTargetW', 'inputTargetH', 'inputCabinetCols', 'inputCabinetRows', 'inputPixelW', 'inputPixelH', 'inputCustomCabW', 'inputCustomCabH', 'inputRatioBaseValue', 'inputCustomRatioW', 'inputCustomRatioH'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => recalculateAll());
      el.addEventListener('change', () => recalculateAll());
    }
  });

  // Quick Dimension Preset Chips
  document.querySelectorAll('.chip-btn[data-w]').forEach(chip => {
    chip.addEventListener('click', () => {
      const w = chip.getAttribute('data-w');
      const h = chip.getAttribute('data-h');
      document.getElementById('inputTargetW').value = w;
      document.getElementById('inputTargetH').value = h;
      if (state.mode !== 'dimension') {
        document.getElementById('modeBtnDimension')?.click();
      } else {
        recalculateAll();
      }
    });
  });

  // Pitch Selector Radio Change
  document.getElementById('pitchSelectContainer')?.addEventListener('change', e => {
    if (e.target.name === 'pitchSelection') {
      state.pitchId = e.target.value;
      const preset = LED_PITCH_PRESETS.find(p => p.id === state.pitchId);
      if (preset) {
        document.getElementById('selectedPitchCategory').textContent = `${preset.category.toUpperCase()} • ${preset.description}`;
      }
      recalculateAll();
    }
  });

  // Cabinet Type Select Change
  document.getElementById('selectCabinetType')?.addEventListener('change', e => {
    state.cabinetTypeId = e.target.value;
    const isCustom = state.cabinetTypeId === 'cab-custom';
    document.getElementById('customCabinetGroup').style.display = isCustom ? 'block' : 'none';
    recalculateAll();
  });

  // Pattern Preset Buttons in Studio
  const patternBtns = document.querySelectorAll('.pattern-btn');
  patternBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      patternBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.patternType = btn.getAttribute('data-pattern');
      videoGenerator.deadPixelMode = false;
      updateTestCardCanvas();
    });
  });

  // Dead Pixel Color Chips
  document.querySelectorAll('.chip-btn[data-solid]').forEach(chip => {
    chip.addEventListener('click', () => {
      patternBtns.forEach(b => b.classList.remove('active'));
      state.patternType = chip.getAttribute('data-solid');
      videoGenerator.deadPixelMode = false;
      updateTestCardCanvas();
    });
  });

  // Auto Color Cycle Button
  document.getElementById('btnAutoColorCycle')?.addEventListener('click', () => {
    patternBtns.forEach(b => b.classList.remove('active'));
    videoGenerator.toggleDeadPixelMode(true);
  });

  // Feature Overlay Toggles
  const bindToggle = (id, stateKey) => {
    document.getElementById(id)?.addEventListener('change', e => {
      state[stateKey] = e.target.checked;
      updateTestCardCanvas();
    });
  };

  bindToggle('toggleCabinetGrid', 'showCabinetGrid');
  bindToggle('toggleSafeZones', 'showSafeZones');
  bindToggle('toggleCheckerCorner', 'showCheckerboard');
  bindToggle('toggleCenterCircle', 'showCenterCircle');
  bindToggle('toggleInfoBadge', 'showInfoBadge');
  bindToggle('toggleMovingBar', 'showMovingBar');
  bindToggle('toggleDigitalClock', 'showDigitalClock');
  bindToggle('toggleShowLogo', 'showLogo');
  // Motion Mode Style Selector
  document.getElementById('selectMotionMode')?.addEventListener('change', e => {
    state.motionMode = e.target.value;
    updateTestCardCanvas();
  });

  // Trigger File Input from Button
  document.getElementById('btnTriggerUpload')?.addEventListener('click', () => {
    const fileInput = document.getElementById('inputLogoUpload');
    if (fileInput) {
      fileInput.value = ''; // Reset to allow re-selecting same file
      fileInput.click();
    }
  });

  // Logo Upload Handler
  document.getElementById('inputLogoUpload')?.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          currentLogoImg = img;
          testCardEngine.setLogo(img);
          if (fullscreenEngine) fullscreenEngine.setLogo(img);

          // Update UI Preview
          const previewThumb = document.getElementById('logoPreviewThumb');
          if (previewThumb) previewThumb.src = ev.target.result;
          const statusText = document.getElementById('logoStatusText');
          if (statusText) statusText.textContent = file.name;

          state.showLogo = true;
          document.getElementById('toggleShowLogo').checked = true;
          updateTestCardCanvas();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Choose Logo TTI Horizontal Full
  document.getElementById('btnLogoTTIFull')?.addEventListener('click', () => {
    loadDefaultLogo('horizontal');
  });

  // Choose Logo TTI Icon Square
  document.getElementById('btnLogoTTIIcon')?.addEventListener('click', () => {
    loadDefaultLogo('icon');
  });

  // Clear / Hide Logo
  document.getElementById('btnClearLogo')?.addEventListener('click', () => {
    state.showLogo = false;
    document.getElementById('toggleShowLogo').checked = false;
    const statusText = document.getElementById('logoStatusText');
    if (statusText) statusText.textContent = '(Logo Dinonaktifkan)';
    updateTestCardCanvas();
  });

  // Logo Position Select
  document.getElementById('selectLogoPosition')?.addEventListener('change', e => {
    state.logoPosition = e.target.value;
    updateTestCardCanvas();
  });

  // Logo Scale Slider
  document.getElementById('inputLogoScale')?.addEventListener('input', e => {
    state.logoScale = parseFloat(e.target.value) || 1.0;
    const scaleText = document.getElementById('logoScaleValText');
    if (scaleText) scaleText.textContent = `${Math.round(state.logoScale * 100)}%`;
    updateTestCardCanvas();
  });

  // Logo Quick Size Chips
  document.querySelectorAll('.chip-btn[data-logosize]').forEach(chip => {
    chip.addEventListener('click', () => {
      const scaleVal = parseFloat(chip.getAttribute('data-logosize')) || 1.0;
      state.logoScale = scaleVal;
      const slider = document.getElementById('inputLogoScale');
      if (slider) slider.value = String(scaleVal);
      const scaleText = document.getElementById('logoScaleValText');
      if (scaleText) scaleText.textContent = `${Math.round(scaleVal * 100)}%`;
      updateTestCardCanvas();
    });
  });

  // Custom Badge Inputs Binding
  const bindBadgeInput = (id, key) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', e => {
        state.badgeCustom[key] = e.target.value;
        updateTestCardCanvas();
      });
    }
  };

  bindBadgeInput('inputBadgeCompany', 'companyTitle');
  bindBadgeInput('inputBadgeProject', 'projectName');
  bindBadgeInput('inputBadgeResolution', 'resText');
  bindBadgeInput('inputBadgeSpecs', 'specsText');
  bindBadgeInput('inputBadgeFooter', 'footerText');

  document.getElementById('selectBadgePosition')?.addEventListener('change', e => {
    state.badgeCustom.position = e.target.value;
    updateTestCardCanvas();
  });

  document.getElementById('btnAutoSyncBadge')?.addEventListener('click', () => {
    syncBadgeFieldsWithCalc(true);
    updateTestCardCanvas();
  });

  // Play / Pause Animation
  const btnToggleAnim = document.getElementById('btnToggleAnim');
  btnToggleAnim?.addEventListener('click', () => {
    if (videoGenerator.isPlaying) {
      videoGenerator.stopAnimation();
      document.getElementById('animBtnText').textContent = 'Mulai Animasi';
      testCardEngine.render(state.calcData, getTestCardOptions());
    } else {
      videoGenerator.startAnimation();
      document.getElementById('animBtnText').textContent = 'Pause Animasi';
    }
  });

  // Download PNG Image (Full 1:1 Native Resolution Export)
  document.getElementById('btnDownloadPNG')?.addEventListener('click', () => {
    if (!testCardEngine || !state.calcData) return;
    const filename = `LED-Testcard_${state.calcData.resolution.width}x${state.calcData.resolution.height}_${state.calcData.pitchName.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    
    testCardEngine.downloadFullResImage(state.calcData, getTestCardOptions(), filename, 'image/png');
  });

  // Record & Download 60fps Video (up to 4K UHD)
  document.getElementById('btnRecordVideo')?.addEventListener('click', async () => {
    if (!videoGenerator || !state.calcData) return;
    const overlay = document.getElementById('recordingOverlay');
    const progressText = document.getElementById('recordProgressVal');
    const resBadge = document.getElementById('recordResBadge');

    const selectedRes = document.getElementById('selectVideoResolution')?.value || '4k';
    const selectedDuration = parseInt(document.getElementById('selectVideoDuration')?.value, 10) || 5;

    const resLabels = {
      'native': `[${state.calcData.resolution.width}×${state.calcData.resolution.height}]`,
      '4k': '[4K UHD 3840×2160]',
      '1080p': '[1080p Full HD]',
      '2k': '[2K QHD 2560×1440]'
    };
    if (resBadge) resBadge.textContent = resLabels[selectedRes] || '[4K UHD]';

    overlay.style.display = 'flex';

    try {
      const result = await videoGenerator.recordVideo({
        resolution: selectedRes,
        durationSeconds: selectedDuration
      }, progress => {
        progressText.textContent = `${progress}%`;
      });

      const filename = `LED-TestVideo_60fps_${result.targetW}x${result.targetH}.webm`;
      videoGenerator.downloadVideoBlob(result.blob, filename);
    } catch (err) {
      alert('Gagal merekam video di browser ini: ' + err.message);
    } finally {
      overlay.style.display = 'none';
    }
  });

  // Fullscreen Modal Launcher
  const fsModal = document.getElementById('fullscreenPlayerModal');
  document.getElementById('btnFullscreenModal')?.addEventListener('click', () => {
    if (!fullscreenVideo || !state.calcData) return;
    fsModal.classList.add('active');

    const options = getTestCardOptions();
    fullscreenVideo.setParams(state.calcData, options);
    fullscreenVideo.startAnimation();

    if (fsModal.requestFullscreen) {
      fsModal.requestFullscreen().catch(() => {});
    }
  });

  // Close Fullscreen
  const closeFullscreen = () => {
    fsModal.classList.remove('active');
    if (fullscreenVideo) fullscreenVideo.stopAnimation();
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  document.getElementById('btnCloseFullscreen')?.addEventListener('click', closeFullscreen);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && fsModal.classList.contains('active')) {
      closeFullscreen();
    }
  });

  // Port Filter Select in Cabling Tab
  document.getElementById('selectPortFilter')?.addEventListener('change', e => {
    state.activePortFilter = e.target.value;
    cablingVisualizer.setActivePortFilter(e.target.value);
  });

  // Cabling Mode Switcher (Otomatis vs Custom)
  const cabModeBtns = document.querySelectorAll('#cablingModeGroup .mode-btn');
  cabModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cabModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.getAttribute('data-cabmode');
      const autoControls = document.getElementById('cablingAutoControls');
      const customControls = document.getElementById('cablingCustomControls');
      const customPortBar = document.getElementById('cablingCustomPortBar');

      if (mode === 'custom') {
        if (autoControls) autoControls.style.display = 'none';
        if (customControls) customControls.style.display = 'flex';
        if (customPortBar) customPortBar.style.display = 'block';
        cablingVisualizer.setMode('custom');
        updateCustomCablingUI(cablingVisualizer.getCustomStats());
      } else {
        if (autoControls) autoControls.style.display = 'flex';
        if (customControls) customControls.style.display = 'none';
        if (customPortBar) customPortBar.style.display = 'none';
        cablingVisualizer.setMode('auto');
      }
    });
  });

  // Auto Route Pattern Select Change
  document.getElementById('selectAutoRoutePattern')?.addEventListener('change', e => {
    cablingVisualizer.setAutoRoutePattern(e.target.value);
  });

  // Customizable Max Cabinets per Cable Run in Auto Mode
  const inputMaxCab = document.getElementById('inputAutoMaxCabPerPort');
  if (inputMaxCab) {
    const handleMaxCabChange = (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 100) val = 100;
      cablingVisualizer.setMaxCabinetsPerPort(val);

      if (state.calcData) {
        const total = state.calcData.cabinet.total;
        const pix = state.calcData.cabinet.pixelW * state.calcData.cabinet.pixelH;
        const cap = state.calcData.controller.portCapacity;
        const req = Math.max(Math.ceil((total * pix) / cap), Math.ceil(total / val));
        updatePortFilterOptions(req);
      }
    };
    inputMaxCab.addEventListener('input', handleMaxCabChange);
    inputMaxCab.addEventListener('change', handleMaxCabChange);
  }

  // Custom Cabling Toolbar Actions
  document.getElementById('btnCustomUndo')?.addEventListener('click', () => {
    cablingVisualizer.undoCustomStep();
  });

  document.getElementById('btnCustomClearPort')?.addEventListener('click', () => {
    cablingVisualizer.clearActivePort();
  });

  document.getElementById('btnCustomAutoFill')?.addEventListener('click', () => {
    cablingVisualizer.autoFillRemaining();
  });

  document.getElementById('btnCustomResetAll')?.addEventListener('click', () => {
    cablingVisualizer.resetAllCustom();
  });

  // Add Custom Cable Run / Port Button in header
  document.getElementById('btnAddCustomPort')?.addEventListener('click', () => {
    cablingVisualizer.addNewCustomPort();
  });

  // Reset Pan Position Button
  document.getElementById('btnResetPanCabling')?.addEventListener('click', () => {
    if (!cablingVisualizer) return;
    cablingVisualizer.resetPan();
  });

  // Zoom Controls for Cabling Diagram
  document.getElementById('btnZoomInCabling')?.addEventListener('click', () => {
    if (!cablingVisualizer) return;
    const z = cablingVisualizer.zoomIn();
    const zoomText = document.getElementById('cablingZoomPercentText');
    if (zoomText) zoomText.textContent = `${Math.round(z * 100)}%`;
  });

  document.getElementById('btnZoomOutCabling')?.addEventListener('click', () => {
    if (!cablingVisualizer) return;
    const z = cablingVisualizer.zoomOut();
    const zoomText = document.getElementById('cablingZoomPercentText');
    if (zoomText) zoomText.textContent = `${Math.round(z * 100)}%`;
  });

  document.getElementById('btnZoomResetCabling')?.addEventListener('click', () => {
    if (!cablingVisualizer) return;
    const z = cablingVisualizer.resetZoom();
    const zoomText = document.getElementById('cablingZoomPercentText');
    if (zoomText) zoomText.textContent = '100%';
  });

  // Download Cabling Diagram SVG
  document.getElementById('btnDownloadCablingSVG')?.addEventListener('click', () => {
    const filename = `Diagram-Kabel-LED_${state.calcData.resolution.width}x${state.calcData.resolution.height}_${cablingVisualizer.mode.toUpperCase()}.svg`;
    cablingVisualizer.downloadSVG(filename);
  });

  // Print Cabling Diagram
  document.getElementById('btnPrintCabling')?.addEventListener('click', () => {
    window.print();
  });

  // Quick Print Specs
  document.getElementById('btnQuickPrint')?.addEventListener('click', () => {
    window.print();
  });
}
