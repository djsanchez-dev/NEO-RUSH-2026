class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bgFrame = 0;
    this.cityBuildings = this._genCity();
  }

  _genCity() {
    const buildings = [];
    for (let i = 0; i < 20; i++) {
      buildings.push({
        x: i * 80 + Utils.randInt(-20, 20),
        w: Utils.randInt(40, 80),
        h: Utils.randInt(60, 200),
        lit: Array.from({ length: 20 }, () => Math.random() > 0.4),
        hue: Math.random() > 0.5 ? '#b44dff' : '#00f5ff'
      });
    }
    return buildings;
  }

  render(world) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.bgFrame++;

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (world.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * world.screenShake * 0.7;
      shakeY = (Math.random() - 0.5) * world.screenShake * 0.4;
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background
    this._drawBG(ctx, W, H, world);
    this._drawCity(ctx, W, H, world);
    this._drawGround(ctx, W, H, world);

    // Game objects
    world.obstacles.forEach(o => o.draw(ctx));
    world.collectibles.forEach(c => c.draw(ctx));
    world.particles.draw(ctx);
    world.player.draw(ctx);

    // Active powerup overlay
    if (world.powerup === 'shield') {
      ctx.save();
      ctx.strokeStyle = '#00ff88';
      ctx.shadowBlur = 20; ctx.shadowColor = '#00ff88';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(this.bgFrame * 0.15) * 0.25;
      ctx.beginPath();
      ctx.arc(world.player.x + world.player.w/2, world.player.y + world.player.h/2, 24, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
    if (world.powerup === 'doubler') {
      ctx.save();
      ctx.fillStyle = '#ff9900';
      ctx.shadowBlur = 12; ctx.shadowColor = '#ff9900';
      ctx.font = "bold 12px 'Orbitron', monospace";
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.8 + Math.sin(this.bgFrame * 0.2) * 0.2;
      ctx.fillText('x2', world.player.x + world.player.w/2, world.player.y - 12);
      ctx.restore();
    }

    ctx.restore();

    // Scanlines overlay (no shake)
    this._drawScanlines(ctx, W, H);
    // Vignette
    this._drawVignette(ctx, W, H);

    // Debug overlay: hitboxes and FPS
    try {
      if (window.DEBUG) {
        ctx.save();
        // Obstacles hitboxes
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,60,60,0.95)';
        world.obstacles.forEach(o => {
          const boxes = o.getHitBoxes();
          boxes.forEach(b => ctx.strokeRect(b.x, b.y, b.w, b.h));
        });
        // Player hitbox
        const ph = world.player.hitBox;
        ctx.strokeStyle = 'rgba(60,255,120,0.95)';
        ctx.strokeRect(ph.x, ph.y, ph.w, ph.h);

        // FPS
        const fps = (window.game && window.game.loop) ? window.game.loop.fps : 0;
        ctx.font = "12px 'Share Tech Mono', monospace";
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText('FPS: ' + fps, 8, 16);
        ctx.restore();
      }
    } catch (e) { /* fail silently in prod */ }
  }

  _drawBG(ctx, W, H, world) {
    // Deep space gradient
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#02000a');
    grd.addColorStop(0.6, '#06001a');
    grd.addColorStop(1, '#0a0028');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Distant stars layer
    world.bgLayers[2].forEach(s => {
      ctx.fillStyle = `rgba(200,180,255,${s.alpha + Math.sin(this.bgFrame * 0.01 + s.x) * 0.02})`;
      ctx.beginPath();
      ctx.arc(s.x % W, s.y, s.w / 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Horizontal speed lines
    if (world.speed > 6) {
      const density = Math.floor((world.speed - 6) * 1.5);
      ctx.strokeStyle = 'rgba(180,77,255,0.06)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < density; i++) {
        const y = (this.bgFrame * 3 * (i + 1) * 7 + i * 400) % H;
        const len = Utils.randFloat(20, 80);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(len, y); ctx.stroke();
      }
    }
  }

  _drawCity(ctx, W, H, world) {
    const groundY = H - 80;
    const scroll = (world.distance * 0.15) % (W + 200);

    this.cityBuildings.forEach((b, i) => {
      const bx = ((b.x - scroll + 2000) % (W + 200)) - 100;
      const by = groundY - b.h;

      // Building body
      ctx.fillStyle = 'rgba(8,4,24,0.85)';
      ctx.fillRect(bx, by, b.w, b.h);

      // Neon outline
      ctx.strokeStyle = `rgba(${b.hue === '#b44dff' ? '100,40,160' : '0,100,130'},0.35)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, b.w, b.h);

      // Windows
      const rows = Math.floor(b.h / 14);
      const cols = Math.floor(b.w / 12);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (b.lit[idx % b.lit.length]) {
            const wx = bx + c * 12 + 3;
            const wy = by + r * 14 + 4;
            ctx.fillStyle = `rgba(${b.hue === '#b44dff' ? '160,80,255' : '0,200,220'},0.4)`;
            ctx.fillRect(wx, wy, 7, 8);
          }
        }
      }

      // Antenna glow
      if (i % 3 === 0) {
        ctx.fillStyle = '#ff2244';
        ctx.shadowBlur = 8; ctx.shadowColor = '#ff2244';
        ctx.beginPath(); ctx.arc(bx + b.w/2, by - 4, 2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }

  _drawGround(ctx, W, H, world) {
    const groundY = H - 80;

    // Ground glow
    const grd = ctx.createLinearGradient(0, groundY, 0, H);
    grd.addColorStop(0, 'rgba(100,40,200,0.3)');
    grd.addColorStop(0.3, 'rgba(60,20,140,0.15)');
    grd.addColorStop(1, 'rgba(10,0,30,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Ground line
    ctx.strokeStyle = '#7c2fcc';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12; ctx.shadowColor = '#b44dff';
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
    ctx.shadowBlur = 0;

    // Grid tiles
    world.groundTiles.forEach(t => {
      const x = t.x % W;
      ctx.strokeStyle = 'rgba(120,50,200,0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, groundY + 30); ctx.stroke();
    });

    // Horizontal grid lines below ground
    for (let i = 1; i <= 3; i++) {
      const y = groundY + i * 20;
      const alpha = 0.08 - i * 0.02;
      ctx.strokeStyle = `rgba(100,40,180,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  _drawScanlines(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  _drawVignette(ctx, W, H) {
    const vgrd = ctx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*0.85);
    vgrd.addColorStop(0, 'transparent');
    vgrd.addColorStop(1, 'rgba(2,0,10,0.55)');
    ctx.fillStyle = vgrd;
    ctx.fillRect(0, 0, W, H);
  }
}

window.Renderer = Renderer;
