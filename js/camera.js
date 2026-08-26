/**
 * Camera Module - Handles Camera Stream, Resolution, Facing Mode & Simulation Fallback
 */

export class CameraController {
  constructor(videoElement, simCanvasElement, onStreamReady, onCameraError) {
    this.video = videoElement;
    this.simCanvas = simCanvasElement;
    this.onStreamReady = onStreamReady;
    this.onCameraError = onCameraError;
    
    this.stream = null;
    this.facingMode = 'user'; // 'user' (전면) or 'environment' (후면)
    this.isSimulation = false;
    this.simAnimationId = null;
    this.zoom = 1.0;
  }

  async startCamera(facingMode = this.facingMode) {
    this.facingMode = facingMode;
    this.stopSimulation();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Samsung Galaxy & Android optimized resolution candidates (4K UHD -> QHD -> FHD)
    const isGalaxy = /Android|SM-|Samsung/i.test(navigator.userAgent);
    console.log(`[Smart Mirror] Device profile: ${isGalaxy ? 'Samsung Galaxy / Android' : 'Standard Device'}`);

    const resolutionCandidates = [
      // 4K Ultra HD / 4:3 Sensor Native
      { width: { ideal: 3840, min: 1920 }, height: { ideal: 2160, min: 1080 }, frameRate: { ideal: 60, min: 30 } },
      { width: { ideal: 4032, min: 1920 }, height: { ideal: 3024, min: 1080 } },
      // 2K QHD
      { width: { ideal: 2560, min: 1280 }, height: { ideal: 1440, min: 720 }, frameRate: { ideal: 60, min: 30 } },
      // Full HD 1080p
      { width: { ideal: 1920, min: 1080 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 60, min: 30 } },
      { width: { ideal: 1280 }, height: { ideal: 720 } }
    ];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('이 브라우저는 카메라 API를 지원하지 않습니다.');
      }

      let stream = null;
      for (const res of resolutionCandidates) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: this.facingMode },
              resizeMode: 'none', // Prevents Android/Galaxy Camera HAL from downsampling
              ...res
            }
          });
          if (stream) break;
        } catch (resErr) {
          // Try next candidate
        }
      }

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: this.facingMode } }
        });
      }

      this.stream = stream;
      const track = stream.getVideoTracks()[0];

      // Galaxy / Android Hardware Max Capabilities Auto-Upgrade
      if (track && track.getCapabilities) {
        try {
          const caps = track.getCapabilities();
          if (caps.width && caps.height && (caps.width.max > 1920 || caps.height.max > 1080)) {
            console.log(`[Smart Mirror] Upgrading Galaxy Camera to hardware max: ${caps.width.max}x${caps.height.max}`);
            await track.applyConstraints({
              width: { ideal: caps.width.max },
              height: { ideal: caps.height.max },
              frameRate: caps.frameRate ? { ideal: caps.frameRate.max } : undefined,
              advanced: [{ resizeMode: 'none' }]
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('Hardware max constraint upgrade bypassed:', e);
        }
      }

      this.video.srcObject = stream;
      this.isSimulation = false;
      this.video.classList.remove('hidden');
      this.simCanvas.classList.add('hidden');

      await this.video.play();
      this.video.classList.add('ready');

      const emitResolution = () => {
        this.video.classList.add('ready');
        const currentTrack = this.stream ? this.stream.getVideoTracks()[0] : null;
        const settings = currentTrack ? currentTrack.getSettings() : {};
        const actualWidth = settings.width || this.video.videoWidth || 1920;
        const actualHeight = settings.height || this.video.videoHeight || 1080;
        console.log(`[Smart Mirror] Galaxy/Device Active Resolution: ${actualWidth}x${actualHeight}`);
        if (this.onStreamReady) this.onStreamReady(this.video, { width: actualWidth, height: actualHeight, isSim: false });
      };

      if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
        emitResolution();
      } else {
        this.video.onloadeddata = () => emitResolution();
        this.video.onloadedmetadata = () => emitResolution();
        this.video.onplaying = () => emitResolution();
      }
      return true;
    } catch (err) {
      console.warn('Camera access failed or unavailable, starting simulation mode:', err);
      if (this.onCameraError) this.onCameraError(err);
      this.startSimulation();
      return false;
    }
  }

  async switchCamera() {
    const nextMode = this.facingMode === 'user' ? 'environment' : 'user';
    return await this.startCamera(nextMode);
  }

  setZoom(zoomFactor) {
    this.zoom = Math.max(1.0, Math.min(5.0, zoomFactor));
    document.documentElement.style.setProperty('--zoom-factor', this.zoom);

    // Try hardware zoom if supported by the video track
    if (this.stream) {
      const track = this.stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.zoom) {
          const targetZoom = Math.min(capabilities.zoom.max, Math.max(capabilities.zoom.min, this.zoom));
          track.applyConstraints({ advanced: [{ zoom: targetZoom }] }).catch(() => {});
        }
      }
    }
  }

  getCurrentSource() {
    return this.isSimulation ? this.simCanvas : this.video;
  }

  /**
   * 데모 / 시뮬레이션 모드:
   * 웹캠이 연결되지 않았거나 테스트 환경일 때도 모든 기능(줌, 필터, 조명, 일시정지, 촬영)을
   * 생생하게 체험할 수 있도록 고화질 뷰티 인물 시뮬레이션을 실시간 렌더링합니다.
   */
  startSimulation() {
    this.isSimulation = true;
    this.video.classList.add('hidden');
    this.simCanvas.classList.remove('hidden');

    const ctx = this.simCanvas.getContext('2d');
    const width = 1080;
    const height = 1920;
    this.simCanvas.width = width;
    this.simCanvas.height = height;

    let time = 0;
    const renderSim = () => {
      time += 0.03;
      ctx.clearRect(0, 0, width, height);

      // 1. Background studio lighting gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height * 0.4, 100, width / 2, height / 2, height * 0.7);
      bgGrad.addColorStop(0, '#2b2d42');
      bgGrad.addColorStop(0.6, '#181926');
      bgGrad.addColorStop(1, '#0c0d14');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle breathing motion
      const breath = Math.sin(time * 1.5) * 4;
      const eyeBlink = (Math.sin(time * 0.8) > 0.97) ? 0.1 : 1.0;

      // 2. Shoulders & Torso
      ctx.fillStyle = '#222533';
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.85 + breath, 360, 240, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neck
      ctx.fillStyle = '#f6d5c1';
      ctx.fillRect(width / 2 - 65, height * 0.52 + breath, 130, 200);

      // 3. Hair (Back)
      ctx.fillStyle = '#1c1719';
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.42 + breath, 220, 260, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Face Shape
      const faceGrad = ctx.createLinearGradient(0, height * 0.25, 0, height * 0.65);
      faceGrad.addColorStop(0, '#fde6d8');
      faceGrad.addColorStop(0.7, '#f7d2bf');
      faceGrad.addColorStop(1, '#eebfa9');
      ctx.fillStyle = faceGrad;
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.42 + breath, 155, 205, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cheeks Blush
      ctx.fillStyle = 'rgba(255, 120, 150, 0.22)';
      ctx.beginPath();
      ctx.ellipse(width / 2 - 75, height * 0.45 + breath, 38, 24, 0, 0, Math.PI * 2);
      ctx.ellipse(width / 2 + 75, height * 0.45 + breath, 38, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Eyes
      const eyeY = height * 0.39 + breath;
      const leftEyeX = width / 2 - 58;
      const rightEyeX = width / 2 + 58;

      // Eyebrows
      ctx.strokeStyle = '#2b2123';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY - 26, 32, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY - 26, 32, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Eye Whites & Iris
      const drawEye = (ex, ey) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 24, 14 * eyeBlink, 0, 0, Math.PI * 2);
        ctx.fill();

        if (eyeBlink > 0.3) {
          // Iris
          const irisGrad = ctx.createRadialGradient(ex, ey, 2, ex, ey, 12);
          irisGrad.addColorStop(0, '#593d2b');
          irisGrad.addColorStop(1, '#2c180e');
          ctx.fillStyle = irisGrad;
          ctx.beginPath();
          ctx.arc(ex, ey, 10, 0, Math.PI * 2);
          ctx.fill();

          // Pupil & Catchlight
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ex, ey, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex + 3, ey - 3, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      drawEye(leftEyeX, eyeY);
      drawEye(rightEyeX, eyeY);

      // 6. Nose
      ctx.strokeStyle = 'rgba(180, 110, 80, 0.4)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, eyeY + 8);
      ctx.quadraticCurveTo(width / 2 + 10, eyeY + 45, width / 2, eyeY + 52);
      ctx.quadraticCurveTo(width / 2 - 12, eyeY + 52, width / 2 - 4, eyeY + 44);
      ctx.stroke();

      // 7. Lips
      const lipY = height * 0.52 + breath;
      ctx.fillStyle = '#e65c78';
      ctx.beginPath();
      // Upper lip
      ctx.moveTo(width / 2 - 42, lipY);
      ctx.quadraticCurveTo(width / 2 - 20, lipY - 14, width / 2, lipY - 6);
      ctx.quadraticCurveTo(width / 2 + 20, lipY - 14, width / 2 + 42, lipY);
      // Lower lip
      ctx.quadraticCurveTo(width / 2, lipY + 22, width / 2 - 42, lipY);
      ctx.fill();

      // Lip highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(width / 2, lipY + 6, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 8. Hair (Front bangs & styling)
      ctx.fillStyle = '#221c1e';
      ctx.beginPath();
      ctx.moveTo(width / 2 - 160, height * 0.35 + breath);
      ctx.quadraticCurveTo(width / 2 - 80, height * 0.22 + breath, width / 2, height * 0.25 + breath);
      ctx.quadraticCurveTo(width / 2 + 80, height * 0.22 + breath, width / 2 + 160, height * 0.35 + breath);
      ctx.quadraticCurveTo(width / 2 + 120, height * 0.15 + breath, width / 2, height * 0.15 + breath);
      ctx.quadraticCurveTo(width / 2 - 120, height * 0.15 + breath, width / 2 - 160, height * 0.35 + breath);
      ctx.fill();

      // Simulation watermark/tag at top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 24px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ 스마트 거울 체험 데모 모드 ✨', width / 2, 80);

      this.simAnimationId = requestAnimationFrame(renderSim);
    };

    renderSim();
    if (this.onStreamReady) this.onStreamReady(this.simCanvas, { width: 1080, height: 1920, isSim: true });
  }

  stopSimulation() {
    if (this.simAnimationId) {
      cancelAnimationFrame(this.simAnimationId);
      this.simAnimationId = null;
    }
  }
}
