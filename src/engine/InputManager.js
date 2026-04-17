/**
 * InputManager — Keyboard + Multi-touch support
 * Handles simultaneous button presses (move + jump + dash at the same time)
 */
class InputManager {
  constructor() {
    this.keys = {};
    this.jumpPressed = false;
    this.dashPressed = false;
    this._touchMap = {};
    this._btnState = {};
    this._bind();
  }

  get left()  { return !!(this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A'] || this._btnState['btnLeft']); }
  get right() { return !!(this.keys['ArrowRight'] || this.keys['d'] || this.keys['D'] || this._btnState['btnRight']); }

  _setBtn(id, val) {
    this._btnState[id] = val;
    if (id === 'btnJump'  && val) this.jumpPressed = true;
    if (id === 'btnDash'  && val) this.dashPressed = true;
    if (id === 'btnPause' && val) window.game?.togglePause();
    const el = document.getElementById(id);
    if (el) el.classList.toggle('pressed', val);
  }

  _bindBtn(id) {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      for (const t of e.changedTouches) this._touchMap[t.identifier] = id;
      this._setBtn(id, true);
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      e.preventDefault(); e.stopPropagation();
      for (const t of e.changedTouches) delete this._touchMap[t.identifier];
      if (!Object.values(this._touchMap).includes(id)) this._setBtn(id, false);
    }, { passive: false });

    el.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) delete this._touchMap[t.identifier];
      if (!Object.values(this._touchMap).includes(id)) this._setBtn(id, false);
    }, { passive: false });

    el.addEventListener('mousedown',  (e) => { e.preventDefault(); this._setBtn(id, true); });
    el.addEventListener('mouseup',    (e) => { e.preventDefault(); this._setBtn(id, false); });
    el.addEventListener('mouseleave', ()  => { this._setBtn(id, false); });
  }

  _bind() {
    document.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if (['ArrowUp','w','W',' '].includes(e.key)) this.jumpPressed = true;
      if (['Shift','x','X'].includes(e.key)) this.dashPressed = true;
      if (['Escape','p','P'].includes(e.key)) window.game?.togglePause();
    });
    document.addEventListener('keyup', e => { this.keys[e.key] = false; });
    ['btnLeft','btnRight','btnJump','btnDash','btnPause'].forEach(id => this._bindBtn(id));
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
