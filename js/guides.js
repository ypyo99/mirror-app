/**
 * Guides Module - Grid, Symmetry Center Line & Face Oval Overlays
 */

export class GuideController {
  constructor() {
    this.gridEl = document.querySelector('.grid-3x3');
    this.symmetryEl = document.querySelector('.symmetry-line');
    this.faceOvalEl = document.querySelector('.face-oval');

    this.isGridOn = false;
    this.isSymmetryOn = false;
    this.isOvalOn = false;
  }

  toggleGrid(forced) {
    this.isGridOn = typeof forced === 'boolean' ? forced : !this.isGridOn;
    if (this.gridEl) {
      if (this.isGridOn) this.gridEl.classList.remove('hidden');
      else this.gridEl.classList.add('hidden');
    }
    return this.isGridOn;
  }

  toggleSymmetry(forced) {
    this.isSymmetryOn = typeof forced === 'boolean' ? forced : !this.isSymmetryOn;
    if (this.symmetryEl) {
      if (this.isSymmetryOn) this.symmetryEl.classList.remove('hidden');
      else this.symmetryEl.classList.add('hidden');
    }
    return this.isSymmetryOn;
  }

  toggleOval(forced) {
    this.isOvalOn = typeof forced === 'boolean' ? forced : !this.isOvalOn;
    if (this.faceOvalEl) {
      if (this.isOvalOn) this.faceOvalEl.classList.remove('hidden');
      else this.faceOvalEl.classList.add('hidden');
    }
    return this.isOvalOn;
  }

  isAnyGuideActive() {
    return this.isGridOn || this.isSymmetryOn || this.isOvalOn;
  }
}
