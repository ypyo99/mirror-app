/**
 * Main Application Coordinator - Smart Mirror HD
 */

import { CameraController } from './camera.js';
import { LightingController } from './lights.js';
import { FilterController } from './filters.js';
import { CaptureController } from './capture.js';
import { GuideController } from './guides.js';
import { ControlController } from './controls.js';

class SmartMirrorApp {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.videoEl = document.getElementById('camera-video');
    this.simCanvasEl = document.getElementById('sim-canvas');
    this.lightRingEl = document.getElementById('light-ring');
    this.btnQuickLight = document.getElementById('btn-quick-light');

    this.init();
  }

  async init() {
    // 1. Initialize Sub-Controllers
    this.lights = new LightingController(this.lightRingEl, this.btnQuickLight);
    this.filters = new FilterController(document.getElementById('viewport-container'));
    this.guides = new GuideController();

    this.camera = new CameraController(
      this.videoEl,
      this.simCanvasEl,
      (source) => this.handleStreamReady(source),
      (err) => this.handleCameraError(err)
    );

    this.capture = new CaptureController(this.camera, this.filters, this.lights);
    this.controls = new ControlController(this.appContainer, this.camera, this.filters);

    // 2. Bind Event Listeners
    this.bindTopBarEvents();
    this.bindLightingPanelEvents();
    this.bindFiltersPanelEvents();
    this.bindZoomPanelEvents();
    this.bindTimerAndGuideEvents();
    this.bindPrimaryActionEvents();
    this.bindModalEvents();
    this.bindKeyboardShortcuts();

    // 3. Start Camera (or Fallback Demo)
    await this.camera.startCamera('user');
  }

  handleStreamReady(source, resInfo) {
    const permModal = document.getElementById('camera-prompt-modal');
    if (permModal) permModal.classList.add('hidden');
    
    const resBadgeText = document.getElementById('res-badge-text');
    const resBadge = document.getElementById('res-badge');

    if (resInfo && resInfo.width && resInfo.height) {
      this.currentResolution = resInfo;
      const w = resInfo.width;
      const h = resInfo.height;
      const is4K = w >= 3840 || h >= 3840;
      const isQHD = (w >= 2560 || h >= 2560) && !is4K;
      const isFHD = (w >= 1920 || h >= 1920 || (w >= 1080 && h >= 1080)) && !is4K && !isQHD;
      
      const tierLabel = is4K ? '4K UHD' : (isQHD ? '2K QHD' : (isFHD ? 'FHD' : 'HD'));
      const displayStr = `${tierLabel} ${w}×${h}`;

      if (resBadgeText) resBadgeText.textContent = displayStr;
      if (resBadge) resBadge.title = `카메라 해상도: ${w} × ${h} (${tierLabel})`;

      this.controls.showHUD(`최대 해상도 연결: ${displayStr}`, '✨', 2000);
    } else {
      if (resBadgeText) resBadgeText.textContent = 'FHD 1080p';
      this.controls.showHUD('스마트 거울 준비 완료 ✨', '🪞', 1200);
    }
  }

  handleCameraError(err) {
    const permModal = document.getElementById('camera-prompt-modal');
    if (permModal) permModal.classList.remove('hidden');
  }

  // ------------------------------------------------------------------------
  // Top Bar Handlers
  // ------------------------------------------------------------------------
  bindTopBarEvents() {
    // 0. Resolution Badge Click
    const resBadge = document.getElementById('res-badge');
    if (resBadge) {
      resBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentResolution) {
          const { width, height, isSim } = this.currentResolution;
          const msg = isSim
            ? `데모 모드 해상도: ${width}×${height}`
            : `카메라 실시간 해상도: ${width}×${height} (최고 화질)`;
          this.controls.showHUD(msg, '🔍', 2000);
        } else {
          this.controls.showHUD('해상도: 1080×1920 (고화질)', '🔍', 1500);
        }
      });
    }

    // 1. Mirror Mode vs True View Mode Toggle
    const btnModeToggle = document.getElementById('btn-mode-toggle');
    const modeText = document.getElementById('mode-text');

    btnModeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMirror = this.appContainer.classList.contains('mirror-mode');

      if (isMirror) {
        this.appContainer.classList.remove('mirror-mode');
        this.appContainer.classList.add('true-mode');
        modeText.textContent = '남이 보는 시점';
        this.controls.showHUD('실제 남이 보는 내 모습 (True View)', '👀', 1500);
      } else {
        this.appContainer.classList.remove('true-mode');
        this.appContainer.classList.add('mirror-mode');
        modeText.textContent = '거울 모드';
        this.controls.showHUD('거울 모드 (좌우 반전)', '🪞', 1500);
      }
    });

    // 2. Camera Flip (Front / Back)
    const btnCameraFlip = document.getElementById('btn-camera-flip');
    btnCameraFlip.addEventListener('click', async (e) => {
      e.stopPropagation();
      btnCameraFlip.style.transform = 'rotate(180deg)';
      await this.camera.switchCamera();
      setTimeout(() => {
        btnCameraFlip.style.transform = '';
      }, 300);
      this.controls.showHUD(this.camera.facingMode === 'user' ? '전면 카메라' : '후면 카메라', '📷', 1200);
    });

    // 3. Guide Grid Menu Toggle
    const btnGuideMenu = document.getElementById('btn-guide-menu');
    btnGuideMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.controls.toggleDrawer('panel-timer', null);
    });

    // 4. Fullscreen Toggle
    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        this.controls.showHUD('전체 화면', '⛶', 1000);
      } else {
        document.exitFullscreen().catch(() => {});
        this.controls.showHUD('전체 화면 해제', '⛶', 1000);
      }
    });

    // 5. Info Modal
    const btnInfo = document.getElementById('btn-info');
    btnInfo.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('info-modal').classList.remove('hidden');
    });
  }

  // ------------------------------------------------------------------------
  // Lighting Panel Handlers
  // ------------------------------------------------------------------------
  bindLightingPanelEvents() {
    const moodChips = document.querySelectorAll('.mood-chip');
    moodChips.forEach(chip => {
      chip.addEventListener('click', () => {
        moodChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const mood = chip.dataset.mood;
        this.lights.setMood(mood);
        this.controls.showHUD(`조명: ${chip.textContent.trim()}`, '💡', 1000);
      });
    });

    const intensitySlider = document.getElementById('light-intensity');
    const intensityVal = document.getElementById('light-intensity-val');
    intensitySlider.addEventListener('input', (e) => {
      const val = e.target.value;
      intensityVal.textContent = `${val}%`;
      this.lights.setIntensity(val);
    });

    const thicknessSlider = document.getElementById('light-thickness');
    const thicknessVal = document.getElementById('light-thickness-val');
    thicknessSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.lights.setThickness(val);
      let label = '보통';
      if (val < 22) label = '얇게';
      else if (val > 45) label = '넓게';
      thicknessVal.textContent = label;
    });
  }

  // ------------------------------------------------------------------------
  // Filters Panel Handlers
  // ------------------------------------------------------------------------
  bindFiltersPanelEvents() {
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filterKey = chip.dataset.filter;
        this.filters.setFilter(filterKey);
        this.controls.showHUD(`필터: ${chip.querySelector('span:last-child').textContent}`, '✨', 1000);
      });
    });

    const contrastSlider = document.getElementById('filter-contrast');
    const contrastVal = document.getElementById('filter-contrast-val');
    contrastSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      contrastVal.textContent = `${val}%`;
      this.filters.setContrast(val);
    });
  }

  // ------------------------------------------------------------------------
  // Zoom & Brightness Panel Handlers
  // ------------------------------------------------------------------------
  bindZoomPanelEvents() {
    const zoomSlider = document.getElementById('slider-zoom');
    zoomSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.camera.setZoom(val);
      this.controls.syncZoomUI(val);
    });

    const brightnessSlider = document.getElementById('slider-brightness');
    brightnessSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.filters.setBrightness(val);
      this.controls.syncBrightnessUI(val);
    });

    // Quick Zoom Dock Badges (Right side floating chips)
    const quickChips = document.querySelectorAll('.zoom-chip');
    quickChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const zoomVal = parseFloat(chip.dataset.zoom);
        this.camera.setZoom(zoomVal);
        this.controls.syncZoomUI(zoomVal);
        this.controls.showHUD(`확대: ${zoomVal.toFixed(1)}x`, '🔍', 800);
      });
    });
  }

  // ------------------------------------------------------------------------
  // Timer & Guides Panel Handlers
  // ------------------------------------------------------------------------
  bindTimerAndGuideEvents() {
    // Timer selector chips
    const timerChips = document.querySelectorAll('.timer-chip');
    const shutterBadge = document.getElementById('shutter-timer-badge');

    timerChips.forEach(chip => {
      chip.addEventListener('click', () => {
        timerChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const seconds = parseInt(chip.dataset.timer, 10);
        this.capture.timerSeconds = seconds;

        if (seconds > 0) {
          shutterBadge.textContent = `${seconds}s`;
          shutterBadge.classList.remove('hidden');
          this.controls.showHUD(`타이머: ${seconds}초`, '⏱️', 1000);
        } else {
          shutterBadge.classList.add('hidden');
          this.controls.showHUD('타이머: 즉시 촬영', '📸', 1000);
        }
      });
    });

    // Guide toggles
    const guideGridBtn = document.getElementById('guide-opt-grid');
    const guideSymmetryBtn = document.getElementById('guide-opt-symmetry');
    const guideOvalBtn = document.getElementById('guide-opt-oval');
    const btnGuideMenu = document.getElementById('btn-guide-menu');

    const updateTopGuideIconState = () => {
      btnGuideMenu.classList.toggle('active', this.guides.isAnyGuideActive());
    };

    guideGridBtn.addEventListener('click', () => {
      const isOn = this.guides.toggleGrid();
      guideGridBtn.classList.toggle('active', isOn);
      updateTopGuideIconState();
      this.controls.showHUD(isOn ? '3x3 격자 켜짐' : '3x3 격자 꺼짐', '📐', 800);
    });

    guideSymmetryBtn.addEventListener('click', () => {
      const isOn = this.guides.toggleSymmetry();
      guideSymmetryBtn.classList.toggle('active', isOn);
      updateTopGuideIconState();
      this.controls.showHUD(isOn ? '대칭 중심선 켜짐' : '대칭 중심선 꺼짐', '📏', 800);
    });

    guideOvalBtn.addEventListener('click', () => {
      const isOn = this.guides.toggleOval();
      guideOvalBtn.classList.toggle('active', isOn);
      updateTopGuideIconState();
      this.controls.showHUD(isOn ? '얼굴 가이드 켜짐' : '얼굴 가이드 꺼짐', '👤', 800);
    });

    // Sound toggle
    const chkSound = document.getElementById('chk-sound');
    chkSound.addEventListener('change', (e) => {
      this.capture.soundEnabled = e.target.checked;
      this.controls.showHUD(e.target.checked ? '효과음 켜짐' : '효과음 꺼짐', '🔔', 800);
    });
  }

  // ------------------------------------------------------------------------
  // Primary Action Bar Handlers (Freeze, Shutter, Quick Light)
  // ------------------------------------------------------------------------
  bindPrimaryActionEvents() {
    // 1. Freeze Frame Button
    const btnFreeze = document.getElementById('btn-freeze');
    btnFreeze.addEventListener('click', (e) => {
      e.stopPropagation();
      const isFrozen = this.capture.toggleFreeze();
      this.controls.showHUD(isFrozen ? '화면 일시정지 (멈춤)' : '실시간 거울 재생', isFrozen ? '⏸️' : '▶️', 1200);
    });

    // 2. Save Frozen Frame Button (Top badge)
    const btnSaveFrozen = document.getElementById('btn-save-frozen');
    btnSaveFrozen.addEventListener('click', (e) => {
      e.stopPropagation();
      this.capture.executeCapture((dataUrl) => this.openPreviewModal(dataUrl));
    });

    // 3. Shutter Capture Button
    const btnShutter = document.getElementById('btn-shutter');
    btnShutter.addEventListener('click', (e) => {
      e.stopPropagation();
      this.controls.closeAllDrawers();
      this.capture.startCaptureSequence((dataUrl) => this.openPreviewModal(dataUrl));
    });

    // 4. Quick Light Toggle Button
    this.btnQuickLight.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOn = this.lights.toggle();
      this.controls.showHUD(isOn ? '조명 켜짐' : '조명 꺼짐', '💡', 1000);
    });
  }

  // ------------------------------------------------------------------------
  // Modals & Preview Handlers
  // ------------------------------------------------------------------------
  bindModalEvents() {
    // Preview Modal
    const previewModal = document.getElementById('preview-modal');
    const previewImg = document.getElementById('preview-image');
    const btnClosePreview = document.getElementById('btn-close-preview');
    const btnRetake = document.getElementById('btn-retake-photo');
    const btnDownload = document.getElementById('btn-download-photo');
    const btnShare = document.getElementById('btn-share-photo');

    let currentCapturedDataUrl = null;

    this.openPreviewModal = (dataUrl) => {
      currentCapturedDataUrl = dataUrl;
      previewImg.src = dataUrl;
      previewModal.classList.remove('hidden');
    };

    const closePreview = () => {
      previewModal.classList.add('hidden');
      previewImg.src = '';
      currentCapturedDataUrl = null;
    };

    btnClosePreview.addEventListener('click', closePreview);
    btnRetake.addEventListener('click', closePreview);
    previewModal.querySelector('.modal-backdrop').addEventListener('click', closePreview);

    btnDownload.addEventListener('click', () => {
      if (currentCapturedDataUrl) {
        this.capture.downloadPhoto(currentCapturedDataUrl);
      }
    });

    btnShare.addEventListener('click', async () => {
      if (currentCapturedDataUrl) {
        await this.capture.sharePhoto(currentCapturedDataUrl);
      }
    });

    // Info Modal
    const infoModal = document.getElementById('info-modal');
    const btnCloseInfo = document.getElementById('btn-close-info');
    const btnConfirmInfo = document.getElementById('btn-confirm-info');
    const closeInfo = () => infoModal.classList.add('hidden');

    btnCloseInfo.addEventListener('click', closeInfo);
    btnConfirmInfo.addEventListener('click', closeInfo);
    infoModal.querySelector('.modal-backdrop').addEventListener('click', closeInfo);

    // Camera Permission Modal Handlers
    const permModal = document.getElementById('camera-prompt-modal');
    const btnRetryCamera = document.getElementById('btn-retry-camera');
    const btnStartDemo = document.getElementById('btn-start-demo');

    btnRetryCamera.addEventListener('click', async () => {
      await this.camera.startCamera('user');
    });

    btnStartDemo.addEventListener('click', () => {
      permModal.classList.add('hidden');
      this.camera.startSimulation();
      this.controls.showHUD('체험 데모 모드 활성화', '✨', 1200);
    });
  }

  // ------------------------------------------------------------------------
  // Keyboard Shortcuts (Great for Desktop / Laptop Mirror use)
  // ------------------------------------------------------------------------
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
        case 'Enter':
          e.preventDefault();
          this.capture.startCaptureSequence((dataUrl) => this.openPreviewModal(dataUrl));
          break;
        case 'KeyF':
          e.preventDefault();
          this.capture.toggleFreeze();
          break;
        case 'KeyL':
          e.preventDefault();
          this.lights.toggle();
          break;
        case 'KeyM':
          e.preventDefault();
          document.getElementById('btn-mode-toggle').click();
          break;
        case 'Digit1':
          this.camera.setZoom(1.0);
          this.controls.syncZoomUI(1.0);
          break;
        case 'Digit2':
          this.camera.setZoom(2.0);
          this.controls.syncZoomUI(2.0);
          break;
        case 'Digit3':
          this.camera.setZoom(3.0);
          this.controls.syncZoomUI(3.0);
          break;
        case 'Digit5':
          this.camera.setZoom(5.0);
          this.controls.syncZoomUI(5.0);
          break;
        case 'KeyG':
          this.guides.toggleGrid();
          break;
        case 'Escape':
          this.controls.closeAllDrawers();
          document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
          break;
      }
    });
  }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', () => {
  new SmartMirrorApp();
});
