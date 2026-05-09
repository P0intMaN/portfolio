(() => {
  // ─── Hydrate data-cfg elements from config.js ─────────────────────────
  const cfg = window.PORTFOLIO || {};
  document.querySelectorAll('[data-cfg]').forEach(el => {
    const key = el.dataset.cfg;
    if (key in cfg) el.textContent = cfg[key];
  });

  const TOTAL = document.querySelectorAll('.slide').length;

  const canvas   = document.getElementById('canvas');
  const slides   = [...document.querySelectorAll('.slide')];
  const dots     = [...document.querySelectorAll('.dot')];
  const progressBar = document.getElementById('progress-bar');
  const kbdHint  = document.getElementById('kbd-hint');
  const countdown= document.getElementById('countdown');
  const palBtns  = [...document.querySelectorAll('.pal-btn')];

  let current = 0;
  let animating = false;
  let countdownTimer = null;
  let countdownVal = 10;
  let kbdHintTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;

  // ─── Scaling ─────────────────────────────────────────────────────────
  function fit() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    const dx = (window.innerWidth  - 1920 * scale) / 2;
    const dy = (window.innerHeight - 1080 * scale) / 2;
    canvas.style.transform = `scale(${scale})`;
    canvas.style.left = `${dx}px`;
    canvas.style.top  = `${dy}px`;
  }
  window.addEventListener('resize', fit);
  fit();

  // ─── Navigation ───────────────────────────────────────────────────────
  function go(index, skipAnim) {
    if (index === current && !skipAnim) return;
    if (animating) return;
    const clamped = Math.max(0, Math.min(TOTAL - 1, index));
    if (clamped === current && !skipAnim) return;

    animating = true;

    slides[current].classList.remove('active');
    current = clamped;
    slides[current].classList.add('active');

    updateHUD();
    updateDots();
    updateProgress();
    manageSectionEffects();

    // Prevent rapid navigation during the CRT animation
    setTimeout(() => { animating = false; }, 400);
  }

  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  // ─── HUD / UI state ───────────────────────────────────────────────────
  function updateHUD() {
    // HUD text is static per slide; nothing dynamic needed here.
  }

  function updateDots() {
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function updateProgress() {
    const pct = TOTAL > 1 ? (current / (TOTAL - 1)) * 100 : 100;
    if (progressBar) {
      progressBar.style.width = `${pct}%`;
    }
  }

  // ─── Section-specific effects ─────────────────────────────────────────
  function manageSectionEffects() {
    // Countdown timer only on last slide
    clearInterval(countdownTimer);
    const isLast = current === TOTAL - 1;
    if (isLast && countdown) {
      countdownVal = 10;
      countdown.textContent = countdownVal;
      countdownTimer = setInterval(() => {
        countdownVal--;
        if (countdown) countdown.textContent = String(countdownVal).padStart(2, '0');
        if (countdownVal <= 0) {
          clearInterval(countdownTimer);
          setTimeout(() => go(0), 300);
        }
      }, 900);
    }

    // Terminal typewriter on slide 4 (index 3)
    if (current === 3) runTerminalEffect();
  }

  // ─── Terminal typewriter ──────────────────────────────────────────────
  function runTerminalEffect() {
    const cursor = document.querySelector('.tline.blink');
    if (!cursor) return;
    // Just re-trigger the blink animation
    cursor.style.animation = 'none';
    void cursor.offsetWidth;
    cursor.style.animation = '';
  }

  // ─── Keyboard handler ─────────────────────────────────────────────────
  function onKey(e) {
    // Ignore when typing in an input
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    let handled = true;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown':
      case 'PageDown':   case ' ': case 'Enter': next(); break;
      case 'ArrowLeft': case 'ArrowUp':
      case 'PageUp': case 'Backspace':            prev(); break;
      case 'Home': go(0); break;
      case 'End':  go(TOTAL - 1); break;
      case 'r': case 'R': go(0); break;
      default:
        if (/^[1-9]$/.test(e.key)) {
          go(parseInt(e.key, 10) - 1);
        } else if (e.key === '0') {
          go(9);
        } else {
          handled = false;
        }
    }
    if (handled) {
      e.preventDefault();
      hideKbdHint();
    }
  }
  document.addEventListener('keydown', onKey);

  // ─── Mouse wheel / trackpad ──────────────────────────────────────────
  let wheelCooldown = false;
  document.addEventListener('wheel', e => {
    e.preventDefault();
    if (wheelCooldown) return;
    if (e.deltaY > 0 || e.deltaX > 0) next();
    else prev();
    wheelCooldown = true;
    setTimeout(() => { wheelCooldown = false; }, 650);
  }, { passive: false });

  // ─── Touch / swipe ────────────────────────────────────────────────────
  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < -40) next();
      else if (dy > 40) prev();
    } else {
      if (dx < -40) next();
      else if (dx > 40) prev();
    }
  }, { passive: true });

  // ─── Nav dot clicks ───────────────────────────────────────────────────
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { go(i); hideKbdHint(); });
  });

  // ─── Palette switcher ────────────────────────────────────────────────
  palBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pal = btn.dataset.pal;
      document.body.dataset.palette = pal;
      palBtns.forEach(b => b.classList.toggle('active', b.dataset.pal === pal));
      try { localStorage.setItem('portfolio.palette', pal); } catch (_) {}
    });
  });

  // Restore saved palette
  try {
    const saved = localStorage.getItem('portfolio.palette');
    if (saved) {
      document.body.dataset.palette = saved;
      palBtns.forEach(b => b.classList.toggle('active', b.dataset.pal === saved));
    } else {
      palBtns.forEach(b => b.classList.toggle('active', b.dataset.pal === 'galaga'));
    }
  } catch (_) {
    palBtns.forEach(b => b.classList.toggle('active', b.dataset.pal === 'galaga'));
  }

  // ─── Keyboard hint auto-hide ──────────────────────────────────────────
  function hideKbdHint() {
    if (kbdHint && !kbdHint.classList.contains('hidden')) {
      kbdHint.classList.add('hidden');
    }
  }
  // Hide hint after 4 seconds or on first interaction
  kbdHintTimer = setTimeout(hideKbdHint, 4000);

  // ─── CTA button: "PRESS START" navigates to slide 2 ──────────────────
  const pressStart = document.getElementById('press-start');
  if (pressStart) {
    pressStart.addEventListener('click', () => { go(1); hideKbdHint(); });
  }

  // ─── Contact link CTA on S10 ─────────────────────────────────────────
  const contactCta = document.getElementById('contact-cta');
  if (contactCta) {
    contactCta.addEventListener('click', () => go(0));
  }

  // ─── Marching invaders toggle ─────────────────────────────────────────
  // Pause marching when tab is hidden (perf)
  document.addEventListener('visibilitychange', () => {
    const state = document.hidden ? 'paused' : 'running';
    document.querySelectorAll('.march > *').forEach(el => {
      el.style.animationPlayState = state;
    });
  });

  // ─── Initial state ────────────────────────────────────────────────────
  go(0, true);
})();
