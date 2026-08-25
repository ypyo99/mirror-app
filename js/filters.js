/**
 * Filters Module - Live Color Filters, Contrast, Brightness & Canvas Export Shaders
 */

export class FilterController {
  constructor(viewportContainer) {
    this.container = viewportContainer;
    this.activeFilter = 'normal';
    this.brightness = 100; // 50% ~ 180%
    this.contrast = 100;   // 70% ~ 150%

    this.init();
  }

  init() {
    this.applyFilters();
  }

  setFilter(filterName) {
    this.activeFilter = filterName;
    this.applyFilters();
  }

  setBrightness(val) {
    this.brightness = Math.max(50, Math.min(180, Number(val)));
    this.applyFilters();
  }

  setContrast(val) {
    this.contrast = Math.max(70, Math.min(150, Number(val)));
    this.applyFilters();
  }

  getFilterString() {
    const b = (this.brightness / 100).toFixed(2);
    const c = (this.contrast / 100).toFixed(2);

    switch (this.activeFilter) {
      case 'crisp':
        return `brightness(${b}) contrast(${Math.min(2.0, c * 1.25).toFixed(2)}) saturate(1.2)`;
      case 'beauty':
        return `brightness(${Math.min(1.8, b * 1.08).toFixed(2)}) contrast(${Math.max(0.8, c * 0.95).toFixed(2)}) saturate(1.08)`;
      case 'bw':
        return `grayscale(100%) contrast(${Math.min(2.0, c * 1.3).toFixed(2)}) brightness(${b})`;
      case 'warm':
        return `sepia(0.25) saturate(1.2) brightness(${b}) contrast(${c})`;
      case 'cool':
        return `hue-rotate(180deg) sepia(0.12) brightness(${b}) contrast(${c})`;
      case 'normal':
      default:
        return `brightness(${b}) contrast(${c})`;
    }
  }

  applyFilters() {
    const filterStr = this.getFilterString();
    const video = document.getElementById('camera-video');
    const freezeCanvas = document.getElementById('freeze-canvas');
    const simCanvas = document.getElementById('sim-canvas');

    if (video) video.style.filter = filterStr;
    if (freezeCanvas) freezeCanvas.style.filter = filterStr;
    if (simCanvas) simCanvas.style.filter = filterStr;
  }
}
