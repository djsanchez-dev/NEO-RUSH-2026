class GameWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.W = canvas.width;
    this.H = canvas.height;
    this.reset();
  }

  get GROUND_Y() { return this.H - 80; }

  reset() {
    this.W = this.canvas.width;
    this.H = this.canvas.height;
    this.score = 0;
    this.hiScore = parseInt(localStorage.getItem('neonrunner_hi') || '0');
    this.level = 1;
    this.lives = 3;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.baseSpeed = 4;
    this.speed = this.baseSpeed;
    this.frame = 0;
    this.distance = 0;
    this.obstacles = [];
    this.collectibles = [];
    this.particles = new ParticleSystem(500);
    this.player = new Player(80, this.GROUND_Y - 30);
    this.powerup = null; // active powerup
    this.powerupTimer = 0;
    this.hitCooldown = 0;
    this.scoreMultiplier = 1;
    this.bgLayers = this._initBG();
    this.groundTiles = this._initGround();
    this._spawnTimer = 0;
    this._collectTimer = 0;
    this._portalTimer = 0;
    this.running = false;
    this.paused = false;
    this.over = false;
    this.levelUpFlag = false;
    this.screenShake = 0;
  }

  _initBG() {
    const layers = [];
    for (let layer = 0; layer < 3; layer++) {
      const items = [];
      const count = [6, 10, 18][layer];
      const spd = [0.1, 0.3, 0.7][layer];
      for (let i = 0; i < count; i++) {
        items.push({
          x: Math.random() * 2000,
          y: Math.random() * (this.H * 0.7),
          w: Utils.randFloat([60, 30, 8][layer], [120, 60, 20][layer]),
          h: Utils.randFloat([2, 2, 1][layer], [4, 3, 2][layer]),
          alpha: Utils.randFloat(0.04, 0.12),
          speed: spd,
          type: layer === 2 ? 'star' : 'building'
        });
      }
      layers.push(items);
    }
    return layers;
  }

  _initGround() {
    const tiles = [];
    for (let i = 0; i < 30; i++) {
      tiles.push({ x: i * 40 });
    }
    return tiles;
  }

  start() {
    this.running = true;
    this.over = false;
    audio.startMusic(this.level);
  }

  _calcSpeed() {
    return this.baseSpeed + this.level * 0.6 + this.score * 0.0003;
  }

  _calcLevel() {
    return 1 + Math.floor(this.score / 300);
  }

  update(input) {
    if (!this.running || this.paused || this.over) return;

    this.frame++;
    this.distance += this.speed;

    const newLevel = this._calcLevel();
    if (newLevel > this.level) {
      this.level = newLevel;
      this.levelUpFlag = true;
      this.screenShake = 18;
      audio.sfxLevelUp();
      audio.setLevel(this.level);
    }

    this.speed = this._calcSpeed();
    if (this.powerup === 'speedboost') this.speed *= 1.5;

    // Timers
    if (this.comboTimer > 0) this.comboTimer--;
    else if (this.combo > 1) { this.combo = 1; }
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.powerupTimer > 0) { this.powerupTimer--; if (this.powerupTimer === 0) this.powerup = null; }
    if (this.screenShake > 0) this.screenShake--;

    // Score
    this.score += 0.07 * this.speed * this.scoreMultiplier;

    // Spawn
    this._spawnTimer++;
    this._collectTimer++;
    this._portalTimer++;

    const spawnRate = Math.max(50, 110 - this.level * 7);
    if (this._spawnTimer >= spawnRate) {
      this._spawnTimer = 0;
      this.obstacles.push(new Obstacle(this.W + 30, this.H, this.level, this.speed));
    }
    if (this._collectTimer >= Utils.randInt(70, 100)) {
      this._collectTimer = 0;
      const types = ['orb', 'orb', 'orb', 'shield', 'speedboost', 'magnet', 'doubler'];
      const t = types[Utils.randInt(0, types.length - 1)];
      const y = t === 'orb' ? Utils.randInt(this.GROUND_Y - 80, this.GROUND_Y - 20)
                            : Utils.randInt(this.GROUND_Y - 120, this.GROUND_Y - 40);
      this.collectibles.push(new Collectible(this.W + 20, y, t));
    }

    // Player update
    this.player.update(this.GROUND_Y - this.player.h, this.particles, input.left, input.right);
    if (input.jumpPressed) { this.player.jump(this.particles); input.jumpPressed = false; }
    if (input.dashPressed) { this.player.dash(); input.dashPressed = false; }

    // Update obstacles/collectibles
    this.obstacles.forEach(o => o.update(this.speed, this.player.y, this.H));
    this.collectibles.forEach(c => c.update(this.speed));
    this.obstacles = this.obstacles.filter(o => !o.offscreen);
    this.collectibles = this.collectibles.filter(c => !c.collected && !c.offscreen);

    // Magnet effect
    if (this.powerup === 'magnet') {
      this.collectibles.forEach(c => {
        const d = Utils.dist(c.x, c.y, this.player.x + this.player.w/2, this.player.y + this.player.h/2);
        if (d < 200) {
          const angle = Math.atan2(this.player.y + this.player.h/2 - c.y, this.player.x + this.player.w/2 - c.x);
          c.x += Math.cos(angle) * 5;
          c.y += Math.sin(angle) * 5;
        }
      });
    }

    // Collision: obstacles
    if (this.hitCooldown === 0 && this.player.invincible === 0) {
      for (const obs of this.obstacles) {
        const boxes = obs.getHitBoxes();
        const phb = this.player.hitBox;
        for (const box of boxes) {
          if (Utils.rectOverlap(phb.x, phb.y, phb.w, phb.h, box.x, box.y, box.w, box.h)) {
            if (this.powerup === 'shield') {
              this.powerup = null; this.powerupTimer = 0;
              this.hitCooldown = 80;
              this.particles.explosion(this.player.x + this.player.w/2, this.player.y + this.player.h/2, ['#00ff88', '#ffffff'], 20);
              audio.sfxHit();
            } else {
              this._handleHit(obs.x + obs.w/2, obs.y + obs.h/2);
            }
            break;
          }
        }
      }
    }

    // Collision: collectibles
    this.collectibles.forEach(c => {
      if (c.collected) return;
      const d = Utils.dist(c.x, c.y, this.player.x + this.player.w/2, this.player.y + this.player.h/2);
      if (d < this.player.w/2 + c.r + 2) {
        c.collected = true;
        this._handleCollect(c);
      }
    });

    // BG parallax
    this.bgLayers.forEach(layer => {
      layer.forEach(item => {
        item.x -= item.speed * this.speed;
        if (item.x < -200) item.x += 2200;
      });
    });

    this.groundTiles.forEach(t => {
      t.x -= this.speed;
      if (t.x < -40) t.x += this.groundTiles.length * 40;
    });

    this.particles.update();

    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem('neonrunner_hi', Math.floor(this.hiScore));
    }
  }

  _handleHit(ex, ey) {
    this.lives--;
    this.hitCooldown = 90;
    this.combo = 1; this.comboTimer = 0;
    this.screenShake = 24;
    this.particles.explosion(ex, ey, ['#ff2d78', '#ff4444', '#ffffff'], 28);
    audio.sfxHit();
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);

    if (this.lives <= 0) {
      this._gameOver();
    } else {
      this.player.invincible = 120;
    }
  }

  _handleCollect(c) {
    this.combo = Math.min(this.combo + 1, 10);
    this.comboTimer = 100;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const pts = c.points * this.combo * this.scoreMultiplier;
    this.score += pts;
    this.particles.burst(c.x, c.y, c.color, 12);

    switch (c.type) {
      case 'shield':   this.powerup = 'shield'; this.powerupTimer = 300; break;
      case 'speedboost': this.powerup = 'speedboost'; this.powerupTimer = 200; break;
      case 'magnet':   this.powerup = 'magnet'; this.powerupTimer = 350; break;
      case 'doubler':  this.scoreMultiplier = 2; this.powerupTimer = 300;
                       this.powerup = 'doubler'; break;
      default: break;
    }
    audio.sfxCollect(this.combo);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  _gameOver() {
    this.running = false;
    this.over = true;
    audio.sfxDeath();
    audio.stopMusic();
    this._saveRecord();
  }

  _saveRecord() {
    const records = JSON.parse(localStorage.getItem('neonrunner_records') || '[]');
    records.push({ score: Math.floor(this.score), level: this.level, date: new Date().toLocaleDateString() });
    records.sort((a, b) => b.score - a.score);
    records.splice(10);
    localStorage.setItem('neonrunner_records', JSON.stringify(records));
  }

  pause() { this.paused = true; audio.stopMusic(); }
  resume() { this.paused = false; audio.startMusic(this.level); }
}

window.GameWorld = GameWorld;
