/**
 * LED Videotron Presets & Hardware Database
 * Includes standard pitches, standard cabinet dimensions, module sizes,
 * power consumption averages, and controller specifications.
 */

export const LED_PITCH_PRESETS = [
  {
    id: 'p2.6',
    name: 'Unilumin P2.604 Rental Pro (500×500)',
    brand: 'Unilumin',
    pitch: 2.604,
    category: 'indoor',
    standardCabinet: { width: 500, height: 500, type: 'Die-cast 500x500' },
    cabinetPixels: { width: 192, height: 192 },
    moduleSize: { width: 250, height: 250 },
    typicalPowerPerSqm: 240, // Watts
    maxPowerPerSqm: 720,
    typicalBrightness: 1000, // nits
    weightPerSqm: 26, // kg (~6.5 kg / cabinet)
    recommendedMinDistance: 2.6, // meters
    description: 'Unilumin Upad III / Utile Series • 192×192 px/cab • 3840Hz Refresh'
  },
  {
    id: 'p2.6-hb',
    name: 'Unilumin P2.604 High-Brightness (Upad IV)',
    brand: 'Unilumin',
    pitch: 2.604,
    category: 'indoor',
    standardCabinet: { width: 500, height: 500, type: 'Die-cast 500x500' },
    cabinetPixels: { width: 192, height: 192 },
    moduleSize: { width: 250, height: 250 },
    typicalPowerPerSqm: 280,
    maxPowerPerSqm: 800,
    typicalBrightness: 1500,
    weightPerSqm: 28,
    recommendedMinDistance: 2.6,
    description: 'Unilumin Upad IV High-Contrast • 1500 nits • Stage & Broadcast'
  },
  {
    id: 'p2.6-tall',
    name: 'Unilumin P2.604 Tall (500×1000)',
    brand: 'Unilumin',
    pitch: 2.604,
    category: 'indoor',
    standardCabinet: { width: 500, height: 1000, type: 'Die-cast 500x1000' },
    cabinetPixels: { width: 192, height: 384 },
    moduleSize: { width: 250, height: 250 },
    typicalPowerPerSqm: 240,
    maxPowerPerSqm: 720,
    typicalBrightness: 1000,
    weightPerSqm: 26,
    recommendedMinDistance: 2.6,
    description: 'Unilumin 500×1000mm Tall Cabinet • 192×384 px/cab'
  }
];

export const CABINET_PRESETS = [
  { id: 'cab-500x500', name: '500 × 500 mm (Unilumin Upad Standard)', width: 500, height: 500, unit: 'mm' },
  { id: 'cab-500x1000', name: '500 × 1000 mm (Unilumin Tall Cabinet)', width: 500, height: 1000, unit: 'mm' },
  { id: 'cab-custom', name: 'Custom Dimension (User Defined)', width: 500, height: 500, unit: 'mm' }
];

export const CONTROLLER_MODELS = [
  // 1. NovaStar VX All-in-One Video Processors & Switchers (Industry Standard Rental & Fixed)
  { name: 'NovaStar VX400 / VX4S-N', series: 'VX All-in-One', ports: 4, capacity: 2600000, maxRes: '3840×1200@60Hz (3 Layers)' },
  { name: 'NovaStar VX600', series: 'VX All-in-One', ports: 6, capacity: 3900000, maxRes: '3840×2160@30Hz / 3840×1080@60Hz' },
  { name: 'NovaStar VX1000 (4K)', series: 'VX All-in-One', ports: 10, capacity: 6500000, maxRes: '3840×2160@60Hz 4K UHD (3×4K Layers)' },
  { name: 'NovaStar VX16s (4K Pro)', series: 'VX All-in-One', ports: 16, capacity: 10400000, maxRes: '4096×2160@60Hz (Ultra-wide)' },
  { name: 'NovaStar VX2000 Pro (4K Flagship)', series: 'VX All-in-One', ports: 20, capacity: 13000000, maxRes: '4K×2K@60Hz (12 Layers, 4x 10G OPT)' },

  // 2. NovaStar Taurus Series Multimedia Players (Standalone / Cloud / Digital Signage)
  { name: 'NovaStar TB30', series: 'Taurus Player', ports: 2, capacity: 1300000, maxRes: '1920×1080@60Hz (W/H max 4096px)' },
  { name: 'NovaStar TB50 / TB60', series: 'Taurus Player', ports: 4, capacity: 2300000, maxRes: '4096×4096 Max Pixels' },
  { name: 'NovaStar TU20 Pro', series: 'Taurus All-in-One', ports: 4, capacity: 2600000, maxRes: '3840×2160 4K UHD Input' },

  // 3. NovaStar MCTRL Master Sending Controllers (Independent Sending Unit)
  { name: 'NovaStar MCTRL300', series: 'MCTRL Master', ports: 2, capacity: 1300000, maxRes: '1920×1200@60Hz' },
  { name: 'NovaStar MCTRL600', series: 'MCTRL Master', ports: 4, capacity: 2300000, maxRes: '1920×1200@60Hz' },
  { name: 'NovaStar MCTRL660 PRO', series: 'MCTRL Pro', ports: 6, capacity: 3900000, maxRes: '1920×1080@60Hz (Ultra-Low Latency)' },
  { name: 'NovaStar MCTRL4K', series: 'MCTRL 4K', ports: 16, capacity: 10400000, maxRes: '4096×2160@60Hz True 4K HDR' },

  // 4. NovaStar Flagship COEX Series (Virtual Production & Broadcast)
  { name: 'NovaStar MX40 Pro (COEX)', series: 'COEX Flagship', ports: 20, capacity: 13000000, maxRes: '8K×1K / 4K×2K 12bit 4:4:4' }
];

export const STANDARD_RATIOS = [
  { label: '16:9 (Standard Widescreen HD/4K)', ratio: 16 / 9, w: 16, h: 9 },
  { label: '4:3 (Traditional/Broadcast)', ratio: 4 / 3, w: 4, h: 3 },
  { label: '21:9 (Ultrawide Cinema)', ratio: 21 / 9, w: 21, h: 9 },
  { label: '32:9 (Super Ultrawide Banner)', ratio: 32 / 9, w: 32, h: 9 },
  { label: '1:1 (Square)', ratio: 1 / 1, w: 1, h: 1 },
  { label: '9:16 (Portrait / Vertical Mobile)', ratio: 9 / 16, w: 9, h: 16 },
  { label: '5:3 (Stage Video Wall)', ratio: 5 / 3, w: 5, h: 3 }
];
