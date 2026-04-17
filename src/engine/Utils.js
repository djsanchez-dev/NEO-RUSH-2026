// ===== UTILS =====
const Utils = {
  lerp: (a, b, t) => a + (b - a) * t,
  clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
  randInt: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  randFloat: (a, b) => a + Math.random() * (b - a),
  pad: (n, len = 6) => String(Math.floor(n)).padStart(len, '0'),
  rectOverlap: (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  hexToRgb: (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }
};

// ===== PARTICLE SYSTEM =====
class Particle {
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y;
    this.vx = opts.vx ?? (Math.random() - 0.5) * 4;
    this.vy = opts.vy ?? (-Math.random() * 5 - 1);
    this.life = 1;
    this.decay = opts.decay ?? (0.02 + Math.random() * 0.03);
    this.size = opts.size ?? (Math.random() * 5 + 2);
    this.color = opts.color ?? '#b44dff';
    this.gravity = opts.gravity ?? 0.15;
    this.type = opts.type ?? 'circle'; // circle, square, spark, ring
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.shrink = opts.shrink ?? 0.97;
  }

  update() {
    this.vx *= 0.97;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.size *= this.shrink;
    this.rotation += this.rotSpeed;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.type === 'spark') {
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.moveTo(-this.size * 2, 0);
      ctx.lineTo(this.size * 2, 0);
      ctx.lineWidth = this.size * 0.4;
      ctx.stroke();
    } else if (this.type === 'ring') {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (this.type === 'square') {
      ctx.shadowBlur = 4;
      ctx.shadowColor = this.color;
      ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  get alive() { return this.life > 0 && this.size > 0.3; }
}

class ParticleSystem {
  constructor(maxParticles = 400) {
    this.particles = [];
    this.max = maxParticles;
  }

  emit(x, y, count, opts = {}) {
    const room = this.max - this.particles.length;
    const n = Math.min(count, room);
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle(x, y, opts));
    }
  }

  burst(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const spd = Utils.randFloat(2, 6);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        color, type: i % 3 === 0 ? 'ring' : 'circle',
        size: Utils.randFloat(2, 5), decay: 0.025, gravity: 0.08, shrink: 0.95
      }));
    }
  }

  trail(x, y, color) {
    this.emit(x, y, 2, {
      vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
      color, size: Utils.randFloat(2, 4), decay: 0.06, gravity: 0, shrink: 0.9,
      type: 'spark'
    });
  }

  explosion(x, y, colors = ['#b44dff', '#00f5ff', '#ff2d78'], count = 30) {
    colors.forEach(c => this.burst(x, y, c, Math.floor(count / colors.length)));
  }

  jumpDust(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push(new Particle(x, y, {
        vx: (Math.random() - 0.5) * 5, vy: Math.random() * -2,
        color: '#6b21a8', type: 'square',
        size: Utils.randFloat(2, 5), decay: 0.04, gravity: 0.1, shrink: 0.93
      }));
    }
  }

  update() {
    this.particles = this.particles.filter(p => { p.update(); return p.alive; });
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  clear() { this.particles = []; }
}

window.ParticleSystem = ParticleSystem;
window.Utils = Utils;
