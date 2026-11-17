// Backpack — sons (gerados no navegador, sem arquivos) e confete em canvas. Tudo desligável.
(function () {
  let ctx = null;
  const ac = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());

  // cada som é uma sequência de notas curtas: [frequência, duração, atraso, forma]
  const SONS = {
    clique: [[880, 0.04, 0, 'sine']],
    pop: [[660, 0.06, 0, 'sine'], [990, 0.07, 0.05, 'sine']],
    moeda: [[988, 0.07, 0, 'square'], [1319, 0.14, 0.07, 'square']],
    estrela: [[784, 0.08, 0, 'triangle'], [1175, 0.12, 0.07, 'triangle']],
    copia: [[1200, 0.05, 0, 'sine'], [1500, 0.05, 0.04, 'sine']],
    check: [[700, 0.05, 0, 'triangle'], [1050, 0.08, 0.05, 'triangle']],
    feito: [[523, 0.08, 0, 'triangle'], [659, 0.08, 0.08, 'triangle'], [784, 0.16, 0.16, 'triangle']],
    lixo: [[300, 0.08, 0, 'sawtooth'], [200, 0.12, 0.07, 'sawtooth']],
    desfazer: [[500, 0.06, 0, 'sine'], [700, 0.08, 0.06, 'sine']],
    soltar: [[420, 0.05, 0, 'sine'], [560, 0.06, 0.04, 'sine']],
    abrir: [[600, 0.04, 0, 'sine'], [800, 0.05, 0.03, 'sine']],
    erro: [[220, 0.12, 0, 'square'], [180, 0.16, 0.1, 'square']],
    meta: [[523, 0.1, 0, 'square'], [659, 0.1, 0.1, 'square'], [784, 0.1, 0.2, 'square'], [1047, 0.25, 0.3, 'square']],
    conquista: [[659, 0.1, 0, 'triangle'], [880, 0.1, 0.1, 'triangle'], [1319, 0.3, 0.2, 'triangle']],
    nivel: [[392, 0.1, 0, 'square'], [523, 0.1, 0.1, 'square'], [659, 0.1, 0.2, 'square'], [784, 0.1, 0.3, 'square'], [1047, 0.4, 0.4, 'square']],
  };

  T.som = (nome) => {
    if (!T.db || !T.db.config.sons) return;
    const seq = SONS[nome]; if (!seq) return;
    try {
      const a = ac(), t0 = a.currentTime;
      for (const [f, d, atraso, forma] of seq) {
        const o = a.createOscillator(), g = a.createGain();
        o.type = forma; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + atraso);
        g.gain.exponentialRampToValueAtTime(forma === 'square' || forma === 'sawtooth' ? 0.035 : 0.09, t0 + atraso + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + atraso + d);
        o.connect(g).connect(a.destination);
        o.start(t0 + atraso); o.stop(t0 + atraso + d + 0.02);
      }
    } catch (_) {}
  };

  // ---------- confete ----------
  const cv = document.getElementById('confete');
  const g = cv.getContext('2d');
  let pecas = [], rodando = false;
  const CORES = ['#ff7e00', '#ffb15c', '#4f8cff', '#a46bff', '#2fbf8f', '#ff5a7a', '#e0b100', '#ffffff'];

  function tamanho() { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); }
  addEventListener('resize', tamanho); tamanho();

  function laco() {
    g.clearRect(0, 0, innerWidth, innerHeight);
    pecas = pecas.filter((p) => p.vida > 0 && p.y < innerHeight + 30);
    for (const p of pecas) {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.22; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vida -= 1;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, p.vida / 30);
      g.fillStyle = p.c; g.beginPath(); g.roundRect(-p.s / 2, -p.s / 4, p.s, p.s / 2, 2); g.fill(); g.restore();
    }
    if (pecas.length) requestAnimationFrame(laco); else { rodando = false; g.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function soltar() { if (!rodando) { rodando = true; requestAnimationFrame(laco); } }

  T.confete = (x, y, n = 40, forca = 8) => {
    if (!T.db || !T.db.config.confete || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    x = x == null ? innerWidth / 2 : x; y = y == null ? innerHeight / 3 : y;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = forca * (0.4 + Math.random());
      pecas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - forca * 0.6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 6 + Math.random() * 6, c: CORES[i % CORES.length], vida: 90 + Math.random() * 60 });
    }
    soltar();
  };
  T.chuva = () => {
    if (!T.db || !T.db.config.confete || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 120; i++) pecas.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, s: 6 + Math.random() * 6, c: CORES[i % CORES.length], vida: 220 });
    soltar();
  };

  // "+10 XP" subindo de onde a ação aconteceu
  T.flutuar = (texto, x, y) => {
    const el = document.createElement('div');
    el.className = 'flutua'; el.textContent = texto;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  };
})();
