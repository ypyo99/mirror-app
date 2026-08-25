/**
 * Lighting Module - Screen Ring Light & Border Fill Light Controls
 */

export class LightingController {
  constructor(ringElement, quickLightBtn) {
    this.ring = ringElement;
    this.quickBtn = quickLightBtn;
    
    this.isOn = false;
    this.mood = 'white';
    this.intensity = 70; // 10 ~ 100%
    this.thickness = 30; // 15 ~ 60px

    this.moodColors = {
      white: '#ffffff',
      warm: '#ffb74d',
      cool: '#81d4fa',
      pink: '#f48fb1',
      sunset: '#ff8a65'
    };

    this.init();
  }

  init() {
    this.updateStyles();
  }

  toggle() {
    this.isOn = !this.isOn;
    if (this.isOn) {
      this.ring.classList.remove('light-off');
      this.ring.classList.add('light-on');
      this.quickBtn.classList.add('active');
    } else {
      this.ring.classList.remove('light-on');
      this.ring.classList.add('light-off');
      this.quickBtn.classList.remove('active');
    }
    return this.isOn;
  }

  setMood(moodKey) {
    if (this.moodColors[moodKey]) {
      this.mood = moodKey;
      if (!this.isOn) this.toggle(); // Auto turn on if selecting a mood
      this.updateStyles();
    }
  }

  setIntensity(val) {
    this.intensity = Math.max(10, Math.min(100, Number(val)));
    this.updateStyles();
  }

  setThickness(val) {
    this.thickness = Math.max(15, Math.min(60, Number(val)));
    this.updateStyles();
  }

  updateStyles() {
    const color = this.moodColors[this.mood] || '#ffffff';
    document.documentElement.style.setProperty('--light-color', color);
    document.documentElement.style.setProperty('--light-size', `${this.thickness}px`);
    document.documentElement.style.setProperty('--light-intensity', (this.intensity / 100).toFixed(2));
  }

  getColorHex() {
    return this.moodColors[this.mood] || '#ffffff';
  }
}
