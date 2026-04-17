class GameLoop {
  constructor(updateFn, renderFn) {
    this.update = updateFn;
    this.render = renderFn;
    this._rafId = null;
    this._running = false;
    this._lastTime = 0;
    this.fps = 60;
    this.frameTime = 0;
  }

  start() {
    this._running = true;
    this._lastTime = performance.now();
    this._tick(this._lastTime);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  _tick(now) {
    if (!this._running) return;
    this.frameTime = now - this._lastTime;
    this._lastTime = now;
    this.fps = Math.round(1000 / Math.max(this.frameTime, 1));
    this.update();
    this.render();
    this._rafId = requestAnimationFrame(t => this._tick(t));
  }
}

window.GameLoop = GameLoop;
