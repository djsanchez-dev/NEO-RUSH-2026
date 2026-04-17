/**
 * NEON RUNNER 2026 — Main Orchestrator
 */
class NeonRunnerGame {
  constructor() {
    this.screens = new ScreenManager();
    this.input = new InputManager();
    this.menuAnim = new MenuAnimations();
    this.canvas = document.getElementById('gameCanvas');
    this.world = null;
    this.renderer = null;
    this.loop = null;
    this._hudUpdateTimer = 0;
    this._settings = {
      music: true, sfx: true, musicVol: 60, sfxVol: 80, particles: 'high', vibration: true
    };
    this._init();
  }

  _init() {
    this._bootSequence();
    this._bindMenuButtons();
    this._bindGameButtons();
    this._bindSettingsButtons();
    this._resizeCanvas();
    // Resize on orientation change and window resize
    window.addEventListener('resize', () => this._resizeCanvas());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this._resizeCanvas(), 300);
    });
    // Block scroll on canvas only (not menus)
    document.getElementById('gameCanvas')?.addEventListener('touchmove',
      e => e.preventDefault(), { passive: false });
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    // Use actual viewport size accounting for mobile browser chrome
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Measure HUD and controls height after they're rendered
    const hud = document.getElementById('gameHUD');
    const ctrl = document.getElementById('mobileControls');

    // Only count control height if it's visible (touch device)
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const hudH  = hud  ? hud.getBoundingClientRect().height  : 52;
    const ctrlH = (isTouchDevice && ctrl) ? ctrl.getBoundingClientRect().height : 0;

    const canvasH = Math.max(120, Math.floor(vh - hudH - ctrlH));
    const canvasW = Math.floor(vw);

    this.canvas.width  = canvasW;
    this.canvas.height = canvasH;

    if (this.world) {
      this.world.W = canvasW;
      this.world.H = canvasH;
      // Keep player on new ground
      const newGround = this.world.GROUND_Y - this.world.player.h;
      if (this.world.player.y > newGround) this.world.player.y = newGround;
    }
  }

  _bootSequence() {
    this.screens.show('boot');
    const bar = document.getElementById('bootBar');
    const status = document.getElementById('bootStatus');
    const lines = document.getElementById('bootLines');
    const msgs = [
      '> CARGANDO MOTOR DE FÍSICA...',
      '> INICIALIZANDO SISTEMA DE AUDIO...',
      '> COMPILANDO SHADERS NEON...',
      '> CONECTANDO A NEO-RED 2026...',
      '> CARGANDO MAPA PROCEDURAL...',
      '> SINCRONIZANDO CIPHER OS v9.1...',
      '> SISTEMAS LISTOS. BIENVENIDO, RUNNER.'
    ];
    let pct = 0, msgIdx = 0;
    const interval = setInterval(() => {
      pct += Utils.randInt(8, 18);
      if (pct > 100) pct = 100;
      if (bar) bar.style.width = pct + '%';
      if (status && msgIdx < msgs.length) {
        status.textContent = msgs[msgIdx];
        if (lines) lines.innerHTML += msgs[msgIdx] + '<br>';
        msgIdx++;
      }
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          this._goMenu();
        }, 700);
      }
    }, 220);
  }

  _goMenu() {
    this.screens.show('menu');
    this.menuAnim.startMenu();
    this._updateHiScoreDisplay();
    audio.init();
  }

  _updateHiScoreDisplay() {
    const hi = localStorage.getItem('neonrunner_hi') || '0';
    const el = document.getElementById('menuHiscore');
    if (el) el.textContent = Utils.pad(parseInt(hi));
  }

  _bindMenuButtons() {
    document.getElementById('btnPlay')?.addEventListener('click', () => {
      audio.resume(); audio.sfxMenuClick();
      this._startGame();
    });
    document.getElementById('btnStory')?.addEventListener('click', () => {
      audio.sfxMenuClick();
      this.screens.show('story');
    });
    document.getElementById('btnRecords')?.addEventListener('click', () => {
      audio.sfxMenuClick();
      this._showRecords();
    });
    document.getElementById('btnSettings')?.addEventListener('click', () => {
      audio.sfxMenuClick();
      this.screens.show('settings');
    });
    document.getElementById('btnStoryBack')?.addEventListener('click', () => {
      audio.sfxMenuClick(); this.screens.show('menu');
    });
    document.getElementById('btnRecordsBack')?.addEventListener('click', () => {
      audio.sfxMenuClick(); this.screens.show('menu');
    });
    document.getElementById('btnSettingsBack')?.addEventListener('click', () => {
      audio.sfxMenuClick(); this.screens.show('menu');
    });
    // Menu hover SFX
    document.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => audio.sfxMenuHover());
    });
  }

  _bindGameButtons() {
    document.getElementById('btnResume')?.addEventListener('click', () => {
      audio.sfxMenuClick();
      this.world?.resume();
      this.screens.hide('pause');
      this.screens.show('game');
    });
    document.getElementById('btnPauseRestart')?.addEventListener('click', () => {
      audio.sfxMenuClick();
      this.screens.hide('pause');
      this._startGame();
    });
    document.getElementById('btnPauseMenu')?.addEventListener('click', () => {
      audio.sfxMenuClick();
      this.screens.hide('pause');
      this.loop?.stop();
      this.menuAnim.startMenu();
      this._goMenu();
    });
    document.getElementById('btnRetry')?.addEventListener('click', () => {
      audio.sfxMenuClick();
      this.screens.hide('gameover');
      this._startGame();
    });
    document.getElementById('btnGoMenu')?.addEventListener('click', () => {
      audio.sfxMenuClick();
      this.screens.hide('gameover');
      this.loop?.stop();
      this.menuAnim.startMenu();
      this._goMenu();
    });
  }

  _bindSettingsButtons() {
    document.getElementById('toggleMusic')?.addEventListener('click', (e) => {
      this._settings.music = !this._settings.music;
      e.target.textContent = this._settings.music ? 'ON' : 'OFF';
      e.target.classList.toggle('active', this._settings.music);
      audio.toggleMusic(this._settings.music);
    });
    document.getElementById('toggleSFX')?.addEventListener('click', (e) => {
      this._settings.sfx = !this._settings.sfx;
      e.target.textContent = this._settings.sfx ? 'ON' : 'OFF';
      e.target.classList.toggle('active', this._settings.sfx);
      audio.toggleSFX(this._settings.sfx);
    });
    document.getElementById('volMusic')?.addEventListener('input', (e) => {
      audio.setMusicVolume(e.target.value);
    });
    document.getElementById('volSFX')?.addEventListener('input', (e) => {
      audio.setSFXVolume(e.target.value);
    });
    document.getElementById('toggleParticles')?.addEventListener('click', (e) => {
      const opts = ['ALTA', 'MEDIA', 'BAJA'];
      const idx = opts.indexOf(e.target.textContent);
      e.target.textContent = opts[(idx + 1) % opts.length];
    });
    document.getElementById('toggleVibration')?.addEventListener('click', (e) => {
      this._settings.vibration = !this._settings.vibration;
      e.target.textContent = this._settings.vibration ? 'ON' : 'OFF';
      e.target.classList.toggle('active', this._settings.vibration);
    });
  }

  _showRecords() {
    const records = JSON.parse(localStorage.getItem('neonrunner_records') || '[]');
    const list = document.getElementById('recordsList');
    if (!list) { this.screens.show('records'); return; }
    list.innerHTML = records.length === 0
      ? '<div style="color:rgba(255,255,255,0.3);font-family:var(--font-mono);font-size:0.8rem;padding:2rem;text-align:center">// SIN REGISTROS AÚN</div>'
      : records.map((r, i) => `
        <div class="record-row">
          <span class="record-rank">#${i + 1}</span>
          <span class="record-score">${Utils.pad(r.score)}</span>
          <span>LV ${r.level}</span>
          <span class="record-date">${r.date}</span>
        </div>`).join('');
    this.screens.show('records');
  }

  _startGame() {
    this.menuAnim.stopMenu();
    this.screens.show('game');

    // Resize after screen is shown so HUD and controls are in layout
    requestAnimationFrame(() => {
      this._resizeCanvas();
      this.world = new GameWorld(this.canvas);
      this.renderer = new Renderer(this.canvas);
      this.world.start();

      if (this.loop) this.loop.stop();
      this.loop = new GameLoop(
        () => this._update(),
        () => this._render()
      );
      this.loop.start();
    });
  }

  _update() {
    if (!this.world) return;
    const inp = this.input.consume();
    this.world.update(inp);
    this._updateHUD();

    if (this.world.levelUpFlag) {
      this.world.levelUpFlag = false;
      this._showLevelUp(this.world.level);
    }

    if (this.world.over) {
      this._showGameOver();
    }
  }

  _render() {
    if (!this.world || !this.renderer) return;
    this.renderer.render(this.world);
  }

  _updateHUD() {
    if (!this.world) return;
    this._hudUpdateTimer++;
    if (this._hudUpdateTimer % 2 !== 0) return;

    const w = this.world;
    const scoreEl = document.getElementById('hudScore');
    const levelEl = document.getElementById('hudLevel');
    const comboEl = document.getElementById('comboDisplay');
    const dashEl  = document.getElementById('dashBar');
    const powerEl = document.getElementById('powerDisplay');
    const livesEl = document.getElementById('livesIcons');

    if (scoreEl) scoreEl.textContent = Utils.pad(w.score);
    if (levelEl) levelEl.textContent = String(w.level).padStart(2, '0');
    if (dashEl)  dashEl.style.width  = (w.player.dashPercent * 100) + '%';

    if (comboEl) {
      if (w.combo > 1) {
        comboEl.textContent = 'x' + w.combo + ' COMBO';
        comboEl.style.opacity = '1';
        comboEl.style.transform = 'scale(1.05)';
      } else {
        comboEl.style.opacity = '0';
      }
    }

    if (powerEl && w.powerup) {
      const labels = { shield:'⬡ ESCUDO', speedboost:'⚡ VELOCIDAD', magnet:'◎ IMÁN', doubler:'x2 PUNTOS' };
      const pct = Math.round((w.powerupTimer / 350) * 100);
      powerEl.textContent = `${labels[w.powerup] || w.powerup} [${pct}%]`;
    } else if (powerEl) {
      powerEl.textContent = '';
    }

    if (livesEl) {
      const icons = livesEl.querySelectorAll('.life-icon');
      icons.forEach((ic, i) => {
        ic.classList.toggle('active', i < w.lives);
        ic.classList.toggle('lost', i >= w.lives);
      });
    }
  }

  _showLevelUp(level) {
    const el = document.getElementById('levelupBlast');
    const screen = document.getElementById('screen-levelup');
    if (!el || !screen) return;
    el.textContent = `NIVEL ${level}`;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    screen.classList.add('active');
    setTimeout(() => screen.classList.remove('active'), 1600);
  }

  _showGameOver() {
    this.loop?.stop();
    const w = this.world;
    const isNew = w.score >= w.hiScore && w.score > 0;

    document.getElementById('goScore').textContent   = Utils.pad(w.score);
    document.getElementById('goHiscore').textContent = Utils.pad(w.hiScore);
    document.getElementById('goLevel').textContent   = String(w.level).padStart(2, '0');
    document.getElementById('goCombo').textContent   = 'x' + w.maxCombo;

    const badge = document.getElementById('newRecordBadge');
    if (badge) badge.style.display = isNew ? 'block' : 'none';

    this.screens.hide('game');
    this.screens.show('gameover');
  }

  togglePause() {
    if (!this.world || this.world.over) return;
    if (this.world.paused) {
      this.world.resume();
      this.screens.hide('pause');
    } else {
      this.world.pause();
      this.screens.show('pause');
    }
  }
}

// Boot
window.addEventListener('load', () => {
  window.game = new NeonRunnerGame();
});
