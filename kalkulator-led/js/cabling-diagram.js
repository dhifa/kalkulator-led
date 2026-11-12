/**
 * LED Videotron Cabinet Layout & Data Cabling Routing Visualizer
 * Fully optimized for both small and massive LED displays (up to 75m² - 200m² / 300+ cabinets)
 * Features:
 * 1. Mode Otomatis (By Sistem) with customizable Max Cabinets per Cable Run & Multi-Pattern Routing.
 * 2. Mode Custom (User Routing Sendiri) with unlimited dynamic ports, click-to-connect daisy-chaining.
 * 3. Smooth Pan & Drag Viewport (drag mouse to pan left/right/up/down) + Mousewheel & Button Zoom.
 * 4. Multi-row responsive port legend (never overflows horizontally).
 * 5. Adaptive cell sizing, responsive typography, and hover inspection tooltips.
 */

export class CablingDiagramVisualizer {
  constructor(container, onStateChange = null, onZoomChange = null) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onZoomChange = onZoomChange;

    // Routing Mode: 'auto' | 'custom'
    this.mode = 'auto';

    // Auto routing options
    this.autoRoutePattern = 's-vertical-bottom-up'; // 's-vertical-bottom-up' | 's-vertical-top-down' | 's-horizontal-lr' | 's-horizontal-rl'
    this.maxCabinetsPerPort = 12; // Customizable by user for auto & custom routing
    this.activePortFilter = 'all';
    this.showDataFlow = true;

    // Custom user routing state: { [portNumber]: [cabIndex1, cabIndex2, ...] }
    this.customRoutes = { 1: [] };
    this.activeCustomPort = 1;

    // Pan & Zoom interactive state
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartPanX = 0;
    this.dragStartPanY = 0;
    this.hasMovedDistance = 0;

    // Port color palette (NovaStar Gigabit Ethernet Port Channels)
    this.portColors = [
      '#00E5FF', // Port 1: Cyan
      '#FF007F', // Port 2: Magenta
      '#00FF66', // Port 3: Neon Green
      '#FFB703', // Port 4: Amber
      '#7B2CBF', // Port 5: Purple
      '#FB8500', // Port 6: Orange
      '#3A86FF', // Port 7: Blue
      '#E63946', // Port 8: Red
      '#06D6A0', // Port 9: Mint
      '#F72585', // Port 10: Pink
      '#4CC9F0', // Port 11: Sky Blue
      '#7209B7', // Port 12: Deep Violet
      '#4361EE', // Port 13: Royal Blue
      '#4895EF', // Port 14: Light Blue
      '#560BAD', // Port 15: Indigo
      '#B5179E', // Port 16: Rose
      '#10B981', // Port 17: Emerald
      '#F97316', // Port 18: Coral
      '#06B6D4', // Port 19: Teal
      '#84CC16', // Port 20: Lime
      '#D946EF', // Port 21: Fuchsia
      '#EC4899', // Port 22: Hot Pink
      '#6366F1', // Port 23: Periwinkle
      '#14B8A6'  // Port 24: Aqua
    ];

    this.calcData = null;
    this.initPanZoomListeners();
  }

  setMode(mode) {
    this.mode = mode;
    if (this.calcData) this.render(this.calcData);
  }

  setAutoRoutePattern(pattern) {
    this.autoRoutePattern = pattern;
    if (this.calcData) this.render(this.calcData);
  }

  setMaxCabinetsPerPort(num) {
    const val = parseInt(num, 10);
    if (!isNaN(val) && val >= 1) {
      this.maxCabinetsPerPort = val;
      if (this.calcData) this.render(this.calcData);
      if (this.onStateChange) this.onStateChange(this.getCustomStats());
    }
  }

  setActivePortFilter(filter) {
    this.activePortFilter = filter;
    if (this.calcData) this.render(this.calcData);
  }

  setActiveCustomPort(port) {
    this.activeCustomPort = parseInt(port, 10) || 1;
    if (!this.customRoutes[this.activeCustomPort]) {
      this.customRoutes[this.activeCustomPort] = [];
    }
    if (this.calcData) this.render(this.calcData);
  }

  /**
   * Add a new unlimited custom cable run / port
   */
  addNewCustomPort() {
    const minRequired = this.calcData?.controller?.portsRequired || 1;
    const existingPorts = Object.keys(this.customRoutes).map(Number);
    const maxPort = Math.max(minRequired, ...existingPorts, 0);
    const nextPort = maxPort + 1;
    this.customRoutes[nextPort] = [];
    this.activeCustomPort = nextPort;
    if (this.calcData) this.render(this.calcData);
    if (this.onStateChange) this.onStateChange(this.getCustomStats());
    return nextPort;
  }

  /**
   * Remove or clear a specific custom port run
   */
  removeCustomPort(portNum) {
    portNum = parseInt(portNum, 10);
    delete this.customRoutes[portNum];
    const remaining = Object.keys(this.customRoutes).map(Number).sort((a, b) => a - b);
    if (remaining.length === 0) {
      this.customRoutes = { 1: [] };
      this.activeCustomPort = 1;
    } else if (this.activeCustomPort === portNum) {
      this.activeCustomPort = remaining[0];
    }
    if (this.calcData) this.render(this.calcData);
    if (this.onStateChange) this.onStateChange(this.getCustomStats());
  }

  // Zoom & Pan controls
  zoomIn() {
    this.zoomLevel = Math.min(3.5, +(this.zoomLevel + 0.2).toFixed(2));
    this.applyTransform();
    if (this.onZoomChange) this.onZoomChange(this.zoomLevel);
    return this.zoomLevel;
  }

  zoomOut() {
    this.zoomLevel = Math.max(0.25, +(this.zoomLevel - 0.2).toFixed(2));
    this.applyTransform();
    if (this.onZoomChange) this.onZoomChange(this.zoomLevel);
    return this.zoomLevel;
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
    if (this.onZoomChange) this.onZoomChange(this.zoomLevel);
    return this.zoomLevel;
  }

  resetPan() {
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  applyTransform() {
    const svg = this.container?.querySelector('#cablingSvgElement');
    if (svg) {
      svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
      svg.style.transformOrigin = 'center center';
      svg.style.transition = this.isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }

  /**
   * Bind interactive Pan (Drag) & Mousewheel Zoom listeners to the container
   */
  initPanZoomListeners() {
    if (!this.container) return;

    this.container.style.cursor = 'grab';
    this.container.style.userSelect = 'none';
    this.container.style.overflow = 'hidden';
    this.container.style.position = 'relative';

    // 1. Mouse Drag (Pan)
    this.container.addEventListener('mousedown', (e) => {
      // Allow dragging from anywhere in container
      this.isDragging = true;
      this.hasMovedDistance = 0;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragStartPanX = this.panX;
      this.dragStartPanY = this.panY;
      this.container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.hasMovedDistance = Math.hypot(dx, dy);
      this.panX = this.dragStartPanX + dx;
      this.panY = this.dragStartPanY + dy;
      this.applyTransform();
    });

    const stopDrag = () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.container) this.container.style.cursor = 'grab';
      }
    };

    window.addEventListener('mouseup', stopDrag);
    this.container.addEventListener('mouseleave', stopDrag);

    // 2. Mouse Wheel Zoom (with Ctrl key or direct wheel inside canvas)
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.max(0.25, Math.min(3.5, +(this.zoomLevel * zoomFactor).toFixed(2)));
      if (newZoom !== this.zoomLevel) {
        this.zoomLevel = newZoom;
        this.applyTransform();
        if (this.onZoomChange) this.onZoomChange(this.zoomLevel);
      }
    }, { passive: false });

    // 3. Touch support for tablet / mobile pan
    let touchStartX = 0;
    let touchStartY = 0;
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.hasMovedDistance = 0;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        this.dragStartPanX = this.panX;
        this.dragStartPanY = this.panY;
      }
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      this.hasMovedDistance = Math.hypot(dx, dy);
      this.panX = this.dragStartPanX + dx;
      this.panY = this.dragStartPanY + dy;
      this.applyTransform();
    }, { passive: true });

    this.container.addEventListener('touchend', stopDrag, { passive: true });
  }

  /**
   * Handle user clicking a cabinet in Custom Mode
   */
  handleCabinetClick(cabNum) {
    if (this.mode !== 'custom') return;
    // If user dragged more than 5px, treat as pan instead of click
    if (this.hasMovedDistance > 5) return;

    cabNum = parseInt(cabNum, 10);
    const p = this.activeCustomPort;
    if (!this.customRoutes[p]) this.customRoutes[p] = [];

    const currentPortPath = this.customRoutes[p];

    // Case 1: Click last added cabinet in active port -> Undo / Remove
    if (currentPortPath.length > 0 && currentPortPath[currentPortPath.length - 1] === cabNum) {
      currentPortPath.pop();
      this.render(this.calcData);
      if (this.onStateChange) this.onStateChange(this.getCustomStats());
      return;
    }

    // Check if cabinet already belongs to ANY port
    for (const [portIdx, path] of Object.entries(this.customRoutes)) {
      const idx = path.indexOf(cabNum);
      if (idx !== -1) {
        if (parseInt(portIdx, 10) === p) {
          // Already in active port: remove from this position and later
          this.customRoutes[p] = path.slice(0, idx);
        } else {
          // In another port: remove from that other port first
          this.customRoutes[portIdx].splice(idx, 1);
          // Add to current port
          this.customRoutes[p].push(cabNum);
        }
        this.render(this.calcData);
        if (this.onStateChange) this.onStateChange(this.getCustomStats());
        return;
      }
    }

    // Add to active port
    this.customRoutes[p].push(cabNum);
    this.render(this.calcData);
    if (this.onStateChange) this.onStateChange(this.getCustomStats());
  }

  /**
   * Undo last custom step
   */
  undoCustomStep() {
    const p = this.activeCustomPort;
    if (this.customRoutes[p] && this.customRoutes[p].length > 0) {
      this.customRoutes[p].pop();
      this.render(this.calcData);
      if (this.onStateChange) this.onStateChange(this.getCustomStats());
    }
  }

  /**
   * Clear active port routes
   */
  clearActivePort() {
    this.customRoutes[this.activeCustomPort] = [];
    this.render(this.calcData);
    if (this.onStateChange) this.onStateChange(this.getCustomStats());
  }

  /**
   * Reset all custom routing
   */
  resetAllCustom() {
    this.customRoutes = { 1: [] };
    this.activeCustomPort = 1;
    this.render(this.calcData);
    if (this.onStateChange) this.onStateChange(this.getCustomStats());
  }

  /**
   * Auto-fill remaining unrouted cabinets
   */
  autoFillRemaining() {
    if (!this.calcData) return;
    const { cabinet, controller } = this.calcData;
    const { total, pixelW, pixelH } = cabinet;
    const { portCapacity } = controller;
    const cabPixels = pixelW * pixelH;
    const maxCabPerPort = this.maxCabinetsPerPort || 12;

    // Total ports allowed in auto fill
    const autoPortsRequired = Math.max(
      Math.ceil((total * cabPixels) / portCapacity),
      Math.ceil(total / maxCabPerPort)
    );

    // Get assigned cabinets
    const assigned = new Set();
    Object.values(this.customRoutes).forEach(path => {
      path.forEach(c => assigned.add(c));
    });

    const unassigned = [];
    for (let i = 1; i <= total; i++) {
      if (!assigned.has(i)) unassigned.push(i);
    }

    if (unassigned.length === 0) return;

    let p = this.activeCustomPort;
    if (!this.customRoutes[p]) this.customRoutes[p] = [];

    for (const cab of unassigned) {
      const currentPixels = (this.customRoutes[p].length + 1) * cabPixels;
      const currentCabs = this.customRoutes[p].length;

      if ((currentPixels > portCapacity || currentCabs >= maxCabPerPort) && p < autoPortsRequired) {
        p++;
        if (!this.customRoutes[p]) this.customRoutes[p] = [];
      }
      this.customRoutes[p].push(cab);
    }

    this.activeCustomPort = p;
    this.render(this.calcData);
    if (this.onStateChange) this.onStateChange(this.getCustomStats());
  }

  /**
   * Get stats for custom routing
   */
  getCustomStats() {
    if (!this.calcData) return null;
    const { cabinet, controller } = this.calcData;
    const { total, pixelW, pixelH } = cabinet;
    const { portCapacity } = controller;
    const cabPixels = pixelW * pixelH;
    const maxCabPerPort = this.maxCabinetsPerPort || 12;

    const autoPortsRequired = Math.max(
      Math.ceil((total * cabPixels) / portCapacity),
      Math.ceil(total / maxCabPerPort)
    );

    let totalAssigned = 0;
    const portDetails = [];

    const definedPorts = Object.keys(this.customRoutes).map(Number);
    const maxDefinedPort = definedPorts.length > 0 ? Math.max(...definedPorts) : 1;
    const totalPortsToTrack = Math.max(autoPortsRequired, maxDefinedPort);

    for (let p = 1; p <= totalPortsToTrack; p++) {
      const path = this.customRoutes[p] || [];
      const cabCount = path.length;
      totalAssigned += cabCount;
      const portPix = cabCount * cabPixels;
      const loadPercent = ((portPix / portCapacity) * 100).toFixed(1);
      const isOverloaded = (portPix > portCapacity) || (cabCount > maxCabPerPort);

      portDetails.push({
        port: p,
        cabCount,
        portPix,
        loadPercent,
        isOverloaded,
        exceedsCabinetLimit: cabCount > maxCabPerPort,
        color: this.portColors[(p - 1) % this.portColors.length]
      });
    }

    return {
      totalAssigned,
      totalCabinets: total,
      remainingCabinets: Math.max(0, total - totalAssigned),
      portDetails,
      activePort: this.activeCustomPort,
      portsRequired: autoPortsRequired,
      maxCabinetsPerPort: maxCabPerPort
    };
  }

  /**
   * Calculate Auto Route path sequence
   */
  calculateAutoPath(cols, rows, pattern) {
    const points = [];

    if (pattern === 's-vertical-bottom-up') {
      // Column by column: Col 0 Bottom->Up, Col 1 Top->Down
      for (let c = 0; c < cols; c++) {
        if (c % 2 === 0) {
          for (let r = rows - 1; r >= 0; r--) points.push({ r, c, cabNum: r * cols + c + 1 });
        } else {
          for (let r = 0; r < rows; r++) points.push({ r, c, cabNum: r * cols + c + 1 });
        }
      }
    } else if (pattern === 's-vertical-top-down') {
      // Column by column: Col 0 Top->Down, Col 1 Bottom->Up
      for (let c = 0; c < cols; c++) {
        if (c % 2 === 0) {
          for (let r = 0; r < rows; r++) points.push({ r, c, cabNum: r * cols + c + 1 });
        } else {
          for (let r = rows - 1; r >= 0; r--) points.push({ r, c, cabNum: r * cols + c + 1 });
        }
      }
    } else if (pattern === 's-horizontal-lr') {
      // Row by row: Row 0 Left->Right, Row 1 Right->Left
      for (let r = 0; r < rows; r++) {
        if (r % 2 === 0) {
          for (let c = 0; c < cols; c++) points.push({ r, c, cabNum: r * cols + c + 1 });
        } else {
          for (let c = cols - 1; c >= 0; c--) points.push({ r, c, cabNum: r * cols + c + 1 });
        }
      }
    } else if (pattern === 's-horizontal-rl') {
      // Row by row: Row 0 Right->Left, Row 1 Left->Right
      for (let r = 0; r < rows; r++) {
        if (r % 2 === 0) {
          for (let c = cols - 1; c >= 0; c--) points.push({ r, c, cabNum: r * cols + c + 1 });
        } else {
          for (let c = 0; c < cols; c++) points.push({ r, c, cabNum: r * cols + c + 1 });
        }
      }
    }

    return points;
  }

  /**
   * Render interactive SVG Grid & Routing with Adaptive Geometry
   */
  render(calcData, options = {}) {
    this.calcData = calcData;
    if (!this.container || !calcData) return;

    const { cabinet, controller } = calcData;
    const { cols, rows, total, pixelW, pixelH } = cabinet;
    const { portCapacity } = controller;
    const pixelsPerCab = pixelW * pixelH;
    const maxCabPerPort = this.maxCabinetsPerPort || 12;

    // Dynamic ports required based on custom max cabinet setting
    const autoPortsRequired = Math.max(
      Math.ceil((total * pixelsPerCab) / portCapacity),
      Math.ceil(total / maxCabPerPort)
    );

    // 1. Build Port Map based on active mode
    const cabinetPortMap = {}; // cabNum -> portNum
    const cabinetSeqMap = {};  // cabNum -> sequence in port (1, 2, 3...)

    if (this.mode === 'auto') {
      const autoPoints = this.calculateAutoPath(cols, rows, this.autoRoutePattern);
      let currentPort = 1;
      let currentPortPixels = 0;
      let currentPortCabs = 0;
      let seq = 1;

      for (const pt of autoPoints) {
        const exceedsPixelLimit = (currentPortPixels + pixelsPerCab > portCapacity);
        const exceedsCabLimit = (currentPortCabs >= maxCabPerPort);

        if ((exceedsPixelLimit || exceedsCabLimit) && currentPort < autoPortsRequired) {
          currentPort++;
          currentPortPixels = 0;
          currentPortCabs = 0;
          seq = 1;
        }
        cabinetPortMap[pt.cabNum] = currentPort;
        cabinetSeqMap[pt.cabNum] = seq++;
        currentPortPixels += pixelsPerCab;
        currentPortCabs++;
      }
    } else {
      // Custom Mode
      for (const [portStr, path] of Object.entries(this.customRoutes)) {
        const p = parseInt(portStr, 10);
        path.forEach((cabNum, idx) => {
          cabinetPortMap[cabNum] = p;
          cabinetSeqMap[cabNum] = idx + 1;
        });
      }
    }

    // 2. Compute Responsive Adaptive Cell Dimensions
    let cellW = 82;
    if (cols > 40) cellW = 54;
    else if (cols > 25) cellW = 64;
    else if (cols > 15) cellW = 74;

    const cellAspect = cabinet.heightMm / cabinet.widthMm || 1.0;
    const cellH = cellW * cellAspect;
    const cellMargin = cols > 30 ? 4 : (cols > 15 ? 5 : 6);

    const startX = 40;
    const startY = 40;

    const gridWidth = cols * cellW + (cols - 1) * cellMargin;
    const gridHeight = rows * cellH + (rows - 1) * cellMargin;

    // Compute SVG Canvas Width (at least 920px or width of grid + margins)
    const svgWidth = Math.max(920, gridWidth + startX * 2);

    // Dynamic Multi-row Legend Calculations
    const maxCustomPort = Object.keys(this.customRoutes).map(Number).reduce((max, val) => Math.max(max, val), 0);
    const maxLegendPorts = this.mode === 'auto' 
      ? autoPortsRequired 
      : Math.max(autoPortsRequired, maxCustomPort, 1);

    const legendItemWidth = 145;
    const legendAvailableWidth = svgWidth - 80;
    const legendColsCount = Math.max(2, Math.floor(legendAvailableWidth / legendItemWidth));
    const legendRowsCount = Math.ceil(maxLegendPorts / legendColsCount);
    const legendHeight = 35 + legendRowsCount * 24;

    const svgHeight = startY + gridHeight + 45 + legendHeight;

    // Font Sizing & Typography Adaptation
    const numFontSize = Math.max(8.5, Math.min(14, cellW * 0.22, cellH * 0.24));
    const tagFontSize = Math.max(7, Math.min(10.5, cellW * 0.15, cellH * 0.17));
    const headerBarHeight = Math.max(2.5, Math.min(8, cellH * 0.15));

    let svgHtml = `
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="cabling-svg" preserveAspectRatio="xMidYMid meet" id="cablingSvgElement" style="width: 100%; height: auto; min-width: ${Math.min(svgWidth, 800)}px; pointer-events: auto;">
        <defs>
          <filter id="cabling-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.0" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          ${this.portColors.map((color, idx) => `
            <marker id="arrow-${idx + 1}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="${color}" />
            </marker>
          `).join('')}
        </defs>
    `;

    // Coordinates cache for drawing lines
    const cabCoords = {};

    // 3. Draw Cabinet Nodes
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cabNum = r * cols + c + 1;
        const x = startX + c * (cellW + cellMargin);
        const y = startY + r * (cellH + cellMargin);
        cabCoords[cabNum] = { x: x + cellW / 2, y: y + cellH / 2, r, c };

        const portIndex = cabinetPortMap[cabNum] || null;
        const seqNum = cabinetSeqMap[cabNum] || null;

        const isRouted = portIndex !== null;
        const portColor = isRouted ? this.portColors[(portIndex - 1) % this.portColors.length] : '#334155';

        // Filter / Dimming check
        let isDimmed = false;
        if (this.mode === 'auto' && this.activePortFilter !== 'all') {
          isDimmed = parseInt(this.activePortFilter, 10) !== portIndex;
        } else if (this.mode === 'custom' && isRouted) {
          isDimmed = portIndex !== this.activeCustomPort && this.activePortFilter !== 'all';
        }

        const opacity = isDimmed ? 0.2 : 1.0;
        const isSelectedActiveCustom = this.mode === 'custom' && isRouted && portIndex === this.activeCustomPort;
        const strokeWidth = isSelectedActiveCustom ? 2.5 : (isRouted ? 1.5 : 1.0);
        const strokeColor = isSelectedActiveCustom ? portColor : (isRouted ? portColor : 'rgba(255,255,255,0.15)');
        const fillBg = isRouted ? '#0e1320' : '#080b12';

        // Concise label formatting for dense grids
        let seqTagText = '';
        if (isRouted) {
          if (cellW >= 68) {
            seqTagText = `P${portIndex}${seqNum ? ` • #${seqNum}` : ''}`;
          } else {
            seqTagText = `P${portIndex}${seqNum ? `#${seqNum}` : ''}`;
          }
        } else if (this.mode === 'custom') {
          seqTagText = cellW >= 60 ? '+ Hubung' : '+';
        }

        svgHtml += `
          <g class="cab-interactive-node" data-cab="${cabNum}" opacity="${opacity}" style="cursor: ${this.mode === 'custom' ? 'pointer' : 'default'};">
            <title>Cabinet #${cabNum} (Kolom ${c + 1}, Baris ${r + 1}) | Resolusi: ${pixelW}×${pixelH}px | ${isRouted ? `Port ${portIndex} (Urutan #${seqNum})` : 'Belum Terhubung'}</title>
            
            <!-- Cabinet Base Box -->
            <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="${Math.min(5, cellW * 0.08)}"
                  fill="${fillBg}" stroke="${strokeColor}" stroke-width="${strokeWidth}"
                  stroke-dasharray="${!isRouted && this.mode === 'custom' ? '3,3' : 'none'}" />
            
            <!-- Top Port Accent Header -->
            ${isRouted ? `
              <rect x="${x + 2}" y="${y + 2}" width="${cellW - 4}" height="${headerBarHeight}"
                    fill="${portColor}" opacity="0.65" rx="2" />
            ` : ''}

            <!-- Cabinet ID Number -->
            <text x="${x + cellW / 2}" y="${y + cellH / 2 - (isRouted ? (cellH * 0.1) : 0)}" text-anchor="middle" dominant-baseline="middle"
                  fill="#FFFFFF" font-size="${numFontSize}px" font-weight="700" font-family="monospace">
              #${cabNum}
            </text>

            <!-- Port Tag or Sequence Badge -->
            ${seqTagText ? `
              <text x="${x + cellW / 2}" y="${y + cellH / 2 + (cellH * 0.26)}" text-anchor="middle" dominant-baseline="middle"
                    fill="${isRouted ? portColor : 'var(--accent-cyan)'}" font-size="${tagFontSize}px" font-weight="700" font-family="sans-serif" opacity="${isRouted ? '1' : '0.7'}">
                ${seqTagText}
              </text>
            ` : ''}
          </g>
        `;
      }
    }

    // 4. Draw Cabling Connection Lines (Daisy-chain Paths)
    if (this.showDataFlow) {
      const lineStrokeWidth = Math.max(1.8, Math.min(2.8, cellW * 0.035));

      if (this.mode === 'auto') {
        // Auto Mode Lines
        for (let p = 1; p <= autoPortsRequired; p++) {
          const isDimmed = this.activePortFilter !== 'all' && parseInt(this.activePortFilter, 10) !== p;
          const opacity = isDimmed ? 0.08 : 0.9;
          const portColor = this.portColors[(p - 1) % this.portColors.length];

          const autoPts = this.calculateAutoPath(cols, rows, this.autoRoutePattern)
            .filter(pt => cabinetPortMap[pt.cabNum] === p)
            .map(pt => cabCoords[pt.cabNum]);

          if (autoPts.length > 0) {
            svgHtml += this.renderPortCablingPath(p, autoPts, portColor, opacity, lineStrokeWidth, cellW);
          }
        }
      } else {
        // Custom Mode Lines
        for (const [portStr, path] of Object.entries(this.customRoutes)) {
          const p = parseInt(portStr, 10);
          if (path.length === 0) continue;

          const isDimmed = this.activePortFilter !== 'all' && parseInt(this.activePortFilter, 10) !== p;
          const opacity = isDimmed ? 0.1 : 0.95;
          const portColor = this.portColors[(p - 1) % this.portColors.length];

          const customPts = path.map(cabNum => cabCoords[cabNum]).filter(Boolean);
          if (customPts.length > 0) {
            svgHtml += this.renderPortCablingPath(p, customPts, portColor, opacity, lineStrokeWidth, cellW);
          }
        }
      }
    }

    // 5. Multi-Row Responsive Port Legend at Bottom (Never Overflows)
    const legendStartY = startY + gridHeight + 35;
    svgHtml += `<g transform="translate(40, ${legendStartY})">`;
    svgHtml += `<text x="0" y="0" fill="#94A3B8" font-size="11.5px" font-family="sans-serif" font-weight="700">Alokasi Port NovaStar (${maxLegendPorts} Port Gigabit, Maks ${maxCabPerPort} Cab/Port):</text>`;

    let currentLegendIdx = 0;
    for (let p = 1; p <= maxLegendPorts; p++) {
      const pColor = this.portColors[(p - 1) % this.portColors.length];
      const cabCount = Object.values(cabinetPortMap).filter(cp => cp === p).length;
      
      if (cabCount > 0 || (this.mode === 'custom' && p <= autoPortsRequired)) {
        const colIdx = currentLegendIdx % legendColsCount;
        const rowIdx = Math.floor(currentLegendIdx / legendColsCount);
        const lx = colIdx * legendItemWidth;
        const ly = 20 + rowIdx * 24;

        svgHtml += `
          <g transform="translate(${lx}, ${ly})">
            <rect x="0" y="-10" width="12" height="12" rx="3" fill="${pColor}" />
            <text x="18" y="0" fill="#FFFFFF" font-size="11px" font-family="sans-serif" font-weight="600">
              Port ${p} <tspan fill="#94A3B8" font-weight="normal">(${cabCount} Cabs)</tspan>
            </text>
          </g>
        `;
        currentLegendIdx++;
      }
    }
    svgHtml += `</g></svg>`;

    this.container.innerHTML = svgHtml;

    // Apply current pan & zoom transform
    this.applyTransform();

    // 6. Bind Interactive SVG Click Listeners for Custom Mode
    if (this.mode === 'custom') {
      const nodes = this.container.querySelectorAll('.cab-interactive-node');
      nodes.forEach(node => {
        node.addEventListener('click', (e) => {
          e.stopPropagation();
          const cabNum = node.getAttribute('data-cab');
          if (cabNum) this.handleCabinetClick(cabNum);
        });
      });
    }
  }

  /**
   * Helper: Generate SVG Path string with markers & IN entry label
   */
  renderPortCablingPath(p, pts, portColor, opacity, strokeW = 2.5, cellW = 80) {
    if (!pts || pts.length === 0) return '';
    let html = '';

    if (pts.length > 1) {
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x} ${pts[i].y}`;
      }

      html += `
        <path d="${d}" fill="none" stroke="${portColor}" stroke-width="${strokeW}"
              stroke-dasharray="6,4" opacity="${opacity}" filter="url(#cabling-glow)" />
      `;

      // Draw direction dots along segments
      const dotRadius = Math.max(2, Math.min(3.5, cellW * 0.04));
      for (let i = 0; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        html += `
          <circle cx="${midX}" cy="${midY}" r="${dotRadius}" fill="${portColor}" opacity="${opacity}" />
        `;
      }
    }

    // Starting Controller Node (IN)
    const first = pts[0];
    const inRadius = Math.max(4, Math.min(6, cellW * 0.08));
    const inFont = Math.max(7.5, Math.min(10, cellW * 0.15));

    html += `
      <circle cx="${first.x}" cy="${first.y}" r="${inRadius}" fill="${portColor}" opacity="${opacity}" />
      <circle cx="${first.x}" cy="${first.y}" r="${inRadius + 4}" fill="none" stroke="${portColor}" stroke-width="1.5" opacity="${opacity * 0.7}" />
      <text x="${first.x}" y="${first.y - (inRadius + 6)}" text-anchor="middle" fill="${portColor}"
            font-size="${inFont}px" font-weight="bold" font-family="monospace">IN (P${p})</text>
    `;

    // End Node indicator if more than 1 cab
    if (pts.length > 1) {
      const last = pts[pts.length - 1];
      html += `
        <circle cx="${last.x}" cy="${last.y}" r="${Math.max(3, inRadius - 1)}" fill="${portColor}" opacity="${opacity}" />
      `;
    }

    return html;
  }

  /**
   * Export SVG to file
   */
  downloadSVG(filename = 'diagram-kabel-videotron.svg') {
    const svg = this.container.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
