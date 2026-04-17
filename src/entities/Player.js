class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 30; this.h = 30;
    this.vy = 0; this.vx = 0;
    this.onGround = false;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.DASH_DUR = 12;
    this.DASH_COOL = 70;
    this.invincible = 0;
    this.trail = [];
    this.MAX_TRAIL = 16;
    this.frameCount = 0;
    this.eyeBlink = 0;
    this.moveDir = 0; // -1, 0, 1
    this.speedX = 0; // world scroll speed injected from outside
    this.bounceAnim = 0;
    this.dashQueued = false;
  }

  get GRAVITY() { return 0.6; }
  get JUMP_FORCE() { return -12.5; }
  get DASH_VX() { return 18; }
  get MOVE_SPD() { return 4; }

  jump(ps) {
    if (this.jumpCount < this.maxJumps) {
      this.vy = this.JUMP_FORCE;
      this.jumpCount++;
      this.onGround = false;
      if (ps) ps.jumpDust(this.x + this.w / 2, this.y + this.h);
      audio.sfxJump();
    }
  }

  dash() {
    if (this.dashCooldown > 0) return;
    this.dashing = true;
    this.dashTimer = this.DASH_DUR;
    this.dashCooldown = this.DASH_COOL;
    this.invincible = this.DASH_DUR + 4;
    audio.sfxDash();
  }

  update(groundY, ps, moveLeft, moveRight) {
    this.frameCount++;
    if (this.eyeBlink > 0) this.eyeBlink--;
    if (this.frameCount % 120 === 0) this.eyeBlink = 8;

    // Horizontal movement
    if (moveLeft) this.vx = Utils.lerp(this.vx, -this.MOVE_SPD, 0.3);
    else if (moveRight) this.vx = Utils.lerp(this.vx, this.MOVE_SPD, 0.3);
    else this.vx = Utils.lerp(this.vx, 0, 0.3);

    if (this.dashing) {
      this.vx = this.DASH_VX;
      this.dashTimer--;
      if (this.dashTimer <= 0) { this.dashing = false; }
      if (ps) ps.trail(this.x + this.w / 2, this.y + this.h / 2, '#ffe600');
    }

    // Physics
    if (!this.onGround) this.vy += this.GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    // Ground
    if (this.y >= groundY) {
      this.y = groundY;
      if (this.vy > 0) {
        this.bounceAnim = 6;
        this.vy = 0;
        this.jumpCount = 0;
        this.onGround = true;
      }
    } else {
      this.onGround = false;
    }

    // Clamp X
    this.x = Utils.clamp(this.x, 18, 250);

    // Timers
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.invincible > 0) this.invincible--;
    if (this.bounceAnim > 0) this.bounceAnim--;

    // Trail
    this.trail.unshift({ x: this.x, y: this.y, a: 1 });
    if (this.trail.length > this.MAX_TRAIL) this.trail.pop();

    // Dash particle trail
    if (this.dashing && ps) {
      for (let i = 0; i < 3; i++)
        ps.trail(this.x - i * 5, this.y + this.h / 2, '#ffe600');
    }
  }

  draw(ctx, camX = 0) {
    const dx = this.x - camX;
    const dy = this.y;
    const flash = this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0;

    // Trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const alpha = (1 - i / this.trail.length) * (this.dashing ? 0.6 : 0.25);
      const col = this.dashing ? `rgba(255,230,0,${alpha})` : `rgba(180,77,255,${alpha})`;
      const sc = 1 - i * 0.04;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.shadowBlur = 0;
      const tw = this.w * sc, th = this.h * sc;
      const tx = (t.x - camX) + (this.w - tw) / 2;
      const ty = t.y + (this.h - th) / 2;
      this._drawBody(ctx, tx, ty, tw, th, col);
      ctx.restore();
    }

    if (flash) return;

    // Squish/stretch
    const squishY = this.bounceAnim > 0 ? 0.75 : (this.onGround ? 1 : 1.1);
    const squishX = this.bounceAnim > 0 ? 1.3 : (this.onGround ? 1 : 0.9);
    const drawW = this.w * squishX;
    const drawH = this.h * squishY;
    const drawX = dx + (this.w - drawW) / 2;
    const drawY = dy + (this.h - drawH);

    // Glow
    ctx.save();
    ctx.shadowBlur = this.dashing ? 28 : 14;
    ctx.shadowColor = this.dashing ? '#ffe600' : '#b44dff';

    const bodyColor = this.dashing ? '#fde68a' : '#e0c4ff';
    this._drawBody(ctx, drawX, drawY, drawW, drawH, bodyColor);

    // Eyes
    if (!this.dashing) {
      ctx.fillStyle = '#04000f';
      const eyeH = this.eyeBlink > 0 ? 2 : 6;
      const eyeY = drawY + drawH * 0.28;
      ctx.fillRect(drawX + drawW * 0.22, eyeY, 6, eyeH);
      ctx.fillRect(drawX + drawW * 0.6, eyeY, 6, eyeH);
      // Eye glow
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 4;
      if (this.eyeBlink === 0) {
        ctx.fillRect(drawX + drawW * 0.22, eyeY, 3, 3);
        ctx.fillRect(drawX + drawW * 0.6, eyeY, 3, 3);
      }
    }
    ctx.restore();

    // Dash ready indicator
    if (this.dashCooldown === 0) {
      ctx.save();
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(dx + this.w / 2, dy - 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawBody(ctx, x, y, w, h, color) {
    const r = 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  get dashPercent() {
    return this.dashCooldown === 0 ? 1 : 1 - this.dashCooldown / this.DASH_COOL;
  }

  get hitBox() {
    return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 };
  }
}

window.Player = Player;
