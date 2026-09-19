/**
 * Giorgos Vontzalidis Portfolio - Elegant Light Brick Breaker
 * Clean, minimal aesthetic with refined slate tones and harmonic chimes.
 */

(function () {
  'use strict';

  // --- Harmonic Chime Audio (Web Audio API) ---
  class ChimeAudio {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('brick_sound_muted') === 'true';
      this.lastPlayTime = 0;
      // Elegant pentatonic scale (A minor / C major pentatonic across octaves for serene chimes)
      this.frequencies = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        392.00, // G4
        440.00, // A4
        523.25, // C5
        587.33, // D5
        659.25, // E5
        783.99, // G5
        880.00  // A5
      ];
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      localStorage.setItem('brick_sound_muted', this.muted);
      return this.muted;
    }

    playChime(noteIndex = 0, volume = 0.08) {
      if (this.muted) return;
      const now = performance.now();
      if (now - this.lastPlayTime < 35) return;
      this.lastPlayTime = now;

      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const freq = this.frequencies[noteIndex % this.frequencies.length];
        const t = this.ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.3);
      } catch (e) {
        // Audio policy ignore
      }
    }

    playPaddleBounce() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      } catch (e) {}
    }
  }

  // --- Brick Breaker Engine ---
  class BrickBreakerGame {
    constructor() {
      this.canvas = document.getElementById('brick-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.wrapper = document.getElementById('wrapper');

      this.audio = new ChimeAudio();

      // UI Elements
      this.scoreEl = document.getElementById('brick-score');
      this.streakEl = document.getElementById('brick-streak');
      this.livesEl = document.getElementById('brick-lives');
      this.soundBtn = document.getElementById('brick-sound-btn');
      this.resetBtn = document.getElementById('brick-reset-btn');
      this.autoplayBtn = document.getElementById('brick-autoplay-btn');
      this.heroPlayBtn = document.getElementById('hero-play-btn');

      // Modal Elements
      this.modal = document.getElementById('brick-game-modal');
      this.modalTitle = document.getElementById('brick-modal-title');
      this.modalDesc = document.getElementById('brick-modal-desc');
      this.modalScore = document.getElementById('brick-modal-score');
      this.modalBtn = document.getElementById('brick-modal-btn');
      this.modalBadge = document.getElementById('brick-modal-badge');

      // State
      this.score = 0;
      this.streak = 0;
      this.maxStreak = 0;
      this.lives = 3;
      this.level = 1;
      this.isBallLaunched = false;
      this.autoPlay = false;
      this.isPaused = false;

      // Dimensions & Scaling
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Paddle
      this.paddleWidth = 140;
      this.paddleHeight = 14;
      this.paddleX = 0;
      this.paddleY = 0;
      this.paddleTargetX = 0;
      this.paddleSpeed = 16;
      this.keyLeft = false;
      this.keyRight = false;

      // Ball
      this.ballRadius = 7;
      this.ballX = 0;
      this.ballY = 0;
      this.ballVx = 0;
      this.ballVy = 0;
      this.baseSpeed = 6.5;
      this.ballTrail = [];

      // Bricks
      this.bricks = [];
      this.brickRows = 4;
      this.brickCols = 8;
      this.brickPadding = 10;
      this.brickOffsetTop = 110;
      this.brickOffsetSide = 32;
      this.brickHeight = 26;

      // Elegant refined slate palette
      this.rowThemes = [
        { fill: '#1e293b', border: '#0f172a', text: '#f8fafc', note: 7, points: 50 }, // Slate 800
        { fill: '#334155', border: '#1e293b', text: '#f1f5f9', note: 5, points: 30 }, // Slate 700
        { fill: '#475569', border: '#334155', text: '#ffffff', note: 3, points: 20 }, // Slate 600
        { fill: '#64748b', border: '#475569', text: '#ffffff', note: 2, points: 15 }, // Slate 500
        { fill: '#94a3b8', border: '#64748b', text: '#0f172a', note: 0, points: 10 }  // Slate 400
      ];

      // Skill labels etched on bricks
      this.skillsList = [
        'C++', 'Python', 'Unity', 'Unreal', 'GLSL', 'Physics', 'DirectX',
        'TypeScript', 'JavaScript', 'Git', 'Vulkan', 'React', 'Docker', 'AI',
        'Algorithms', 'Shaders', 'OpenGL', 'Node.js', 'C#', 'Math', 'Render'
      ];

      // Particle system for gentle dust
      this.particles = [];
      this.floatingTexts = [];

      this.init();
    }

    init() {
      this.resize();
      window.addEventListener('resize', () => this.resize());

      this.setupControls();
      this.updateSoundButtonUI();
      this.buildBricks();
      this.resetBall();

      // Start animation loop
      this.lastFrameTime = performance.now();
      requestAnimationFrame(time => this.loop(time));
    }

    resize() {
      const rect = this.wrapper.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';

      this.ctx.scale(this.dpr, this.dpr);

      // Adjust paddle size according to screen
      this.paddleWidth = Math.max(90, Math.min(150, this.width * 0.15));
      this.paddleHeight = 12;
      this.paddleY = this.height - 38;

      if (!this.isBallLaunched) {
        this.paddleX = this.width / 2 - this.paddleWidth / 2;
        this.paddleTargetX = this.paddleX;
        this.ballX = this.paddleX + this.paddleWidth / 2;
        this.ballY = this.paddleY - this.ballRadius - 2;
      } else {
        this.paddleX = Math.max(8, Math.min(this.width - this.paddleWidth - 8, this.paddleX));
      }

      // Re-layout bricks on resize
      this.buildBricks(true);
    }

    buildBricks(preserveStatus = false) {
      const isMobile = this.width < 600;
      const isTablet = this.width < 992;

      this.brickCols = isMobile ? 5 : isTablet ? 7 : 8;
      this.brickRows = 4; // 4 sleek, balanced rows of bricks
      this.brickOffsetSide = isMobile ? 12 : Math.max(28, this.width * 0.07);
      this.brickOffsetTop = isMobile ? 58 : 68; // Directly below the minimal top HUD
      this.topCeilingY = 8; // Top boundary of the game canvas

      this.brickPadding = isMobile ? 6 : 8;
      const totalHorizontalPadding = (this.brickCols - 1) * this.brickPadding;
      const availableWidth = this.width - this.brickOffsetSide * 2 - totalHorizontalPadding;
      const brickWidth = Math.floor(availableWidth / this.brickCols);
      this.brickHeight = isMobile ? 22 : 25;

      const oldBricks = preserveStatus ? this.bricks : null;
      this.bricks = [];

      let labelIdx = 0;
      for (let r = 0; r < this.brickRows; r++) {
        const theme = this.rowThemes[r % this.rowThemes.length];
        for (let c = 0; c < this.brickCols; c++) {
          const x = this.brickOffsetSide + c * (brickWidth + this.brickPadding);
          const y = this.brickOffsetTop + r * (this.brickHeight + this.brickPadding);

          let alive = true;
          if (oldBricks && oldBricks.length > 0) {
            const prev = oldBricks.find(b => b.row === r && b.col === c);
            if (prev && !prev.alive) alive = false;
          }

          const label = this.skillsList[labelIdx % this.skillsList.length];
          labelIdx++;

          this.bricks.push({
            x,
            y,
            w: brickWidth,
            h: this.brickHeight,
            row: r,
            col: c,
            alive,
            theme,
            label,
            opacity: 1,
            scale: 1
          });
        }
      }
    }

    setupControls() {
      // Mouse move on wrapper tracks paddle
      const handlePointerMove = (clientX) => {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        this.paddleTargetX = mouseX - this.paddleWidth / 2;
        this.paddleTargetX = Math.max(8, Math.min(this.width - this.paddleWidth - 8, this.paddleTargetX));
      };

      this.wrapper.addEventListener('mousemove', (e) => {
        if (!this.autoPlay) {
          handlePointerMove(e.clientX);
        }
      });

      this.wrapper.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 0) {
          if (!this.autoPlay) {
            handlePointerMove(e.touches[0].clientX);
          }
        }
      }, { passive: true });

      // Click or tap to launch
      const triggerLaunch = () => {
        this.audio.init();
        if (!this.isBallLaunched) {
          this.launchBall();
        }
      };

      this.canvas.addEventListener('click', triggerLaunch);
      if (this.heroPlayBtn) {
        this.heroPlayBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerLaunch();
        });
      }

      // Keyboard controls
      window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.keyLeft = true;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.keyRight = true;
        } else if (e.code === 'Space') {
          // Prevent scrolling only if inside hero
          if (window.scrollY < this.height * 0.8) {
            e.preventDefault();
            triggerLaunch();
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.keyLeft = false;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.keyRight = false;
        }
      });

      // HUD Buttons
      if (this.soundBtn) {
        this.soundBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const muted = this.audio.toggleMute();
          this.updateSoundButtonUI(muted);
        });
      }

      if (this.resetBtn) {
        this.resetBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.resetGame();
        });
      }

      if (this.autoplayBtn) {
        this.autoplayBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.autoPlay = !this.autoPlay;
          this.autoplayBtn.classList.toggle('active', this.autoPlay);
          this.autoplayBtn.title = this.autoPlay ? 'Auto-Paddle: ON' : 'Toggle Zen / Auto-Paddle';
          if (this.autoPlay && !this.isBallLaunched) {
            this.launchBall();
          }
        });
      }

      if (this.modalBtn) {
        this.modalBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hideModal();
          this.resetGame();
          this.launchBall();
        });
      }
    }

    showModal(type = 'gameover') {
      if (!this.modal) return;
      if (type === 'gameover') {
        if (this.modalTitle) this.modalTitle.textContent = 'Game Over';
        if (this.modalBadge) this.modalBadge.innerHTML = '<i class="fas fa-heart-broken" style="color:#ef4444"></i>';
        if (this.modalScore) this.modalScore.textContent = this.score.toLocaleString();
        if (this.modalBtn) this.modalBtn.innerHTML = '<i class="fas fa-redo-alt mr-2"></i> Play Again';
      } else if (type === 'victory') {
        if (this.modalTitle) this.modalTitle.textContent = 'Stage Cleared!';
        if (this.modalBadge) this.modalBadge.innerHTML = '<i class="fas fa-trophy" style="color:#f59e0b"></i>';
        if (this.modalScore) this.modalScore.textContent = this.score.toLocaleString();
        if (this.modalBtn) this.modalBtn.innerHTML = '<i class="fas fa-arrow-right mr-2"></i> Next Wave';
      }
      this.modal.style.display = 'flex';
    }

    hideModal() {
      if (this.modal) {
        this.modal.style.display = 'none';
      }
    }

    updateSoundButtonUI(isMuted = this.audio.muted) {
      if (!this.soundBtn) return;
      const icon = this.soundBtn.querySelector('i');
      if (icon) {
        icon.className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
      }
      this.soundBtn.classList.toggle('muted', isMuted);
    }

    launchBall() {
      if (this.isBallLaunched) return;
      this.isBallLaunched = true;
      // Launch upwards with a slight dynamic initial angle
      const angle = (Math.random() * 0.6 - 0.3) - Math.PI / 2; // mostly straight up (-90deg +/- 17deg)
      this.ballVx = Math.cos(angle) * this.baseSpeed;
      this.ballVy = Math.sin(angle) * this.baseSpeed;
      if (this.heroPlayBtn) {
        this.heroPlayBtn.innerHTML = '<i class="fas fa-redo-alt mr-1"></i> Reset Game';
      }
    }

    resetBall() {
      this.isBallLaunched = false;
      this.ballX = this.paddleX + this.paddleWidth / 2;
      this.ballY = this.paddleY - this.ballRadius - 2;
      this.ballVx = 0;
      this.ballVy = 0;
      this.ballTrail = [];
      this.streak = 0;
      this.updateHUD();

      if (this.heroPlayBtn) {
        this.heroPlayBtn.innerHTML = '<i class="fas fa-play mr-1"></i> Launch Ball';
      }
    }

    resetGame() {
      this.hideModal();
      this.score = 0;
      this.streak = 0;
      this.lives = 3;
      this.level = 1;
      this.buildBricks();
      this.resetBall();
      this.updateHUD();
      this.particles = [];
      this.floatingTexts = [];
    }

    updateHUD() {
      if (this.scoreEl) this.scoreEl.textContent = this.score.toLocaleString();
      if (this.streakEl) this.streakEl.textContent = `${Math.max(1, this.streak)}x`;

      if (this.livesEl) {
        const dots = this.livesEl.querySelectorAll('.life-dot');
        dots.forEach((dot, index) => {
          dot.classList.toggle('active', index < this.lives);
        });
      }
    }

    spawnDust(x, y, color) {
      const count = 7;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.8 + 0.8;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          radius: Math.random() * 2.2 + 1.2,
          color,
          alpha: 0.85,
          decay: Math.random() * 0.025 + 0.02
        });
      }
    }

    spawnScoreFloat(x, y, text) {
      this.floatingTexts.push({
        x,
        y,
        text,
        alpha: 1,
        vy: -1.2
      });
    }

    update(dt) {
      // Update Paddle
      if (this.autoPlay) {
        if (!this.isBallLaunched) {
          this.launchBall();
        }

        const aliveBricks = this.bricks.filter(b => b.alive);

        if (this.ballVy > 0 && aliveBricks.length > 0) {
          // 1. Mathematically exact landing position calculation with wall bounces
          const timeToPaddle = (this.paddleY - this.ballY) / this.ballVy;
          const rawX = this.ballX + this.ballVx * timeToPaddle;
          const minX = this.ballRadius;
          const maxX = this.width - this.ballRadius;
          const span = maxX - minX;

          let landingX = minX;
          if (span > 0) {
            let offset = (rawX - minX) % (2 * span);
            if (offset < 0) offset += 2 * span;
            landingX = offset <= span ? (minX + offset) : (minX + 2 * span - offset);
          }

          // 2. Select target brick to snipe!
          let bestBrick = aliveBricks[0];
          let bestScore = -Infinity;
          const maxDeflection = (60 * Math.PI) / 180;

          for (const b of aliveBricks) {
            const bx = b.x + b.w / 2;
            const by = b.y + b.h / 2;
            const dx = bx - landingX;
            const dy = this.paddleY - by;

            const directAngle = Math.atan2(dx, dy);
            const isReachableDirect = Math.abs(directAngle) <= maxDeflection;

            // Score: strongly prioritize reachable bricks and lower rows (higher Y)
            const score = (isReachableDirect ? 3000 : 0) + by * 2 - Math.abs(dx) * 0.4;
            if (score > bestScore) {
              bestScore = score;
              bestBrick = b;
            }
          }

          // 3. Exact deflection angle to hit bestBrick
          const targetBx = bestBrick.x + bestBrick.w / 2;
          const targetBy = bestBrick.y + bestBrick.h / 2;
          const dx = targetBx - landingX;
          const dy = this.paddleY - targetBy;
          let desiredAngle = Math.atan2(dx, dy);

          const maxAngle = (65 * Math.PI) / 180;
          desiredAngle = Math.max(-maxAngle * 0.85, Math.min(maxAngle * 0.85, desiredAngle));

          // Enforce minimum angle to prevent vertical loop
          if (Math.abs(desiredAngle) < 0.15) {
            desiredAngle = (dx >= 0 ? 1 : -1) * 0.28;
          }

          const clampedOffset = desiredAngle / maxAngle;
          const aimShift = clampedOffset * (this.paddleWidth / 2);

          // Position paddle so the ball hits at aimShift relative to paddle center
          this.paddleTargetX = landingX - (this.paddleWidth / 2) - aimShift;
        } else {
          // While ball is traveling upwards, position smoothly under ball
          this.paddleTargetX = this.ballX - this.paddleWidth / 2;
        }

        // Snap paddle swiftly into position so it never lags behind
        this.paddleTargetX = Math.max(6, Math.min(this.width - this.paddleWidth - 6, this.paddleTargetX));
        const lerpFactor = (this.ballVy > 0 && this.ballY > this.paddleY - 140) ? 0.85 : 0.45;
        this.paddleX += (this.paddleTargetX - this.paddleX) * lerpFactor;
      } else {
        if (this.keyLeft) {
          this.paddleTargetX -= this.paddleSpeed;
        }
        if (this.keyRight) {
          this.paddleTargetX += this.paddleSpeed;
        }
        this.paddleTargetX = Math.max(8, Math.min(this.width - this.paddleWidth - 8, this.paddleTargetX));
        this.paddleX += (this.paddleTargetX - this.paddleX) * 0.35;
      }

      // If ball is not launched, stay glued to paddle
      if (!this.isBallLaunched) {
        this.ballX = this.paddleX + this.paddleWidth / 2;
        this.ballY = this.paddleY - this.ballRadius - 2;
        return;
      }

      // Save trail position
      this.ballTrail.unshift({ x: this.ballX, y: this.ballY });
      if (this.ballTrail.length > 5) this.ballTrail.pop();

      // Ball Movement
      this.ballX += this.ballVx;
      this.ballY += this.ballVy;

      // Ball collision with walls
      // Left wall
      if (this.ballX - this.ballRadius <= 0) {
        this.ballX = this.ballRadius;
        this.ballVx = Math.abs(this.ballVx);
        this.audio.playChime(1, 0.04);
      }
      // Right wall
      if (this.ballX + this.ballRadius >= this.width) {
        this.ballX = this.width - this.ballRadius;
        this.ballVx = -Math.abs(this.ballVx);
        this.audio.playChime(1, 0.04);
      }
      // Top wall (bounded below hero title so ball stays cleanly in the play court)
      const ceiling = this.topCeilingY || 10;
      if (this.ballY - this.ballRadius <= ceiling) {
        this.ballY = ceiling + this.ballRadius;
        this.ballVy = Math.abs(this.ballVy);
        this.audio.playChime(2, 0.04);
      }

      // Ball collision with Paddle
      if (
        this.ballVy > 0 &&
        this.ballY + this.ballRadius >= this.paddleY &&
        this.ballY - this.ballRadius <= this.paddleY + this.paddleHeight &&
        this.ballX >= this.paddleX - 4 &&
        this.ballX <= this.paddleX + this.paddleWidth + 4
      ) {
        this.ballY = this.paddleY - this.ballRadius;

        // Angle variation based on impact point (-1 left, 0 center, +1 right)
        const hitOffset = (this.ballX - (this.paddleX + this.paddleWidth / 2)) / (this.paddleWidth / 2);
        const clampedOffset = Math.max(-0.92, Math.min(0.92, hitOffset));

        // Max deflection angle: 65 degrees
        const maxAngle = (65 * Math.PI) / 180;
        const newAngle = clampedOffset * maxAngle - Math.PI / 2;

        const currentSpeed = Math.hypot(this.ballVx, this.ballVy);
        const speed = Math.max(this.baseSpeed, Math.min(this.baseSpeed * 1.35, currentSpeed));

        this.ballVx = Math.cos(newAngle) * speed;
        this.ballVy = Math.sin(newAngle) * speed;

        // Prevent purely vertical traps by ensuring a minimum horizontal velocity component
        if (Math.abs(this.ballVx) < 1.2) {
          const sign = clampedOffset !== 0 ? Math.sign(clampedOffset) : (Math.random() > 0.5 ? 1 : -1);
          this.ballVx = sign * 1.5;
        }

        this.audio.playPaddleBounce();

        // Paddle bounce particle
        this.spawnDust(this.ballX, this.paddleY, '#334155');
      }

      // Ball collision with Bricks
      let hitBrickThisFrame = false;
      for (const brick of this.bricks) {
        if (!brick.alive) continue;

        // Check AABB collision with circular tolerance
        if (
          this.ballX + this.ballRadius >= brick.x &&
          this.ballX - this.ballRadius <= brick.x + brick.w &&
          this.ballY + this.ballRadius >= brick.y &&
          this.ballY - this.ballRadius <= brick.y + brick.h
        ) {
          // Brick destroyed!
          brick.alive = false;
          hitBrickThisFrame = true;

          // Determine bounce direction (horizontal or vertical impact)
          const overlapLeft = (this.ballX + this.ballRadius) - brick.x;
          const overlapRight = (brick.x + brick.w) - (this.ballX - this.ballRadius);
          const overlapTop = (this.ballY + this.ballRadius) - brick.y;
          const overlapBottom = (brick.y + brick.h) - (this.ballY - this.ballRadius);

          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapY = Math.min(overlapTop, overlapBottom);

          if (minOverlapX < minOverlapY) {
            this.ballVx = -this.ballVx;
          } else {
            this.ballVy = -this.ballVy;
          }

          // Streak and Scoring
          this.streak++;
          const points = brick.theme.points * Math.min(this.streak, 5);
          this.score += points;

          // Visuals & Sound
          this.audio.playChime(brick.theme.note + (this.streak % 3), 0.09);
          this.spawnDust(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.theme.fill);
          this.spawnScoreFloat(brick.x + brick.w / 2, brick.y, `+${points}`);

          this.updateHUD();
          break; // Only break one brick per frame for clean physics
        }
      }

      // Check level clear
      const remainingBricks = this.bricks.filter(b => b.alive).length;
      if (remainingBricks === 0) {
        this.level++;
        this.score += 500 * this.level;
        this.updateHUD();
        this.audio.playChime(9, 0.18);
        if (this.autoPlay) {
          this.buildBricks();
          this.resetBall();
          setTimeout(() => this.launchBall(), 500);
        } else {
          this.showModal('victory');
          this.buildBricks();
          this.resetBall();
        }
        return;
      }

      // Ball drops out of bottom boundary
      if (this.ballY - this.ballRadius > this.height) {
        this.lives--;
        this.streak = 0;
        this.updateHUD();

        if (this.lives <= 0) {
          if (this.autoPlay) {
            setTimeout(() => {
              this.resetGame();
              this.launchBall();
            }, 1200);
          } else {
            this.showModal('gameover');
          }
        } else {
          this.resetBall();
          if (this.autoPlay) {
            setTimeout(() => this.launchBall(), 450);
          }
        }
      }

      // Update dust particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // tiny gentle gravity
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Update floating score texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.022;
        if (ft.alpha <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 1. Subtle elegant micro-grid background pattern
      this.drawSubtleGrid();

      // 2. Draw Bricks
      this.drawBricks();

      // 3. Draw Ball Trail & Ball
      this.drawBall();

      // 4. Draw Paddle
      this.drawPaddle();

      // 5. Draw Particles
      this.drawParticles();

      // 6. Draw Floating Texts
      this.drawFloatingTexts();
    }

    drawSubtleGrid() {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.035)';
      this.ctx.lineWidth = 1;

      const gridSize = 32;
      for (let x = 0; x < this.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();
      }

      for (let y = 0; y < this.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    drawBricks() {
      for (const b of this.bricks) {
        if (!b.alive) continue;

        this.ctx.save();

        // Delicate drop shadow
        this.ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetY = 2;

        // Brick body
        this.ctx.fillStyle = b.theme.fill;
        if (this.ctx.roundRect) {
          this.ctx.beginPath();
          this.ctx.roundRect(b.x, b.y, b.w, b.h, 5);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        // Inner soft top highlight
        this.ctx.shadowColor = 'transparent';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.fillRect(b.x + 3, b.y + 1, b.w - 6, 2);

        // Brick Label (crisp typography)
        this.ctx.fillStyle = b.theme.text;
        this.ctx.font = '500 10.5px Inter, -apple-system, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);

        this.ctx.restore();
      }
    }

    drawPaddle() {
      this.ctx.save();

      // Shadow
      this.ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetY = 3;

      // Dark titanium rounded pill paddle
      this.ctx.fillStyle = '#0f172a';
      const radius = this.paddleHeight / 2;

      if (this.ctx.roundRect) {
        this.ctx.beginPath();
        this.ctx.roundRect(this.paddleX, this.paddleY, this.paddleWidth, this.paddleHeight, radius);
        this.ctx.fill();
      } else {
        this.ctx.fillRect(this.paddleX, this.paddleY, this.paddleWidth, this.paddleHeight);
      }

      // Top subtle bevel highlight
      this.ctx.shadowColor = 'transparent';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      this.ctx.fillRect(this.paddleX + 6, this.paddleY + 1, this.paddleWidth - 12, 1.5);

      // Center indicator pip
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.beginPath();
      this.ctx.arc(this.paddleX + this.paddleWidth / 2, this.paddleY + this.paddleHeight / 2, 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    drawBall() {
      this.ctx.save();

      // Trail
      for (let i = 0; i < this.ballTrail.length; i++) {
        const t = this.ballTrail[i];
        const alpha = (1 - (i + 1) / (this.ballTrail.length + 1)) * 0.28;
        const r = this.ballRadius * (1 - (i + 1) / (this.ballTrail.length + 2));

        this.ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Soft glow
      this.ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetY = 2;

      // Ball body
      this.ctx.fillStyle = '#0f172a';
      this.ctx.beginPath();
      this.ctx.arc(this.ballX, this.ballY, this.ballRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Top-left specular shine
      this.ctx.shadowColor = 'transparent';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      this.ctx.beginPath();
      this.ctx.arc(this.ballX - 2, this.ballY - 2, 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    drawParticles() {
      this.ctx.save();
      for (const p of this.particles) {
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    drawFloatingTexts() {
      this.ctx.save();
      for (const ft of this.floatingTexts) {
        this.ctx.globalAlpha = ft.alpha;
        this.ctx.font = '600 13px Inter, -apple-system, sans-serif';
        this.ctx.fillStyle = '#0f172a';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(ft.text, ft.x, ft.y);
      }
      this.ctx.restore();
    }

    loop(currentTime) {
      const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = currentTime;

      this.update(dt);
      this.draw();

      requestAnimationFrame(time => this.loop(time));
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new BrickBreakerGame());
  } else {
    new BrickBreakerGame();
  }
})();
