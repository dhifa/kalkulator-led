/**
 * LED Videotron Animated Test Pattern & 4K Video Recorder Engine
 * Supports Multi-Directional Motion, Radar Expanding Ripple, and High-FPS Testing
 */

import { TestCardEngine } from './testcard-engine.js';

export class VideoTestGenerator {
  constructor(canvas, testCardEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = testCardEngine;
    this.animationId = null;
    this.isPlaying = false;
    this.calcData = null;
    this.options = {
      showMovingBar: true,
      showDigitalClock: true,
      motionMode: 'radar-pulse' // 'radar-pulse' | 'horizontal-bar' | 'vertical-bar' | 'diagonal-bar' | 'bouncing-ball' | 'rotating-radar'
    };

    // Animation state variables
    this.barPositionX = 0;
    this.barPositionY = 0;
    this.radarRadius = 0;
    this.radarAngle = 0;
    this.ballX = 100;
    this.ballY = 100;
    this.ballSpeedX = 8;
    this.ballSpeedY = 6;
    this.ballRadius = 24;

    this.frameCount = 0;
    this.fps = 60;
    this.lastTime = performance.now();
    this.currentFps = 60;

    // Dead pixel color cycle
    this.deadPixelMode = false;
    this.colorCycleIndex = 0;
    this.lastColorSwitch = 0;
    this.colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];
    this.colorNames = ['RED', 'GREEN', 'BLUE', 'WHITE', 'BLACK'];

    // MediaRecorder
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.bgCanvas = null;
    this.bgEngine = null;
  }

  setParams(calcData, options = {}) {
    this.calcData = calcData;
    this.options = { ...this.options, ...options };
    this.updateStaticBackground();
  }

  /**
   * Render static background pattern once to offscreen buffer
   * Keeps preview resolution capped to max 1920x1080 to guarantee 60 FPS without GPU lag
   */
  updateStaticBackground() {
    if (!this.calcData || !this.canvas) return;

    const nativeW = this.calcData.resolution.width;
    const nativeH = this.calcData.resolution.height;
    const aspect = nativeW / nativeH;

    // Cap preview resolution to max 1920x1080
    let pWidth = nativeW;
    let pHeight = nativeH;
    const MAX_PREVIEW_W = 1920;
    const MAX_PREVIEW_H = 1080;
    if (pWidth > MAX_PREVIEW_W || pHeight > MAX_PREVIEW_H) {
      if (pWidth / MAX_PREVIEW_W > pHeight / MAX_PREVIEW_H) {
        pWidth = MAX_PREVIEW_W;
        pHeight = Math.max(64, Math.round(MAX_PREVIEW_W / aspect));
      } else {
        pHeight = MAX_PREVIEW_H;
        pWidth = Math.max(64, Math.round(MAX_PREVIEW_H * aspect));
      }
    }

    if (this.canvas.width !== pWidth || this.canvas.height !== pHeight) {
      this.canvas.width = pWidth;
      this.canvas.height = pHeight;
    }

    if (!this.bgCanvas) {
      this.bgCanvas = document.createElement('canvas');
    }
    this.bgCanvas.width = pWidth;
    this.bgCanvas.height = pHeight;

    if (!this.bgEngine) {
      this.bgEngine = new TestCardEngine(this.bgCanvas);
    }
    if (this.engine.logoImage) {
      this.bgEngine.setLogo(this.engine.logoImage);
    }

    this.bgEngine.render(this.calcData, {
      ...this.options,
      overrideWidth: pWidth,
      overrideHeight: pHeight
    });
  }

  startAnimation() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTime = performance.now();
    this.animate();
  }

  stopAnimation() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate(now = performance.now()) {
    if (!this.isPlaying) return;

    const delta = now - this.lastTime;
    if (delta >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastTime = now;
    }
    this.frameCount++;

    if (this.calcData) {
      const w = this.canvas.width;
      const h = this.canvas.height;

      if (this.deadPixelMode) {
        if (now - this.lastColorSwitch > 2500) {
          this.colorCycleIndex = (this.colorCycleIndex + 1) % this.colors.length;
          this.lastColorSwitch = now;
        }
        this.ctx.fillStyle = this.colors[this.colorCycleIndex];
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(10, h - 35, 170, 25);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.fillText(`DEAD PIXEL: ${this.colorNames[this.colorCycleIndex]}`, 15, h - 18);
      } else {
        // Fast blit from offscreen static background buffer
        if (this.bgCanvas && this.bgCanvas.width === w && this.bgCanvas.height === h) {
          this.ctx.drawImage(this.bgCanvas, 0, 0);
        } else {
          this.updateStaticBackground();
          if (this.bgCanvas) this.ctx.drawImage(this.bgCanvas, 0, 0);
        }

        // Lightweight Motion Animation Rendering
        if (this.options.showMovingBar) {
          this.drawSelectedMotion(this.ctx, w, h, this.frameCount);
        }

        // Digital Clock & Frame Counter
        if (this.options.showDigitalClock) {
          this.drawDynamicClock(this.ctx, w, h, this.frameCount);
        }
      }
    }

    this.animationId = requestAnimationFrame(t => this.animate(t));
  }

  /**
   * Render Selected Motion Style
   */
  drawSelectedMotion(ctx, w, h, frameCount) {
    const mode = this.options.motionMode || 'radar-pulse';

    switch (mode) {
      case 'radar-pulse':
        this.drawRadarPulse(ctx, w, h, frameCount);
        break;
      case 'horizontal-bar':
        this.barPositionX = (this.barPositionX + (w / 1920) * 8) % w;
        this.drawHorizontalBar(ctx, w, h, this.barPositionX);
        break;
      case 'vertical-bar':
        this.barPositionY = (this.barPositionY + (h / 1080) * 8) % h;
        this.drawVerticalBar(ctx, w, h, this.barPositionY);
        break;
      case 'diagonal-bar':
        this.barPositionX = (this.barPositionX + (w / 1920) * 7) % (w + h);
        this.drawDiagonalBar(ctx, w, h, this.barPositionX);
        break;
      case 'bouncing-ball':
        this.drawBouncingBall(ctx, w, h);
        break;
      case 'rotating-radar':
        this.drawRotatingRadar(ctx, w, h, frameCount);
        break;
      default:
        this.drawRadarPulse(ctx, w, h, frameCount);
    }
  }

  /**
   * 1. Expanding Radar Ripple Waves (Membesar seperti Radar)
   */
  drawRadarPulse(ctx, w, h, frameCount) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(w * w + h * h) / 2;

    ctx.save();
    // 3 Concentric Expanding Ripple Waves
    const numRipples = 3;
    const speed = (maxR / 180); // cycle every ~3 seconds at 60fps

    for (let i = 0; i < numRipples; i++) {
      const currentR = ((frameCount * speed + i * (maxR / numRipples)) % maxR);
      const alpha = Math.max(0, 1 - (currentR / maxR));

      // Outer Cyan Pulse Ring
      ctx.beginPath();
      ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.9})`;
      ctx.lineWidth = Math.max(2, Math.min(8, 3 + (currentR / maxR) * 5));
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Inner Magenta Harmonic Wave
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, currentR - 15), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 127, ${alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Center Radar Blip & Rotating Sweep Line
    const angle = (frameCount * 0.04) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * maxR * 0.8, cy + Math.sin(angle) * maxR * 0.8);
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.75)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00FF66';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Center Pulse Dot
    const centerPulse = 6 + Math.sin(frameCount * 0.15) * 3;
    ctx.fillStyle = '#FF0055';
    ctx.beginPath();
    ctx.arc(cx, cy, centerPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 2. 360-Degree Continuous Rotating Radar Beam
   */
  drawRotatingRadar(ctx, w, h, frameCount) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.48;
    const angle = (frameCount * 0.035) % (Math.PI * 2);

    ctx.save();
    // Trailing Sector Glow
    const trailAngles = 30;
    for (let i = 0; i < trailAngles; i++) {
      const a = angle - (i * 0.02);
      const alpha = (1 - i / trailAngles) * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, a - 0.02, a);
      ctx.closePath();
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
      ctx.fill();
    }

    // Leading High-Intensity Radar Line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 3. Horizontal Moving Judder Bar
   */
  drawHorizontalBar(ctx, w, h, x) {
    const barW = Math.max(12, Math.floor(w * 0.015));
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 10;
    ctx.fillRect(x, 0, barW, h);

    ctx.fillStyle = '#FF0055';
    ctx.fillRect(x + Math.floor(barW / 2) - 1, 0, 2, h);
    ctx.restore();
  }

  /**
   * 4. Vertical Scanning Bar (Row Refresh Test)
   */
  drawVerticalBar(ctx, w, h, y) {
    const barH = Math.max(12, Math.floor(h * 0.015));
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 10;
    ctx.fillRect(0, y, w, barH);

    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(0, y + Math.floor(barH / 2) - 1, w, 2);
    ctx.restore();
  }

  /**
   * 5. Diagonal 45-Degree Moving Bar
   */
  drawDiagonalBar(ctx, w, h, pos) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(12, Math.floor(w * 0.012));
    ctx.shadowColor = '#FF007F';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(pos - h, 0);
    ctx.lineTo(pos, h);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 6. Optical Judder Bouncing Ball
   */
  drawBouncingBall(ctx, w, h) {
    this.ballX += this.ballSpeedX;
    this.ballY += this.ballSpeedY;

    if (this.ballX - this.ballRadius < 0 || this.ballX + this.ballRadius > w) {
      this.ballSpeedX = -this.ballSpeedX;
    }
    if (this.ballY - this.ballRadius < 0 || this.ballY + this.ballRadius > h) {
      this.ballSpeedY = -this.ballSpeedY;
    }

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, this.ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // Center Crosshair inside ball
    ctx.strokeStyle = '#FF0055';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.ballX - this.ballRadius, this.ballY);
    ctx.lineTo(this.ballX + this.ballRadius, this.ballY);
    ctx.moveTo(this.ballX, this.ballY - this.ballRadius);
    ctx.lineTo(this.ballX, this.ballY + this.ballRadius);
    ctx.stroke();
    ctx.restore();
  }

  drawDynamicClock(ctx, w, h, frameCount) {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
    const frameNumber = frameCount % 60;

    const clockW = Math.min(320, Math.floor(w * 0.45));
    const clockH = Math.min(42, Math.max(28, Math.floor(h * 0.08)));
    const clockX = Math.floor((w - clockW) / 2);
    const clockY = Math.max(12, Math.floor(h * 0.03));

    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 20, 0.90)';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(clockX, clockY, clockW, clockH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00E5FF';
    const fontPx = Math.max(11, Math.min(15, Math.floor(clockH * 0.42)));
    ctx.font = `bold ${fontPx}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${timeStr} [F:${pad(frameNumber)}/60]`, clockX + clockW / 2, clockY + clockH / 2);
    ctx.restore();
  }

  toggleDeadPixelMode(enable) {
    this.deadPixelMode = enable !== undefined ? enable : !this.deadPixelMode;
    this.lastColorSwitch = performance.now();
  }

  setDeadPixelColor(index) {
    this.deadPixelMode = true;
    this.colorCycleIndex = index % this.colors.length;
    this.lastColorSwitch = performance.now() + 1000000;
  }

  /**
   * Record Canvas into downloadable WebM Video file up to 4K resolution (3840×2160)
   */
  async recordVideo(recordOptions = {}, onProgress = null) {
    if (this.isRecording) return;
    this.isRecording = true;
    this.recordedChunks = [];

    const {
      resolution = 'native',
      durationSeconds = 5
    } = recordOptions;

    let targetW = this.calcData.resolution.width;
    let targetH = this.calcData.resolution.height;

    if (resolution === '4k') {
      targetW = 3840;
      targetH = 2160;
    } else if (resolution === '1080p') {
      targetW = 1920;
      targetH = 1080;
    } else if (resolution === '2k') {
      targetW = 2560;
      targetH = 1440;
    }

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = targetW;
    offscreenCanvas.height = targetH;
    const offCtx = offscreenCanvas.getContext('2d');

    const offEngine = new TestCardEngine(offscreenCanvas);
    if (this.engine.logoImage) {
      offEngine.setLogo(this.engine.logoImage);
    }

    return new Promise((resolve, reject) => {
      try {
        const stream = offscreenCanvas.captureStream(60); // 60 FPS
        const videoBitsPerSecond = (resolution === '4k' || targetW >= 3840) ? 35000000 : 15000000;

        let recorder;
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond });
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond });
        } else {
          recorder = new MediaRecorder(stream, { videoBitsPerSecond });
        }

        this.mediaRecorder = recorder;

        recorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        const startTime = Date.now();
        const totalMs = durationSeconds * 1000;
        let recFrame = 0;
        let animOffscreen = true;

        const renderRecordFrame = () => {
          if (!animOffscreen) return;
          
          offEngine.render(this.calcData, {
            ...this.options,
            overrideWidth: targetW,
            overrideHeight: targetH
          });

          if (this.options.showMovingBar) {
            this.drawSelectedMotion(offCtx, targetW, targetH, recFrame);
          }

          if (this.options.showDigitalClock) {
            this.drawDynamicClock(offCtx, targetW, targetH, recFrame);
          }

          recFrame++;
          requestAnimationFrame(renderRecordFrame);
        };

        renderRecordFrame();

        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, Math.round((elapsed / totalMs) * 100));
          if (onProgress) onProgress(progress);
        }, 100);

        recorder.onstop = () => {
          animOffscreen = false;
          clearInterval(progressInterval);
          this.isRecording = false;
          const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
          if (onProgress) onProgress(100);
          resolve({ blob, targetW, targetH });
        };

        recorder.start(200);

        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, totalMs);

      } catch (err) {
        this.isRecording = false;
        reject(err);
      }
    });
  }

  downloadVideoBlob(blob, filename = 'led-test-pattern.webm') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
