/**
 * Particles placeholder — asegura compatibilidad si falta el módulo real.
 * El proyecto normalmente define `ParticleSystem` en `Utils.js`.
 * Este archivo no sobrescribe la implementación existente; solo provee
 * un stub seguro en caso de que falte.
 */
(function(){
  if (window.ParticleSystem) return; // ya existe (Utils.js)

  class Particle {
    constructor(x, y, opts = {}) {
      this.x = x; this.y = y; this.life = 1;
    }
    update() { this.life -= 0.02; }
    draw(ctx) { /* minimal no-op */ }
    get alive() { return this.life > 0; }
  }

  class ParticleSystem {
    constructor(max = 200) { this.particles = []; this.max = max; }
    emit(x, y, count) {
      for (let i = 0; i < count && this.particles.length < this.max; i++)
        this.particles.push(new Particle(x, y));
    }
    burst(x, y, color, count = 8) { this.emit(x, y, count); }
    trail(x, y, color) { this.emit(x, y, 1); }
    explosion(x, y, colors, count = 12) { this.emit(x, y, count); }
    jumpDust(x, y) { this.emit(x, y, 6); }
    update() { this.particles = this.particles.filter(p => { p.update(); return p.alive; }); }
    draw(ctx) { this.particles.forEach(p => p.draw(ctx)); }
    clear() { this.particles = []; }
  }

  window.Particle = Particle;
  window.ParticleSystem = ParticleSystem;
})();
