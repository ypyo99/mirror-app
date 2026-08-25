/**
 * Capture Module - Freeze Frame, Shutter, Web Audio Sound FX, High-Res Export & Sharing
 */

export class CaptureController {
  constructor(cameraController, filterController, lightingController) {
    this.camera = cameraController;
    this.filters = filterController;
    this.lights = lightingController;

    this.freezeCanvas = document.getElementById('freeze-canvas');
    this.freezeBadge = document.getElementById('freeze-badge');
    this.btnFreeze = document.getElementById('btn-freeze');
    this.iconFreezePlay = document.getElementById('icon-freeze-play');
    this.labelFreeze = document.getElementById('label-freeze');
    this.shutterFlash = document.getElementById('shutter-flash');
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownNumber = document.getElementById('countdown-number');
    
    this.isFrozen = false;
    this.timerSeconds = 0;
    this.isCountingDown = false;
    this.soundEnabled = true;

    this.audioCtx = null;
    this.init();
  }

  init() {
    // Web Audio context lazy initialized on first interaction
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playBeep(freq = 880, duration = 0.08) {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback not allowed yet:', e);
    }
  }

  playShutterSound() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      // Realistic mechanical shutter click + mirror slap
      const now = ctx.currentTime;

      // 1. First click
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400, now);
      osc1.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // 2. Second heavier click (slap)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(450, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.12);
    } catch (e) {
      console.warn('Shutter sound failed:', e);
    }
  }

  toggleFreeze() {
    if (this.isFrozen) {
      this.unfreeze();
    } else {
      this.freeze();
    }
    return this.isFrozen;
  }

  freeze() {
    const source = this.camera.getCurrentSource();
    if (!source) return;

    const width = source.videoWidth || source.width || 1080;
    const height = source.videoHeight || source.height || 1920;

    this.freezeCanvas.width = width;
    this.freezeCanvas.height = height;
    const ctx = this.freezeCanvas.getContext('2d');
    ctx.drawImage(source, 0, 0, width, height);

    this.isFrozen = true;
    this.freezeCanvas.classList.remove('hidden');
    this.freezeBadge.classList.remove('hidden');
    this.btnFreeze.classList.add('active');
    this.labelFreeze.textContent = '재생';
    this.iconFreezePlay.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
  }

  unfreeze() {
    this.isFrozen = false;
    this.freezeCanvas.classList.add('hidden');
    this.freezeBadge.classList.add('hidden');
    this.btnFreeze.classList.remove('active');
    this.labelFreeze.textContent = '일시정지';
    this.iconFreezePlay.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
  }

  triggerFlash() {
    this.shutterFlash.classList.add('flash-active');
    setTimeout(() => {
      this.shutterFlash.classList.remove('flash-active');
    }, 200);
  }

  async startCaptureSequence(onPhotoCaptured) {
    if (this.isCountingDown) return;

    if (this.timerSeconds <= 0) {
      this.executeCapture(onPhotoCaptured);
      return;
    }

    this.isCountingDown = true;
    let remaining = this.timerSeconds;
    this.countdownOverlay.classList.remove('hidden');
    this.countdownNumber.textContent = remaining;
    this.playBeep(880, 0.1);

    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        this.countdownNumber.textContent = remaining;
        this.playBeep(880, 0.1);
      } else {
        clearInterval(interval);
        this.countdownOverlay.classList.add('hidden');
        this.isCountingDown = false;
        this.playBeep(1760, 0.2); // Final high beep
        this.executeCapture(onPhotoCaptured);
      }
    }, 1000);
  }

  executeCapture(onPhotoCaptured) {
    this.triggerFlash();
    this.playShutterSound();

    const source = this.isFrozen ? this.freezeCanvas : this.camera.getCurrentSource();
    if (!source) return;

    const width = source.videoWidth || source.width || 1080;
    const height = source.videoHeight || source.height || 1920;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const ctx = outCanvas.getContext('2d');

    // Apply active filter
    ctx.filter = this.filters.getFilterString();

    // Check mirror mode
    const isMirrorMode = document.getElementById('app').classList.contains('mirror-mode');
    const zoom = this.camera.zoom || 1.0;

    ctx.save();
    ctx.translate(width / 2, height / 2);

    if (isMirrorMode) {
      ctx.scale(-zoom, zoom);
    } else {
      ctx.scale(zoom, zoom);
    }

    ctx.drawImage(source, -width / 2, -height / 2, width, height);
    ctx.restore();

    // If ring light was ON, optionally blend soft glow around image borders
    if (this.lights.isOn) {
      ctx.save();
      const glowColor = this.lights.getColorHex();
      const borderSize = (this.lights.thickness / 30) * (width * 0.03);
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = borderSize * 2;
      ctx.globalAlpha = this.lights.intensity / 100;
      ctx.strokeRect(0, 0, width, height);
      ctx.restore();
    }

    const dataUrl = outCanvas.toDataURL('image/png', 0.95);
    if (onPhotoCaptured) onPhotoCaptured(dataUrl);
  }

  downloadPhoto(dataUrl) {
    const link = document.createElement('a');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    link.download = `SmartMirror_${timestamp}.png`;
    link.href = dataUrl;
    link.click();
  }

  async sharePhoto(dataUrl) {
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'SmartMirror.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: '스마트 거울로 찍은 사진',
            text: '스마트 거울 앱으로 촬영한 사진입니다 ✨',
            files: [file]
          });
          return true;
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share error:', err);
      }
    }

    // Fallback: Copy to clipboard if possible or alert
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('사진이 클립보드에 복사되었습니다! 원하는 곳에 붙여넣기(Ctrl+V) 하세요.');
      return true;
    } catch (e) {
      this.downloadPhoto(dataUrl);
    }
  }
}
