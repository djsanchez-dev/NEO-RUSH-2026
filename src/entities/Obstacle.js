// ===== OBSTACLES =====
class Obstacle {
  constructor(x, canvasH, level, worldSpeed) {
    this.type = this._pickType(level);
    this.worldSpeed = worldSpeed;
    this.anim = 0;
    this._setup(x, canvasH);
  }

  _pickType(level) {
    const pool = ['spike'];
    if (level >= 1) pool.push('wall', 'wall');
    if (level >= 2) pool.push('floater', 'floater');
    if (level >= 3) pool.push('drone');
    if (level >= 4) pool.push('barrier');
    if (level >= 5) pool.push('laser');
    return pool[Utils.randInt(0, pool.length - 1)];
  }

  _setup(x, H) {
    const GROUND = H - 80;
    switch (this.type) {
      case 'spike':
        this.x = x; this.y = GROUND - 18; this.w = 18; this.h = 18;
        this.color = '#ff4466';
        break;
      case 'wall':
        this.h = Utils.randInt(35, 70);
        this.x = x; this.y = GROUND - this.h + 2; this.w = 18;
        this.color = '#cc2244';
        break;
      case 'floater':
        this.x = x; this.y = Utils.randInt(H * 0.25, H * 0.5);
        this.w = 22; this.h = 22;
        this.startY = this.y;
        this.color = '#ff6622';
        break;
      case 'drone':
        this.x = x; this.y = Utils.randInt(H * 0.2, H * 0.45);
        this.w = 28; this.h = 16;
        this.startY = this.y;
        this.diveState = 0;
        this.color = '#ff2244';
        break;
      case 'barrier':
        this.x = x; this.w = 12;
        this.gap = Utils.randInt(70, 100);
        this.topH = Utils.randInt(30, GROUND - this.gap - 30);
        this.y = 0; this.h = this.topH;
        this.botY = this.topH + this.gap;
        this.botH = GROUND - this.botY;
        this.color = '#992244';
        break;
      case 'laser':
        this.x = x; this.y = Utils.randInt(80, GROUND - 20);
        this.w = 6; this.h = Utils.randInt(40, 80);
        this.pulseOn = true;
        this.pulseTimer = 0;
        this.color = '#ff0088';
        break;
    }
  }

  update(speed, playerY, H) {
    this.x -= speed;
    this.anim++;
    const GROUND = H - 80;
    if (this.type === 'floater') {
      this.y = this.startY + Math.sin(this.anim * 0.05) * 18;
    }
    if (this.type === 'drone') {
      this.y = this.startY + Math.sin(this.anim * 0.04) * 15;
      if (this.anim % 80 === 0 && playerY < GROUND) {
        this.diveState = 20;
      }
      if (this.diveState > 0) { this.y += 4; this.diveState--; }
      else this.y = Utils.lerp(this.y, this.startY, 0.05);
    }
    if (this.type === 'laser') {
      this.pulseTimer++;
      if (this.pulseTimer > 30) { this.pulseOn = !this.pulseOn; this.pulseTimer = 0; }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    switch (this.type) {
      case 'spike':
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2, this.y);
        ctx.lineTo(this.x + this.w, this.y + this.h);
        ctx.lineTo(this.x, this.y + this.h);
        ctx.closePath(); ctx.fill();
        // Inner glow
        ctx.fillStyle = '#ffaaaa';
        ctx.beginPath();
        ctx.moveTo(this.x + this.w/2, this.y + 4);
        ctx.lineTo(this.x + this.w - 4, this.y + this.h);
        ctx.lineTo(this.x + 4, this.y + this.h);
        ctx.closePath(); ctx.fill();
        break;

      case 'wall':
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = 'rgba(255,100,100,0.3)';
        ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);
        // Warning stripes
        ctx.fillStyle = 'rgba(255,200,0,0.15)';
        for (let i = 0; i < this.h; i += 14) {
          if (Math.floor(i / 14) % 2 === 0)
            ctx.fillRect(this.x, this.y + i, this.w, 7);
        }
        break;

      case 'floater':
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.rotate(this.anim * 0.03);
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, -this.h/2); ctx.lineTo(this.w/4, 0); ctx.lineTo(0, this.h/2); ctx.lineTo(-this.w/4, 0);
          ctx.closePath(); ctx.fill();
        }
        break;

      case 'drone':
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        ctx.fillStyle = '#ff8888';
        ctx.fillRect(-this.w/2 + 2, -this.h/2 + 2, this.w - 4, this.h - 4);
        // Wings
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.w, -4, this.w/2 - 2, 8);
        ctx.fillRect(this.w/2 + 2, -4, this.w/2 - 2, 8);
        // Red eye
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        break;

      case 'barrier':
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillRect(this.x, this.botY, this.w, this.botH);
        ctx.fillStyle = '#ff88aa';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
        ctx.strokeRect(this.x + 1, this.botY + 1, this.w - 2, this.botH - 2);
        break;

      case 'laser':
        if (this.pulseOn) {
          ctx.globalAlpha = 0.7 + Math.sin(this.anim * 0.3) * 0.3;
          ctx.fillRect(this.x, this.y, this.w, this.h);
          ctx.globalAlpha = 0.3;
          ctx.fillRect(this.x - 4, this.y, this.w + 8, this.h);
        } else {
          ctx.globalAlpha = 0.2;
          ctx.fillRect(this.x, this.y, this.w, this.h);
        }
        break;
    }
    ctx.restore();
  }

  getHitBoxes() {
    if (this.type === 'barrier') {
      return [
        { x: this.x, y: this.y, w: this.w, h: this.h },
        { x: this.x, y: this.botY, w: this.w, h: this.botH }
      ];
    }
    if (this.type === 'laser' && !this.pulseOn) return [];
    return [{ x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 4 }];
  }

  get offscreen() { return this.x < -100; }
}

// ===== COLLECTIBLES =====
class Collectible {
  constructor(x, y, type = 'orb') {
    this.x = x; this.y = y;
    this.type = type; // orb, shield, speedboost, magnet, doubler
    this.pulse = Math.random() * Math.PI * 2;
    this.collected = false;
    this.anim = 0;
    this._setup();
  }

  _setup() {
    switch (this.type) {
      case 'orb':     this.r = 9; this.color = '#00f5ff'; this.altColor = '#b44dff'; this.points = 10; break;
      case 'shield':  this.r = 11; this.color = '#00ff88'; this.points = 25; break;
      case 'speedboost': this.r = 10; this.color = '#ffe600'; this.points = 20; break;
      case 'magnet':  this.r = 10; this.color = '#ff2d78'; this.points = 20; break;
      case 'doubler': this.r = 12; this.color = '#ff9900'; this.points = 30; break;
    }
  }

  update(speed) {
    this.x -= speed * 0.88;
    this.pulse += 0.1;
    this.anim++;
  }

  draw(ctx) {
    if (this.collected) return;
    ctx.save();
    const bob = Math.sin(this.pulse) * 3;

    switch (this.type) {
      case 'orb': {
        const grad = ctx.createRadialGradient(this.x, this.y + bob, 0, this.x, this.y + bob, this.r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, this.color);
        grad.addColorStop(1, this.altColor || this.color);
        ctx.shadowBlur = 18; ctx.shadowColor = this.color;
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(this.x, this.y + bob, this.r + Math.sin(this.pulse) * 1.5, 0, Math.PI * 2); ctx.fill();
        // Inner shine
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(this.x - 2, this.y + bob - 2, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'shield': {
        ctx.shadowBlur = 16; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + bob - this.r);
        ctx.quadraticCurveTo(this.x + this.r + 4, this.y + bob - this.r / 2, this.x, this.y + bob + this.r);
        ctx.quadraticCurveTo(this.x - this.r - 4, this.y + bob - this.r / 2, this.x, this.y + bob - this.r);
        ctx.stroke();
        ctx.fillStyle = `rgba(0,255,136,0.2)`;
        ctx.fill();
        break;
      }
      case 'speedboost': {
        ctx.shadowBlur = 14; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y + bob);
        ctx.rotate(this.anim * 0.04);
        for (let i = 0; i < 3; i++) {
          ctx.rotate(Math.PI * 2 / 3);
          ctx.fillRect(-3, -this.r, 6, this.r * 0.6);
        }
        break;
      }
      case 'magnet': {
        ctx.shadowBlur = 16; ctx.shadowColor = this.color;
        ctx.translate(this.x, this.y + bob);
        ctx.rotate(this.anim * 0.05);
        ctx.strokeStyle = this.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, this.r, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#ff2d78';
        ctx.fillRect(-this.r - 3, 0, 6, 8);
        ctx.fillStyle = '#2200ff';
        ctx.fillRect(this.r - 3, 0, 6, 8);
        break;
      }
      case 'doubler': {
        ctx.shadowBlur = 20; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${Math.round(this.r * 1.4)}px 'Orbitron', monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('x2', this.x, this.y + bob);
        break;
      }
    }
    ctx.restore();
  }

  get hitCircle() {
    return { x: this.x, y: this.y, r: this.r + 6 };
  }

  get offscreen() { return this.x < -30; }
}

window.Obstacle = Obstacle;
window.Collectible = Collectible;
