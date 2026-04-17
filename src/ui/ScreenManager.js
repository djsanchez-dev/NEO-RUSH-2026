class ScreenManager {
  constructor() {
    this.current = null;
    this.screens = {};
    document.querySelectorAll('.screen').forEach(el => {
      this.screens[el.id.replace('screen-', '')] = el;
    });
  }

  show(name, cb) {
    if (this.current) {
      const prev = this.screens[this.current];
      if (prev) { prev.classList.remove('active'); prev.style.pointerEvents = 'none'; }
    }
    const next = this.screens[name];
    if (next) {
      next.classList.add('active');
      next.style.pointerEvents = 'all';
      this.current = name;
    }
    if (cb) setTimeout(cb, 50);
  }

  hide(name) {
    const el = this.screens[name];
    if (el) { el.classList.remove('active'); el.style.pointerEvents = 'none'; }
  }
}

window.ScreenManager = ScreenManager;
