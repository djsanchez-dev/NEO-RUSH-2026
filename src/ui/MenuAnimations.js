class MenuAnimations {
  constructor() {
    this.menuCanvas = document.getElementById('menuParticles');
    this.mCtx = this.menuCanvas ? this.menuCanvas.getContext('2d') : null;
    this.particles = [];
    this.animId = null;
    this._initParticles();
  }

  _initParticles() {
    for (let i = 0; i < 60; i++) {
      this.particles.push(this._newParticle(true));
    }
  }

  _newParticle(initial = false) {
    return {
      x: initial ? Math.random() * 2000 : 2100,
      y: Math.random() * 600,
      size: Utils.randFloat(0.5, 2.5),
      speed: Utils.randFloat(0.3, 1.8),
      alpha: Utils.randFloat(0.1, 0.5),
      color: Math.random() > 0.5 ? '#b44dff' : '#00f5ff',
      pulse: Math.random() * Math.PI * 2
    };
  }

  startMenu() {
    if (!this.mCtx) return;
    this._resizeMenu();
    this._loopMenu();
  }

  _resizeMenu() {
    if (!this.menuCanvas) return;
    this.menuCanvas.width = this.menuCanvas.offsetWidth;
    this.menuCanvas.height = this.menuCanvas.offsetHeight;
  }

  _loopMenu() {
    if (!this.mCtx) return;
    const ctx = this.mCtx;
    const W = this.menuCanvas.width;
    const H = this.menuCanvas.height;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(180,77,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Floating particles
    this.particles.forEach(p => {
      p.x -= p.speed;
      p.pulse += 0.04;
      if (p.x < -10) Object.assign(p, this._newParticle());
      const a = p.alpha * (0.7 + Math.sin(p.pulse) * 0.3);
      ctx.fillStyle = p.color.replace(')', `,${a})`).replace('rgb', 'rgba');
      // For hex colors
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 4; ctx.shadowColor = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // Horizontal streaks
    for (let i = 0; i < 3; i++) {
      const y = 100 + i * 180 + Math.sin(Date.now() * 0.0005 + i) * 30;
      const alpha = 0.03 + Math.sin(Date.now() * 0.001 + i * 2) * 0.02;
      ctx.strokeStyle = `rgba(0,245,255,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    this.animId = requestAnimationFrame(() => this._loopMenu());
  }

  stopMenu() {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
  }
}

window.MenuAnimations = MenuAnimations;
