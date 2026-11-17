// Backpack — mapa de conexões: cada item é uma bolinha colorida pelo tipo, ligada a outras por
// etiquetas em comum, categoria e menções ([[Título]] ou o título citado no texto). Canvas puro.
(function () {
  const { esc } = T;

  T.dadosMapa = () => {
    const itens = T.db.itens;
    const nos = itens.map((it) => ({ id: it.id, it, grau: 0 }));
    const porId = new Map(nos.map((n) => [n.id, n]));
    const arestas = new Map();
    const ligar = (a, b, motivo) => {
      if (a === b) return;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      let e = arestas.get(k);
      if (!e) { e = { a: porId.get(a < b ? a : b), b: porId.get(a < b ? b : a), motivos: new Set() }; arestas.set(k, e); }
      e.motivos.add(motivo);
    };
    const porTag = new Map();
    itens.forEach((it) => it.tags.forEach((t) => { t = t.toLowerCase(); if (!porTag.has(t)) porTag.set(t, []); porTag.get(t).push(it.id); }));
    porTag.forEach((ids, t) => { if (ids.length > 40) return; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) ligar(ids[i], ids[j], `#${t}`); });
    // mesma categoria: liga em corrente (não vira um novelo)
    const porCat = new Map();
    itens.forEach((it) => { if (!it.categoria) return; if (!porCat.has(it.categoria)) porCat.set(it.categoria, []); porCat.get(it.categoria).push(it); });
    porCat.forEach((lista, c) => {
      const cat = T.cat(c);
      lista.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
      for (let i = 1; i < lista.length; i++) ligar(lista[i - 1].id, lista[i].id, `categoria ${cat ? cat.nome : ''}`);
    });
    const comTitulo = itens.filter((it) => it.titulo.trim().length >= 5).map((it) => ({ id: it.id, t: it.titulo.trim().toLowerCase() }));
    itens.forEach((it) => {
      const txt = `${it.texto} ${it.descricao}`.toLowerCase();
      if (!txt.trim()) return;
      (txt.match(/\[\[([^\]]+)\]\]/g) || []).forEach((m) => { const o = comTitulo.find((x) => x.t === m.slice(2, -2).trim()); if (o) ligar(it.id, o.id, 'menção'); });
      comTitulo.forEach((o) => { if (o.id !== it.id && txt.includes(o.t)) ligar(it.id, o.id, 'menção'); });
    });
    const E = [...arestas.values()];
    E.forEach((e) => { e.a.grau++; e.b.grau++; });
    return { nos, arestas: E };
  };

  T.mapa = (host, opt = {}) => {
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    const dica = document.createElement('div'); dica.className = 'mapa-dica vidro-escuro'; dica.hidden = true;
    host.classList.add('mapa-host'); host.append(cv, dica);
    const { nos, arestas } = T.dadosMapa();
    const viz = new Map(nos.map((n) => [n, new Set()]));
    arestas.forEach((e) => { viz.get(e.a).add(e.b); viz.get(e.b).add(e.a); });
    const R = (n) => 5 + Math.sqrt(n.grau) * 2.4;
    let W = 0, H = 0, dpr = 1, cam = { x: 0, y: 0, k: 1 }, sobre = null, arrasto = null, pan = null, alfa = 1, ajustado = 0;
    nos.forEach((n, i) => { const a = i * 2.4, r = 14 * Math.sqrt(i + 1); n.x = Math.cos(a) * r; n.y = Math.sin(a) * r; n.vx = n.vy = 0; });

    const redimensionar = () => {
      const b = host.getBoundingClientRect(); dpr = devicePixelRatio || 1;
      W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = `${W}px`; cv.style.height = `${H}px`;
      if (!ajustado) { cam.x = W / 2; cam.y = H / 2; }
      alfa = Math.max(alfa, 0.3);
    };
    const ro = new ResizeObserver(redimensionar); ro.observe(host);

    function passo() {
      const k = alfa;
      for (let i = 0; i < nos.length; i++) {
        const a = nos[i];
        for (let j = i + 1; j < nos.length; j++) {
          const b = nos[j]; let dx = a.x - b.x, dy = a.y - b.y; const d2 = dx * dx + dy * dy || 0.01;
          if (d2 > 90000) continue;
          const f = (900 / d2) * k; dx *= f; dy *= f; a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy;
        }
        a.vx -= a.x * 0.012 * k; a.vy -= a.y * 0.012 * k;
      }
      arestas.forEach((e) => {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = ((d - 46) / d) * 0.035 * k;
        e.a.vx += dx * f; e.a.vy += dy * f; e.b.vx -= dx * f; e.b.vy -= dy * f;
      });
      nos.forEach((n) => { if (n === arrasto) return; n.vx *= 0.82; n.vy *= 0.82; n.x += n.vx; n.y += n.vy; });
      alfa *= 0.985;
    }

    function ajustar() {
      if (!nos.length) return;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      nos.forEach((n) => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
      const k = Math.min(2.2, Math.min(W / (x1 - x0 + 80), H / (y1 - y0 + 80)));
      cam.k = k; cam.x = W / 2 - ((x0 + x1) / 2) * k; cam.y = H / 2 - ((y0 + y1) / 2) * k;
    }

    function desenhar() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      g.save(); g.translate(cam.x, cam.y); g.scale(cam.k, cam.k);
      const perto = sobre ? viz.get(sobre) : null;
      g.lineWidth = 1.2 / cam.k;
      arestas.forEach((e) => {
        const on = sobre && (e.a === sobre || e.b === sobre);
        g.strokeStyle = on ? T.tipo(sobre.it.tipo).cor : sobre ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.22)';
        g.beginPath(); g.moveTo(e.a.x, e.a.y); g.lineTo(e.b.x, e.b.y); g.stroke();
      });
      nos.forEach((n) => {
        const apagado = sobre && n !== sobre && !perto.has(n);
        g.globalAlpha = apagado ? 0.18 : 1;
        g.fillStyle = T.tipo(n.it.tipo).cor;
        g.beginPath(); g.arc(n.x, n.y, R(n), 0, 7); g.fill();
        if (n === sobre) { g.strokeStyle = '#fff'; g.lineWidth = 2 / cam.k; g.stroke(); g.lineWidth = 1.2 / cam.k; }
        if ((cam.k > 1.3 || n === sobre || (perto && perto.has(n)) || (opt.cheio && n.grau > 2)) && !apagado) {
          g.fillStyle = 'rgba(255,255,255,.9)'; g.font = `${11 / cam.k}px -apple-system, system-ui, sans-serif`; g.textAlign = 'center';
          g.fillText((n.it.titulo || 'Sem título').slice(0, 28), n.x, n.y + R(n) + 12 / cam.k);
        }
      });
      g.globalAlpha = 1; g.restore();
    }

    function laco() {
      if (!host.isConnected) { ro.disconnect(); return; }
      if (alfa > 0.02 || arrasto) {
        for (let i = 0; i < 2; i++) passo();
        if (!ajustado && alfa < 0.35) { ajustar(); ajustado = 1; }
        if (ajustado === 1 && alfa < 0.03) { ajustar(); ajustado = 2; }
      }
      desenhar(); requestAnimationFrame(laco);
    }

    const mundo = (e) => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left - cam.x) / cam.k, y: (e.clientY - b.top - cam.y) / cam.k, sx: e.clientX - b.left, sy: e.clientY - b.top }; };
    const pegar = (p) => { let melhor = null, bd = 1e9; nos.forEach((n) => { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < R(n) + 5 / cam.k && d < bd) { bd = d; melhor = n; } }); return melhor; };

    function mostrarDica(n, p) {
      if (!n) { dica.hidden = true; return; }
      const t = T.tipo(n.it.tipo), ls = [...viz.get(n)];
      const motivos = [...new Set(arestas.filter((e) => e.a === n || e.b === n).flatMap((e) => [...e.motivos]))].slice(0, 4).join(' · ');
      dica.innerHTML = `<b style="color:${t.cor}">${esc(n.it.titulo || 'Sem título')}</b><small>${t.nome} · ${ls.length} conex${ls.length === 1 ? 'ão' : 'ões'}</small>${motivos ? `<em>${esc(motivos)}</em>` : ''}<i>clique para abrir</i>`;
      dica.hidden = false;
      dica.style.left = `${Math.max(6, Math.min(p.sx + 14, W - dica.offsetWidth - 6))}px`;
      dica.style.top = `${Math.max(6, Math.min(p.sy + 14, H - dica.offsetHeight - 6))}px`;
    }

    let mexeu = false;
    cv.onpointerdown = (e) => {
      cv.setPointerCapture(e.pointerId); mexeu = false;
      const p = mundo(e), n = pegar(p);
      if (n) { arrasto = n; alfa = Math.max(alfa, 0.3); } else pan = { x: e.clientX - cam.x, y: e.clientY - cam.y };
    };
    cv.onpointermove = (e) => {
      const p = mundo(e);
      if (arrasto) { arrasto.x = p.x; arrasto.y = p.y; arrasto.vx = arrasto.vy = 0; mexeu = true; alfa = Math.max(alfa, 0.2); return; }
      if (pan) { cam.x = e.clientX - pan.x; cam.y = e.clientY - pan.y; mexeu = true; return; }
      const n = pegar(p); sobre = n; cv.style.cursor = n ? 'pointer' : 'grab'; mostrarDica(n, p);
    };
    cv.onpointerup = () => {
      const n = arrasto; arrasto = null; pan = null;
      if (n && !mexeu) { T.som('clique'); if (opt.aoAbrir) opt.aoAbrir(); T.abrirItem(n.id); }
    };
    cv.onpointerleave = () => { if (!arrasto) { sobre = null; dica.hidden = true; } };
    cv.onwheel = (e) => {
      e.preventDefault();
      const b = cv.getBoundingClientRect(), sx = e.clientX - b.left, sy = e.clientY - b.top;
      const k = Math.min(5, Math.max(0.2, cam.k * (e.deltaY < 0 ? 1.12 : 0.89)));
      cam.x = sx - ((sx - cam.x) / cam.k) * k; cam.y = sy - ((sy - cam.y) / cam.k) * k; cam.k = k;
    };
    cv.ondblclick = (e) => { if (!pegar(mundo(e))) ajustar(); };

    redimensionar(); laco();
    return { nos, arestas, ajustar };
  };

  T.legendaMapa = () => `<div class="mapa-legenda">${T.TIPOS.map((t) => `<span><i style="background:${t.cor}"></i>${t.nome}</span>`).join('')}</div>`;

  T.paginas.mapa = () => {
    const v = T.$('#vista');
    const n = T.db.itens.length;
    v.innerHTML = `<div class="pagina-cab"><div><h1>Mapa de conexões ${T.botaoTutorial('mapa')}</h1><p>Itens com etiquetas iguais, da mesma categoria ou que citam o título de outro (ou usam <code>[[Título]]</code>) ficam ligados.</p></div>
      <div class="linha"><span class="suave" id="mapaConta"></span><button class="btn sec pequeno" id="mapaAjustar">${Icones.svg('tela', 14)} Centralizar</button></div></div>
      ${n ? '<div class="mapa-cheio vidro-escuro" id="mapaBox"></div>' : T.vazio('mapa', 'Nada para conectar ainda', 'Guarde alguns itens com etiquetas para ver as ligações.')}${T.legendaMapa()}`;
    if (!n) return;
    const g = T.mapa(T.$('#mapaBox'), { cheio: true });
    T.$('#mapaConta').textContent = `${g.nos.length} itens · ${g.arestas.length} ligações`;
    T.$('#mapaAjustar').onclick = g.ajustar;
  };
})();
