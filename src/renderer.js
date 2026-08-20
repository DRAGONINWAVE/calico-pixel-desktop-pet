(() => {
  const canvas = document.querySelector('#cat');
  const ctx = canvas.getContext('2d');
  const pet = document.querySelector('#pet');
  const speech = document.querySelector('#speech');
  const effects = document.querySelector('#effects');
  const monitorUi = {
    cpuValue: document.querySelector('#cpu-value'),
    ramValue: document.querySelector('#ram-value'),
    cpuBar: document.querySelector('#cpu-bar'),
    ramBar: document.querySelector('#ram-bar'),
    diskList: document.querySelector('#disk-list'),
    processValue: document.querySelector('#process-value'),
    uptimeValue: document.querySelector('#uptime-value'),
  };
  const map = window.SPRITE_MAP;
  const sheet = new Image();
  sheet.src = '../assets/calico-sprites.png';
  ctx.imageSmoothingEnabled = false;

  const skinFilters = {
    calico: 'none',
    silver: 'grayscale(0.78) sepia(0.16) hue-rotate(155deg) saturate(0.92)',
    orange: 'sepia(0.72) saturate(1.8) hue-rotate(336deg) contrast(1.03)',
  };

  class SoundEngine {
    constructor() {
      this.context = null;
      this.stepEnabled = true;
      this.meowEnabled = true;
      this.lastStep = 0;
    }

    getContext() {
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === 'suspended') this.context.resume();
      return this.context;
    }

    tone(frequency, duration, type = 'sine', gainValue = 0.04, delay = 0) {
      try {
        const audio = this.getContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + delay;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
      } catch {
        // Browsers can reject synthesized audio before a user gesture; the pet remains fully usable.
      }
    }

    step() {
      const now = performance.now();
      if (this.stepEnabled && now - this.lastStep > 260) {
        this.lastStep = now;
        this.tone(165, 0.05, 'triangle', 0.014);
      }
    }

    meow() {
      if (!this.meowEnabled) return;
      this.tone(570, 0.16, 'sine', 0.045);
      this.tone(790, 0.18, 'sine', 0.038, 0.12);
    }
  }

  class SystemMonitor {
    constructor() {
      this.windowHeight = null;
      this.refresh();
      this.timer = setInterval(() => this.refresh(), 1500);
    }

    formatUptime(seconds) {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (days > 0) return `${days}天${hours}时`;
      if (hours > 0) return `${hours}时${minutes}分`;
      return `${minutes}分`;
    }

    formatRate(bytesPerSecond) {
      const value = Math.max(0, Number(bytesPerSecond) || 0);
      if (value < 1024) return '0 KB/s';
      const units = ['KB/s', 'MB/s', 'GB/s'];
      let scaled = value / 1024;
      let index = 0;
      while (scaled >= 1024 && index < units.length - 1) {
        scaled /= 1024;
        index += 1;
      }
      return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[index]}`;
    }

    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    }

    ringColor(percent) {
      // 120° is green; 0° is red. Yellow/orange naturally appears in the middle.
      const hue = Math.max(0, Math.min(120, Math.round(120 - percent * 1.2)));
      return `hsl(${hue} 68% 46%)`;
    }

    renderDisks(disks) {
      if (!disks.length) {
        monitorUi.diskList.innerHTML = '<div class="monitor-empty">未检测到可用磁盘</div>';
      } else {
        monitorUi.diskList.innerHTML = disks.map((disk) => {
          const percent = Math.max(0, Math.min(100, Number(disk.percent) || 0));
          const color = this.ringColor(percent);
          const drive = this.escapeHtml(disk.drive);
          const label = this.escapeHtml(disk.label || (disk.removable ? '外接盘' : '本地盘'));
          return `<article class="disk-card">
            <div class="disk-left">
              <div class="disk-name-wrap"><div class="disk-name">${drive}</div><div class="disk-label">${label}</div></div>
              <div class="disk-ring" style="--percent:${percent};--ring-color:${color}"><span class="disk-percent">${percent}%</span></div>
            </div>
            <div class="disk-meta">
              <div class="disk-capacity">${disk.usedGb} / ${disk.totalGb} GB</div>
              <div class="disk-speed read"><span class="speed-label">R</span><span>${this.formatRate(disk.readBps)}</span></div>
              <div class="disk-speed write"><span class="speed-label">W</span><span>${this.formatRate(disk.writeBps)}</span></div>
            </div>
          </article>`;
        }).join('');
      }
      // Grow upward from the taskbar; more than five cards scroll inside the monitor.
      const requestedHeight = Math.min(920, Math.max(420, 360 + disks.length * 100));
      if (this.windowHeight !== requestedHeight) {
        this.windowHeight = requestedHeight;
        window.petAPI.setMonitorHeight(requestedHeight).catch(() => {});
      }
    }

    refresh() {
      window.petAPI.getSystemMetrics()
        .then((metrics) => {
          const cpu = Math.max(0, Math.min(100, Number(metrics.cpu) || 0));
          const memory = Math.max(0, Math.min(100, Number(metrics.memoryPercent) || 0));
          monitorUi.cpuValue.textContent = `${cpu}%`;
          monitorUi.ramValue.textContent = `${memory}%`;
          monitorUi.cpuBar.style.width = `${cpu}%`;
          monitorUi.ramBar.style.width = `${memory}%`;
          this.renderDisks(Array.isArray(metrics.disks) ? metrics.disks : []);
          monitorUi.processValue.textContent = metrics.processCount == null ? '进程 --' : `进程 ${metrics.processCount}`;
          monitorUi.uptimeValue.textContent = `运行 ${this.formatUptime(metrics.uptimeSeconds)}`;
        })
        .catch(() => {
          monitorUi.cpuValue.textContent = '--%';
          monitorUi.ramValue.textContent = '--%';
          monitorUi.cpuBar.style.width = '0%';
          monitorUi.ramBar.style.width = '0%';
          this.renderDisks([]);
          monitorUi.processValue.textContent = '进程 --';
          monitorUi.uptimeValue.textContent = '运行 --';
        });
    }
  }

  class PetController {
    constructor() {
      this.action = 'idle';
      this.frameCursor = 0;
      this.frameElapsed = 0;
      this.lastAnimationTick = performance.now();
      this.fallbackTimer = null;
      this.walkTimer = null;
      this.walkDirection = -1;
      this.lastInteraction = performance.now();
      this.pointer = null;
      this.longPressTimer = null;
      this.singleClickTimer = null;
      this.lastTap = 0;
      this.attentionTriggered = false;
      // Quiet mode is on by default: no automatic walking, random routines, attention bubbles, or unsolicited sound.
      this.quietMode = true;
      this.sound = new SoundEngine();
      this.monitor = new SystemMonitor();
      this.randomBusy = false;
      this.dragging = false;
      this.longPressed = false;
      this.eyeOffset = { x: 0, y: 0 };
      this.eyeTarget = { x: 0, y: 0 };
      this.lastCursorRefresh = 0;
      this.cursorRefreshPending = false;
      this.startAutonomy();
      this.installInput();
      this.installMenuCommands();
    }

    interaction() {
      this.lastInteraction = performance.now();
      this.attentionTriggered = false;
    }

    showSpeech(text, duration = 1800) {
      speech.textContent = text;
      speech.classList.add('show');
      clearTimeout(this.speechTimer);
      this.speechTimer = setTimeout(() => speech.classList.remove('show'), duration);
    }

    hearts(count = 3) {
      for (let index = 0; index < count; index += 1) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.textContent = '♥';
        heart.style.setProperty('--drift', `${(index - 1) * 24}px`);
        heart.style.animationDelay = `${index * 75}ms`;
        effects.appendChild(heart);
        setTimeout(() => heart.remove(), 1200);
      }
    }

    currentAnimation() {
      return map.animations[this.action] || map.animations.idle;
    }

    updateGaze(now) {
      const eyeVisibleActions = new Set(['idle', 'look', 'attention', 'tail_swish', 'walk', 'run']);
      if (!eyeVisibleActions.has(this.action)) {
        this.eyeTarget = { x: 0, y: 0 };
      } else if (!this.cursorRefreshPending && now - this.lastCursorRefresh >= 80) {
        this.cursorRefreshPending = true;
        this.lastCursorRefresh = now;
        Promise.all([window.petAPI.getCursorPoint(), window.petAPI.getBounds()])
          .then(([cursor, bounds]) => {
            // Eye line is near the upper-middle of the 64px sprite. Limit displacement to 1 source pixel.
            const eyeCenterX = bounds.x + bounds.width * 0.5;
            const eyeCenterY = bounds.y + bounds.height * 0.39;
            const horizontal = Math.max(-1, Math.min(1, (cursor.x - eyeCenterX) / 120));
            const vertical = Math.max(-1, Math.min(1, (cursor.y - eyeCenterY) / 100));
            this.eyeTarget = { x: horizontal, y: vertical };
          })
          .catch(() => {})
          .finally(() => { this.cursorRefreshPending = false; });
      }
      // Smooth interpolation avoids jitter while preserving deliberate 1px pixel-art movement.
      this.eyeOffset.x += (this.eyeTarget.x - this.eyeOffset.x) * 0.26;
      this.eyeOffset.y += (this.eyeTarget.y - this.eyeOffset.y) * 0.26;
    }

    drawGazeOverlay() {
      const eyeVisibleActions = new Set(['idle', 'look', 'attention', 'tail_swish', 'walk', 'run']);
      if (!eyeVisibleActions.has(this.action)) return;
      const offsetX = Math.max(-1, Math.min(1, Math.round(this.eyeOffset.x)));
      const offsetY = Math.max(-1, Math.min(1, Math.round(this.eyeOffset.y)));
      // Repaint the two iris interiors, then place 2×5px pupils and 1px highlights at the new gaze angle.
      ctx.fillStyle = '#E6B94E';
      ctx.fillRect(18, 19, 5, 8);
      ctx.fillStyle = '#76C9EE';
      ctx.fillRect(35, 19, 5, 8);
      ctx.fillStyle = '#8A5A24';
      ctx.fillRect(20 + offsetX, 20 + offsetY, 2, 5);
      ctx.fillStyle = '#2F729F';
      ctx.fillRect(36 + offsetX, 20 + offsetY, 2, 5);
      ctx.fillStyle = '#F8FFF0';
      ctx.fillRect(18 + offsetX, 19 + offsetY, 1, 1);
      ctx.fillRect(38 + offsetX, 19 + offsetY, 1, 1);
    }

    setAction(action, options = {}) {
      if (!map.animations[action]) return;
      clearTimeout(this.fallbackTimer);
      this.action = action;
      this.frameCursor = 0;
      this.frameElapsed = 0;
      if (options.duration) {
        this.fallbackTimer = setTimeout(() => {
          this.setAction(options.fallback ?? 'idle');
          if (options.after) options.after();
        }, options.duration);
      }
    }

    animate(now) {
      const animation = this.currentAnimation();
      const frameMs = 1000 / animation.fps;
      this.frameElapsed += now - this.lastAnimationTick;
      this.lastAnimationTick = now;
      if (this.frameElapsed >= frameMs) {
        this.frameElapsed %= frameMs;
        this.frameCursor += 1;
        if (this.frameCursor >= animation.frames.length) {
          this.frameCursor = animation.loop ? 0 : animation.frames.length - 1;
        }
      }
      const index = animation.frames[this.frameCursor];
      const sx = (index % map.columns) * map.frameWidth;
      const sy = Math.floor(index / map.columns) * map.frameHeight;
      this.updateGaze(now);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sheet, sx, sy, map.frameWidth, map.frameHeight, 0, 0, 64, 64);
      this.drawGazeOverlay();
      requestAnimationFrame((time) => this.animate(time));
    }

    async moveBy(dx) {
      const bounds = await window.petAPI.getBounds();
      const area = await window.petAPI.getWorkArea({ x: bounds.x, y: bounds.y });
      const minX = area.x;
      const maxX = area.x + area.width - bounds.width;
      const nextX = bounds.x + dx;
      if (nextX <= minX || nextX >= maxX) {
        this.stopWalk();
        this.walkDirection *= -1;
        this.setAction('sit', { duration: 1700, fallback: 'idle' });
        this.showSpeech('边边到了，歇一下。', 1300);
        setTimeout(() => this.maybeWalk(), 1900);
        return;
      }
      await window.petAPI.moveWindow({ x: nextX, y: bounds.y });
      this.sound.step();
    }

    startWalk(run = false) {
      this.stopWalk();
      const step = run ? 7 : 3;
      this.setAction(run ? 'run' : 'walk');
      this.walkTimer = setInterval(() => {
        if (this.dragging || this.longPressed) return;
        this.moveBy(step * this.walkDirection);
      }, run ? 75 : 130);
    }

    stopWalk() {
      if (this.walkTimer) clearInterval(this.walkTimer);
      this.walkTimer = null;
    }

    maybeWalk() {
      if (this.quietMode || this.dragging || this.longPressed || this.walkTimer || this.randomBusy) return;
      if (this.action === 'idle' || this.action === 'sit' || this.action === 'tail_swish') this.startWalk(false);
    }

    startAutonomy() {
      setInterval(() => {
        const quietFor = performance.now() - this.lastInteraction;
        if (!this.quietMode && quietFor >= 300000 && !this.attentionTriggered && !this.dragging) {
          this.attentionTriggered = true;
          this.stopWalk();
          this.setAction('attention', { duration: 7200, fallback: 'idle', after: () => this.maybeWalk() });
          this.showSpeech('喵……看看我嘛。', 2600);
          this.sound.meow();
          return;
        }
        if (!this.quietMode && quietFor < 300000 && !this.dragging && !this.longPressed && !this.walkTimer && !this.randomBusy) {
          this.randomActivity();
        }
      }, 6500);
      // In quiet mode the cat stays put until the user interacts or disables quiet mode from the menu.
      if (!this.quietMode) setTimeout(() => this.maybeWalk(), 2200);
    }

    randomActivity() {
      this.randomBusy = true;
      const choices = [
        { action: 'idle', duration: 1700 }, { action: 'sit', duration: 2400 },
        { action: 'groom_paw', duration: 2800 }, { action: 'groom_coat', duration: 3200 },
        { action: 'scratch_ear', duration: 2500 }, { action: 'tail_swish', duration: 1900 },
        { action: 'yawn', duration: 1800 }, { action: 'stretch', duration: 2400 },
        { action: 'sleep', duration: 8000 },
      ];
      const next = choices[Math.floor(Math.random() * choices.length)];
      this.stopWalk();
      this.setAction(next.action, {
        duration: next.duration,
        fallback: 'idle',
        after: () => {
          this.randomBusy = false;
          if (Math.random() > 0.32) this.maybeWalk();
        },
      });
    }

    singleClick() {
      this.interaction();
      this.stopWalk();
      this.setAction('rub', { duration: 1200, fallback: 'idle', after: () => this.maybeWalk() });
      this.showSpeech('喵~');
      this.sound.meow();
    }

    doubleClick() {
      this.interaction();
      this.stopWalk();
      this.setAction('jump', { duration: 1300, fallback: 'idle', after: () => this.maybeWalk() });
      this.hearts(4);
      this.showSpeech('最喜欢你！', 1500);
      this.sound.meow();
    }

    async dropToFloor() {
      const start = await window.petAPI.getBounds();
      const area = await window.petAPI.getWorkArea({ x: start.x, y: start.y });
      const targetY = area.y + area.height - start.height;
      let y = start.y;
      let velocity = 0;
      const fall = async () => {
        velocity = Math.min(18, velocity + 1.5);
        y = Math.min(targetY, y + velocity);
        await window.petAPI.moveWindow({ x: start.x, y });
        if (y < targetY) requestAnimationFrame(fall);
        else {
          this.setAction('idle');
          this.showSpeech('安全落地！', 1100);
          this.maybeWalk();
        }
      };
      requestAnimationFrame(fall);
    }

    installInput() {
      pet.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        this.interaction();
        window.petAPI.showMenu({ x: event.screenX, y: event.screenY });
      });

      pet.addEventListener('pointerdown', async (event) => {
        if (event.button !== 0) return;
        this.interaction();
        pet.setPointerCapture(event.pointerId);
        this.pointer = {
          id: event.pointerId,
          startX: event.screenX,
          startY: event.screenY,
          startBounds: await window.petAPI.getBounds(),
        };
        this.dragging = false;
        this.longPressed = false;
        this.longPressTimer = setTimeout(() => {
          if (!this.dragging && this.pointer) {
            this.longPressed = true;
            this.stopWalk();
            this.setAction('belly');
            this.showSpeech('呼噜……');
            this.sound.meow();
          }
        }, 780);
      });

      pet.addEventListener('pointermove', async (event) => {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        const dx = event.screenX - this.pointer.startX;
        const dy = event.screenY - this.pointer.startY;
        if (!this.dragging && !this.longPressed && Math.abs(dx) + Math.abs(dy) > 6) {
          clearTimeout(this.longPressTimer);
          this.dragging = true;
          this.stopWalk();
          this.setAction('drag');
          pet.classList.add('dragging');
        }
        if (this.dragging) {
          await window.petAPI.moveWindow({
            x: this.pointer.startBounds.x + dx,
            y: this.pointer.startBounds.y + dy,
          });
          const speed = Math.hypot(dx, dy);
          if (speed > 110) this.setAction('drag');
        }
      });

      pet.addEventListener('pointerup', async (event) => {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        clearTimeout(this.longPressTimer);
        const wasDragging = this.dragging;
        const wasLongPress = this.longPressed;
        this.pointer = null;
        this.dragging = false;
        this.longPressed = false;
        pet.classList.remove('dragging');
        if (wasDragging) {
          this.setAction('drag');
          await this.dropToFloor();
          return;
        }
        if (wasLongPress) {
          this.setAction('idle');
          this.maybeWalk();
          return;
        }
        const now = performance.now();
        if (now - this.lastTap < 290) {
          clearTimeout(this.singleClickTimer);
          this.lastTap = 0;
          this.doubleClick();
        } else {
          this.lastTap = now;
          this.singleClickTimer = setTimeout(() => this.singleClick(), 290);
        }
      });

      pet.addEventListener('pointerenter', () => {
        if (!this.pointer && !this.dragging) {
          this.interaction();
          this.stopWalk();
          this.setAction('look');
        }
      });

      pet.addEventListener('pointerleave', () => {
        if (!this.pointer && !this.dragging && this.action === 'look') {
          this.setAction('idle');
          setTimeout(() => this.maybeWalk(), 400);
        }
      });
    }

    installMenuCommands() {
      window.petAPI.onCommand(({ command, payload }) => {
        this.interaction();
        if (command === 'sound') {
          this.sound.stepEnabled = payload.stepSound;
          this.sound.meowEnabled = payload.meowSound;
        }
        if (command === 'skin') {
          document.documentElement.style.setProperty('--skin-filter', skinFilters[payload.skin] ?? 'none');
          this.showSpeech('换好新花色啦！', 1300);
        }
        if (command === 'quiet-mode') {
          this.quietMode = payload.enabled;
          this.stopWalk();
          this.setAction('idle');
          if (!this.quietMode) {
            this.showSpeech('我会偶尔散步。', 1300);
            setTimeout(() => this.maybeWalk(), 700);
          }
        }
        if (command === 'feed-fish') {
          this.stopWalk();
          this.setAction('eat', { duration: 3200, fallback: 'sit', after: () => this.maybeWalk() });
          this.showSpeech('小鱼干！', 1400);
          this.sound.meow();
        }
        if (command === 'throw-yarn') {
          this.stopWalk();
          this.setAction('yarn', {
            duration: 1200,
            fallback: 'pounce',
            after: () => this.setAction('pounce', { duration: 1700, fallback: 'idle', after: () => this.maybeWalk() }),
          });
          this.showSpeech('毛线球！', 1300);
        }
      });
    }
  }

  sheet.addEventListener('load', () => {
    const controller = new PetController();
    requestAnimationFrame((time) => controller.animate(time));
    // No startup bubble: the default is an unobtrusive companion experience.
  });
})();
