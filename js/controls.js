/**
 * Controls Module - Touch Gestures (Pinch-to-zoom, Double-tap, Swipes), Drawer Panels & HUD
 */

export class ControlController {
  constructor(appContainer, cameraController, filterController) {
    this.app = appContainer;
    this.camera = cameraController;
    this.filters = filterController;

    this.touchSurface = document.getElementById('touch-surface');
    this.hudIndicator = document.getElementById('hud-indicator');
    this.hudText = this.hudIndicator ? this.hudIndicator.querySelector('.hud-text') : null;
    this.hudIcon = this.hudIndicator ? this.hudIndicator.querySelector('.hud-icon') : null;
    this.hudTimer = null;

    this.activeDrawerId = null;
    this.isZenMode = false;

    this.initTouchGestures();
    this.initDrawers();
  }

  showHUD(text, icon = '✨', duration = 1200) {
    if (!this.hudIndicator || !this.hudText) return;
    this.hudText.textContent = text;
    if (this.hudIcon) this.hudIcon.textContent = icon;

    this.hudIndicator.classList.remove('hidden');
    this.hudIndicator.style.opacity = '1';

    if (this.hudTimer) clearTimeout(this.hudTimer);
    this.hudTimer = setTimeout(() => {
      this.hudIndicator.style.opacity = '0';
      setTimeout(() => this.hudIndicator.classList.add('hidden'), 250);
    }, duration);
  }

  toggleZenMode() {
    this.isZenMode = !this.isZenMode;
    if (this.isZenMode) {
      this.closeAllDrawers();
      this.app.classList.add('ui-hidden');
      this.showHUD('화면을 터치하면 메뉴가 나타납니다', '👆', 1500);
    } else {
      this.app.classList.remove('ui-hidden');
    }
  }

  initTouchGestures() {
    if (!this.touchSurface) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let initialPinchDistance = null;
    let initialZoom = 1.0;
    let lastTapTime = 0;
    let isMultiTouch = false;

    const getDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    this.touchSurface.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isMultiTouch = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      } else if (e.touches.length === 2) {
        isMultiTouch = true;
        initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        initialZoom = this.camera.zoom;
      }
    }, { passive: true });

    this.touchSurface.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialPinchDistance) {
        // Pinch-to-zoom
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDistance / initialPinchDistance;
        const newZoom = Math.max(1.0, Math.min(5.0, initialZoom * scaleChange));
        this.camera.setZoom(newZoom);
        this.syncZoomUI(newZoom);
        this.showHUD(`확대: ${newZoom.toFixed(1)}x`, '🔍', 800);
      } else if (e.touches.length === 1 && !isMultiTouch) {
        const deltaY = touchStartY - e.touches[0].clientY;
        const screenWidth = window.innerWidth;
        const isLeftSide = touchStartX < screenWidth / 2;

        if (Math.abs(deltaY) > 15) {
          if (isLeftSide) {
            // Adjust brightness with vertical swipe on left side
            const bDelta = deltaY * 0.4;
            const newBrightness = Math.max(50, Math.min(180, this.filters.brightness + (deltaY > 0 ? 1.5 : -1.5)));
            this.filters.setBrightness(newBrightness);
            this.syncBrightnessUI(newBrightness);
            this.showHUD(`밝기: ${Math.round(newBrightness)}%`, '☀️', 700);
          } else {
            // Adjust zoom with vertical swipe on right side
            const newZoom = Math.max(1.0, Math.min(5.0, this.camera.zoom + (deltaY > 0 ? 0.05 : -0.05)));
            this.camera.setZoom(newZoom);
            this.syncZoomUI(newZoom);
            this.showHUD(`확대: ${newZoom.toFixed(1)}x`, '🔍', 700);
          }
          touchStartY = e.touches[0].clientY;
        }
      }
    }, { passive: true });

    this.touchSurface.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        initialPinchDistance = null;
        const touchDuration = Date.now() - touchStartTime;

        if (!isMultiTouch && touchDuration < 300) {
          const now = Date.now();
          if (now - lastTapTime < 300) {
            // Double tap detected -> toggle quick 2x zoom
            const nextZoom = this.camera.zoom > 1.5 ? 1.0 : 2.0;
            this.camera.setZoom(nextZoom);
            this.syncZoomUI(nextZoom);
            this.showHUD(`빠른 확대: ${nextZoom.toFixed(1)}x`, '⚡', 1000);
            lastTapTime = 0;
          } else {
            lastTapTime = now;
            setTimeout(() => {
              if (lastTapTime === now) {
                // Single tap -> Toggle Zen Mode
                this.toggleZenMode();
              }
            }, 300);
          }
        }
      }
    });

    // Fallback for desktop mouse clicks on touch surface
    this.touchSurface.addEventListener('click', (e) => {
      // If triggered by mouse
      if (e.pointerType === 'mouse' || !window.matchMedia('(pointer: coarse)').matches) {
        this.toggleZenMode();
      }
    });
  }

  initDrawers() {
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const closeBtns = document.querySelectorAll('.btn-close-panel');

    subTabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetPanelId = btn.dataset.panel;
        this.toggleDrawer(targetPanelId, btn);
      });
    });

    closeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllDrawers();
      });
    });
  }

  toggleDrawer(panelId, tabBtn) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const isCurrentActive = this.activeDrawerId === panelId;

    this.closeAllDrawers();

    if (!isCurrentActive) {
      panel.classList.remove('hidden');
      if (tabBtn) tabBtn.classList.add('active');
      this.activeDrawerId = panelId;
    }
  }

  closeAllDrawers() {
    const panels = document.querySelectorAll('.drawer-panel');
    const subTabs = document.querySelectorAll('.sub-tab-btn');

    panels.forEach(p => p.classList.add('hidden'));
    subTabs.forEach(t => t.classList.remove('active'));
    this.activeDrawerId = null;
  }

  syncZoomUI(zoomVal) {
    const slider = document.getElementById('slider-zoom');
    const valText = document.getElementById('slider-zoom-val');
    if (slider) slider.value = zoomVal;
    if (valText) valText.textContent = `${zoomVal.toFixed(1)}x`;

    const chips = document.querySelectorAll('.zoom-chip');
    chips.forEach(chip => {
      const chipVal = parseFloat(chip.dataset.zoom);
      chip.classList.toggle('active', Math.abs(chipVal - zoomVal) < 0.1);
    });
  }

  syncBrightnessUI(brightnessVal) {
    const slider = document.getElementById('slider-brightness');
    const valText = document.getElementById('slider-brightness-val');
    if (slider) slider.value = brightnessVal;
    if (valText) valText.textContent = `${Math.round(brightnessVal)}%`;
  }
}
