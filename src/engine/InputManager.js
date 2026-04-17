class InputManager {
  constructor() {
    this.keys = {};
    this.jumpPressed = false;
    this.dashPressed = false;
    this._bind();
  }

  get left()  { return !!(this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A']); }
  get right() { return !!(this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']); }

  _bind() {
    document.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') this.jumpPressed = true;
      if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') this.dashPressed = true;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') window.game?.togglePause();
    });
    document.addEventListener('keyup', e => { this.keys[e.key] = false; });

    // Mobile buttons
    const addBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const d = (ev) => { ev.preventDefault(); onDown(); };
      const u = (ev) => { ev.preventDefault(); if (onUp) onUp(); };
      el.addEventListener('touchstart', d, { passive: false });
      el.addEventListener('touchend', u, { passive: false });
      el.addEventListener('mousedown', d);
      el.addEventListener('mouseup', u);
    };

    addBtn('btnLeft',  () => this.keys['ArrowLeft']  = true, () => this.keys['ArrowLeft']  = false);
    addBtn('btnRight', () => this.keys['ArrowRight'] = true, () => this.keys['ArrowRight'] = false);
    addBtn('btnJump',  () => { this.keys['ArrowUp'] = true; this.jumpPressed = true; }, () => this.keys['ArrowUp'] = false);
    addBtn('btnDash',  () => { this.dashPressed = true; });
  }

  consume() {
    const jp = this.jumpPressed;
    const dp = this.dashPressed;
    this.jumpPressed = false;
    this.dashPressed = false;
    return { left: this.left, right: this.right, jumpPressed: jp, dashPressed: dp };
  }
}

window.InputManager = InputManager;
