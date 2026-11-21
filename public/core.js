// Backpack — núcleo: estado, API, salvamento, utilitários, avisos, janelas e menu de clique direito.
(function () {
  const T = (window.T = {
    db: null,
    ui: { pagina: 'inicio', q: '', tipo: '', categoria: '', status: '', tag: '', fav: false, ordem: { k: 'atualizadoEm', d: -1 }, calMes: null },
    paginas: {},
  });

  T.TIPOS = [
    { id: 'pdf', nome: 'Estudo/PDF', cor: '#4f8cff' },
    { id: 'prompt', nome: 'Prompt', cor: '#a46bff' },
    { id: 'instrucao', nome: 'Instrução', cor: '#2fbf8f' },
    { id: 'comando', nome: 'Comando', cor: '#ff7e00' },
    { id: 'link', nome: 'Link', cor: '#e0b100' },
    { id: 'nota', nome: 'Nota', cor: '#ff5a7a' },
    { id: 'skill', nome: 'Skill', cor: '#00c2a8' },
  ];
  T.STATUS = [{ id: 'ver', nome: 'Para ver' }, { id: 'andamento', nome: 'Em andamento' }, { id: 'feito', nome: 'Concluído' }];
  T.PRIOS = ['baixa', 'media', 'alta'];
  T.PRIO_NOME = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
  T.tipo = (id) => T.TIPOS.find((t) => t.id === id) || T.TIPOS[5];
  T.cat = (id) => T.db.categorias.find((c) => c.id === id);

  // ---------- utilitários ----------
  const pad = (n) => String(n).padStart(2, '0');
  T.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  T.ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  T.hoje = () => T.ymd(new Date());
  T.dataLocalISO = T.hoje;
  T.somarDias = (s, n) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return T.ymd(d); };
  T.fmtData = (s) => { if (!s) return ''; const [a, m, d] = s.split('-'); return `${d}/${m}${a !== String(new Date().getFullYear()) ? `/${a.slice(2)}` : ''}`; };
  T.agora = () => new Date().toISOString();
  T.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  T.norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  T.$ = (s, r) => (r || document).querySelector(s);
  T.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  T.tamanho = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  T.ehTexto = (nome) => /\.(md|markdown|txt)$/i.test(nome || '');
  T.urlAnexo = (a, baixar) => `/api/anexos/${encodeURIComponent(a.arquivo)}?nome=${encodeURIComponent(a.nome)}${baixar ? '&download=1' : ''}`;
  T.iconeArquivo = (a) => {
    const n = (a.nome || '').toLowerCase();
    if (/\.pdf$/.test(n)) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|svg)$/.test(n)) return 'imagem';
    if (/\.(mp3|wav|ogg|m4a|mp4|webm|mov)$/.test(n)) return 'midia';
    if (/\.(md|markdown|txt)$/.test(n)) return 'livro';
    return 'nota';
  };

  // ---------- API ----------
  const H = { 'X-Backpack': '1', 'Content-Type': 'application/json' };
  T.api = async (caminho, opt = {}) => {
    const r = await fetch(caminho, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.erro || `erro ${r.status}`), { status: r.status, dados: j });
    return j;
  };
  const clonar = (o) => JSON.parse(JSON.stringify(o));
  T.carregar = async () => { T.db = await T.api('/api/db'); T.base = clonar(T.db); };

  // ---------- sincronia entre janelas e aparelhos ----------
  // base = último estado combinado com o servidor. Junta por id: mudou só lá entra, mudou só aqui fica,
  // mudou nos dois fica o daqui; apagado de um lado continua apagado. Os objetos são trocados no lugar
  // para a janela aberta não perder a referência.
  const LISTAS = ['itens', 'tarefas', 'categorias', 'clientes', 'fin', 'habitos', 'metas', 'ferramentas'];
  const SEM = new Set(['_novo', '_xp', '_salvo']);
  const igual = (a, b) => JSON.stringify(a, (k, v) => (SEM.has(k) ? undefined : v)) === JSON.stringify(b, (k, v) => (SEM.has(k) ? undefined : v));
  const trocarNoLugar = (alvo, novo) => { Object.keys(alvo).forEach((k) => { if (!SEM.has(k)) delete alvo[k]; }); Object.assign(alvo, novo); return alvo; };
  function juntarLista(L, S, B, chave) {
    const mapa = (lista) => new Map((lista || []).map((x) => [chave(x), x]));
    const mL = mapa(L), mS = mapa(S), mB = mapa(B), out = [];
    let mudouAqui = false;
    for (const x of S || []) {
      const k = chave(x), l = mL.get(k), b = mB.get(k);
      if (l) {
        if (b && !igual(l, b)) { out.push(l); if (!igual(l, x)) mudouAqui = true; } // mudou aqui: fica o daqui
        else out.push(trocarNoLugar(l, x));
      } else if (!b) out.push(x); // novo lá
      else mudouAqui = true; // apagado aqui
    }
    for (const l of L || []) {
      const k = chave(l);
      if (mS.has(k)) continue;
      if (!mB.has(k)) { out.push(l); mudouAqui = true; } // novo aqui
    }
    return { lista: out, mudouAqui };
  }
  T.juntar = (S) => {
    const L = T.db, B = T.base || S;
    let mudouAqui = false;
    for (const k of LISTAS) { const r = juntarLista(L[k], S[k], B[k], (x) => x.id); L[k] = r.lista; mudouAqui = mudouAqui || r.mudouAqui; }
    const rl = juntarLista(L.lixeira, S.lixeira, B.lixeira, (x) => `${x.tipo}:${x.dados.id}`);
    L.lixeira = rl.lista.sort((a, b) => b.em.localeCompare(a.em)); mudouAqui = mudouAqui || rl.mudouAqui;
    for (const k of ['config', 'jogo']) {
      if (!igual(L[k], B[k])) mudouAqui = mudouAqui || !igual(L[k], S[k]);
      else L[k] = S[k];
    }
    L.pacotes = [...new Set([...(S.pacotes || []), ...(L.pacotes || [])])];
    L.rev = S.rev;
    T.base = clonar(S);
    return mudouAqui;
  };
  // guarda o que estava digitado na tela para devolver depois de redesenhar
  T.renderGuardando = () => {
    const vals = T.$$('#vista input[id], #vista textarea[id], #vista select[id]').map((el) => [el.id, el.value, el === document.activeElement]);
    T.render();
    vals.forEach(([id, v, foco]) => { const el = document.getElementById(id); if (el && el.type !== 'checkbox' && el.type !== 'file' && el.value !== v) { el.value = v; } if (el && foco) el.focus(); });
  };

  // salvamento: espera 250 ms, manda um de cada vez e respeita a revisão do servidor
  let timer = 0, salvando = false, pendente = false;
  async function enviarAgora() {
    timer = 0;
    if (salvando) { pendente = true; return; }
    salvando = true;
    try {
      const corpo = JSON.stringify(T.db);
      const r = await T.api('/api/db', { method: 'PUT', body: corpo });
      T.db.rev = r.rev;
      T.base = JSON.parse(corpo); T.base.rev = r.rev;
      const ponto = T.$('#salvo'); if (ponto) { ponto.classList.add('on'); setTimeout(() => ponto.classList.remove('on'), 900); }
      const d = T.db.config.drive;
      if (d && d.ligado && d.pasta) { clearTimeout(T._driveT); T._driveT = setTimeout(() => T.api('/api/drive/sincronizar', { method: 'POST' }).catch(() => {}), 4000); }
    } catch (e) {
      if (e.status === 409) {
        // outro aparelho ou janela salvou antes: junta e manda de novo
        try {
          const S = await T.api('/api/db');
          T.juntar(S);
          pendente = true;
          if (!T.modalAberto()) T.renderGuardando();
        } catch (_) { T.toast('Não consegui juntar com a outra janela. Recarregue a página.', null, 'erro'); }
      } else T.toast(`Não consegui salvar: ${e.message}`, null, 'erro');
    } finally {
      salvando = false;
      if (pendente) { pendente = false; enviarAgora(); }
    }
  }
  T.salvar = (rapido) => { clearTimeout(timer); timer = setTimeout(enviarAgora, rapido ? 0 : 250); };
  T.temMudancaPendente = () => !!timer || salvando;
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) { clearTimeout(timer); timer = 0; enviarAgora(); } });

  // puxa o que outra janela ou o celular salvou: ao voltar o foco e a cada 4 s com a janela visível
  let sincronizando = false;
  T.sincronizar = async () => {
    if (salvando || pendente || timer || sincronizando || !T.db || document.visibilityState !== 'visible') return;
    sincronizando = true;
    try {
      const { rev } = await T.api('/api/rev');
      if (rev > T.db.rev && !salvando && !timer) {
        const S = await T.api('/api/db');
        if (!salvando && !timer) {
          const mudouAqui = T.juntar(S);
          if (mudouAqui) T.salvar();
          if (!T.modalAberto()) T.renderGuardando();
          if (T.aoSincronizar) T.aoSincronizar();
        }
      }
    } catch (_) {}
    sincronizando = false;
  };
  addEventListener('focus', T.sincronizar);
  setInterval(T.sincronizar, 4000);

  T.enviarArquivo = async (file) => {
    const r = await fetch(`/api/anexos?nome=${encodeURIComponent(file.name)}`, {
      method: 'POST', headers: { 'X-Backpack': '1', 'Content-Type': file.type || 'application/octet-stream' }, body: file,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || `erro ${r.status}`);
    return { id: T.uid(), nome: j.nome, arquivo: j.arquivo, tamanho: j.tamanho, mime: j.mime };
  };

  // ---------- itens, tarefas e lixeira ----------
  T.novoItem = (o) => {
    const t = T.agora();
    return { id: T.uid(), tipo: 'nota', titulo: '', descricao: '', texto: '', checklist: [], links: [], anexos: [], categoria: '', status: 'ver', tags: [], data: '', fav: false, enviado: {}, cliente: '', modelo: false, origem: null, rascunho: '', voz: '', criadoEm: t, atualizadoEm: t, ...o };
  };
  T.mexeu = (it) => { it.atualizadoEm = T.agora(); T.salvar(); };
  T.criarItem = (o, semXp) => {
    const it = T.novoItem({ categoria: T.ui.categoria || '', tipo: T.ui.tipo || 'nota', ...o });
    T.db.itens.push(it);
    if (!semXp) T.ganhar('item');
    T.salvar();
    T.som('pop');
    return it;
  };
  T.LISTA_DO_TIPO = { item: 'itens', tarefa: 'tarefas', cliente: 'clientes', fin: 'fin' };
  const NOME_LIXO = { item: 'Item foi', tarefa: 'Tarefa foi', cliente: 'Cliente foi', fin: 'Lançamento foi' };
  T.paraLixeira = (tipo, obj, quieto) => {
    const k = T.LISTA_DO_TIPO[tipo];
    T.db[k] = T.db[k].filter((x) => x.id !== obj.id);
    T.db.lixeira.unshift({ tipo, dados: obj, em: T.agora() });
    T.salvar();
    if (quieto) return;
    T.som('lixo');
    T.toast(`${NOME_LIXO[tipo]} para a lixeira`, () => T.restaurar(obj.id, true));
    T.render();
  };
  T.restaurar = (id, silencioso) => {
    const i = T.db.lixeira.findIndex((x) => x.dados.id === id);
    if (i < 0) return;
    const [e] = T.db.lixeira.splice(i, 1);
    T.db[T.LISTA_DO_TIPO[e.tipo] || 'itens'].push(e.dados);
    T.salvar(); T.som('desfazer'); T.render();
    if (!silencioso) T.toast('Restaurado');
  };
  T.apagarDeVez = (id) => { T.db.lixeira = T.db.lixeira.filter((x) => x.dados.id !== id); T.salvar(); T.som('lixo'); T.render(); };
  T.alternarFav = (id) => {
    const it = T.db.itens.find((i) => i.id === id); if (!it) return;
    it.fav = !it.fav; T.mexeu(it); T.som(it.fav ? 'estrela' : 'clique'); T.render();
  };
  T.copiarTexto = async (texto) => {
    try { await navigator.clipboard.writeText(texto); } catch (_) {
      const ta = document.createElement('textarea'); ta.value = texto; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
  };
  T.copiarItem = async (it) => {
    await T.copiarTexto(it.texto || it.descricao || it.titulo);
    if (it.tipo === 'prompt') { if (!T.ganhar('copia')) T.som('copia'); } else T.som('copia');
    T.toast('Copiado');
  };
  T.duplicar = (it) => {
    const c = T.novoItem(JSON.parse(JSON.stringify(it)));
    c.id = T.uid(); c.titulo = `${it.titulo || 'Sem título'} (cópia)`; c.criadoEm = c.atualizadoEm = T.agora();
    c.checklist.forEach((x) => { x.id = T.uid(); });
    T.db.itens.push(c); T.salvar(); T.som('pop'); T.render(); T.toast('Duplicado');
  };
  T.todasTags = () => {
    const s = new Set(T.db.tags || []);
    T.db.itens.forEach((i) => i.tags.forEach((t) => s.add(t)));
    (T.db.clientes || []).forEach((c) => c.tags.forEach((t) => s.add(t)));
    return [...s].sort((a, b) => a.localeCompare(b, 'pt'));
  };
  // registra etiquetas novas no registro permanente (data/db.json: tags), para elas continuarem
  // aparecendo como sugestão mesmo que sejam apagadas depois do item/cliente onde foram digitadas
  T.registrarTags = (novas) => {
    const s = new Set(T.db.tags || (T.db.tags = []));
    let mudou = false;
    (novas || []).forEach((t) => { t = String(t || '').trim(); if (t && !s.has(t)) { s.add(t); mudou = true; } });
    if (mudou) { T.db.tags = [...s].sort((a, b) => a.localeCompare(b, 'pt')); T.salvar(); }
  };

  // ---------- avisos (toasts) ----------
  T.toast = (msg, desfazer, tipo) => {
    const el = document.createElement('div');
    el.className = `toast vidro-escuro ${tipo || ''}`;
    el.innerHTML = `<span>${T.esc(msg)}</span>`;
    if (desfazer) {
      const b = document.createElement('button');
      b.className = 'btn-toast'; b.textContent = 'Desfazer';
      b.onclick = () => { desfazer(); el.remove(); };
      el.appendChild(b);
    }
    T.$('#toasts').appendChild(el);
    setTimeout(() => el.remove(), desfazer ? 6500 : 3200);
  };

  // ---------- janelas ----------
  let aoFechar = null;
  T.modal = (html, opt = {}) => {
    const ov = T.$('#sobreposicao');
    ov.innerHTML = `<div class="modal vidro ${opt.classe || ''}" role="dialog" aria-modal="true">${html}</div>`;
    ov.hidden = false;
    ov.onmousedown = (e) => { if (e.target === ov) T.fecharModal(); };
    aoFechar = opt.aoFechar || null;
    return ov.firstElementChild;
  };
  T.fecharModal = () => {
    const ov = T.$('#sobreposicao');
    if (ov.hidden) return;
    ov.hidden = true; ov.innerHTML = '';
    const f = aoFechar; aoFechar = null;
    if (f) f();
    // janela aberta de dentro da ficha de um cliente (tarefa, item, lançamento): ao fechar, volta para a ficha
    setTimeout(() => { if (!T.modalAberto() && T.cliAberto && T.cliente(T.cliAberto)) T.abrirCliente(T.cliAberto); }, 0);
  };
  T.modalAberto = () => !T.$('#sobreposicao').hidden;
  T.confirmar = (msg, rotuloOk, perigo = true) => new Promise((res) => {
    const m = T.modal(`<div class="modal-corpo"><p class="confirma">${T.esc(msg)}</p>
      <div class="linha fim"><button class="btn sec" id="cN">Cancelar</button><button class="btn ${perigo ? 'perigo' : ''}" id="cS">${T.esc(rotuloOk || 'Confirmar')}</button></div></div>`, { classe: 'pequeno' });
    T.$('#cN', m).onclick = () => { T.fecharModal(); res(false); };
    T.$('#cS', m).onclick = () => { T.fecharModal(); res(true); };
    T.$('#cS', m).focus();
  });
  T.cabecalho = (titulo, extra = '') => `<div class="modal-cab"><h2>${titulo}</h2>${extra}<button class="btn-icone" data-fechar title="Fechar (Esc)">${Icones.svg('x', 16)}</button></div>`;
  document.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) T.fecharModal(); });

  // ---------- menu de clique direito ----------
  T.menu = (e, entradas) => {
    e.preventDefault();
    const c = T.$('#menu');
    c.innerHTML = '';
    entradas.forEach((en) => {
      if (en === '-') { c.appendChild(document.createElement('hr')); return; }
      if (en.sub) { const s = document.createElement('div'); s.className = 'menu-sub'; s.textContent = en.sub; c.appendChild(s); return; }
      const b = document.createElement('button');
      b.className = en.perigo ? 'perigo' : '';
      b.innerHTML = `<span class="menu-ico">${en.emoji ? T.esc(en.emoji) : Icones.svg(en.icone || 'ponto', 15)}</span><span>${T.esc(en.t)}</span>`;
      b.onclick = () => { c.hidden = true; en.fn(); };
      c.appendChild(b);
    });
    c.hidden = false;
    const r = c.getBoundingClientRect();
    c.style.left = `${Math.max(8, Math.min(e.clientX, innerWidth - r.width - 8))}px`;
    c.style.top = `${Math.max(8, Math.min(e.clientY, innerHeight - r.height - 8))}px`;
  };
  document.addEventListener('mousedown', (e) => { if (!e.target.closest('#menu')) T.$('#menu').hidden = true; });
  document.addEventListener('scroll', () => { T.$('#menu').hidden = true; }, true);

  // componentes pequenos
  T.chave = (id, ligado, rotulo) => `<label class="chave"><input type="checkbox" id="${id}" ${ligado ? 'checked' : ''}><span class="trilho-chave"></span>${rotulo ? `<span>${rotulo}</span>` : ''}</label>`;
  T.dica = (t) => `<span class="dica-i" tabindex="0" data-tip="${T.esc(t)}">?</span>`;
  // ---------- rascunho das fichas (item e cliente) ----------
  // O que se muda numa ficha que já existia fica como rascunho até clicar em "Salvar e fechar".
  // Com a ficha aberta, os campos têm a versão em edição e _salvo guarda a foto da versão salva.
  // Fechar sem salvar devolve a versão salva e guarda a edição em `rascunho`; ao reabrir, ela volta.
  const FORA = new Set(['_salvo', 'rascunho', '_novo', '_xp', 'atualizadoEm', 'id']);
  const foto = (o) => JSON.stringify(Object.keys(o).filter((k) => !FORA.has(k)).sort().reduce((a, k) => { a[k] = o[k]; return a; }, {}));
  const aplica = (o, txt) => { const x = JSON.parse(txt); Object.keys(o).forEach((k) => { if (!FORA.has(k)) delete o[k]; }); Object.assign(o, x); };
  T.rasc = {
    foto,
    abrir(o) { if (o.rascunho) { const r = o.rascunho; o.rascunho = ''; if (!o._salvo) o._salvo = foto(o); try { aplica(o, r); } catch (_) {} } return foto(o); },
    tocar(o, base) { if (!o._salvo) o._salvo = base; },
    pendente: (o) => !!o._salvo && o._salvo !== foto(o),
    salvar(o) { delete o._salvo; o.rascunho = ''; },
    reverter(o) { if (o._salvo) { try { aplica(o, o._salvo); } catch (_) {} } delete o._salvo; o.rascunho = ''; },
    guardar(o) {
      if (T.rasc.pendente(o)) { const r = foto(o); try { aplica(o, o._salvo); } catch (_) {} o.rascunho = r; delete o._salvo; return true; }
      delete o._salvo; return false;
    },
  };
  T.rodapeSalvar = (novo) => `<div class="salvar-barra"><span class="sv-st" id="svSt"></span><span class="espaco"></span>${novo ? '<button class="btn sec" id="svNo">Descartar</button>' : `<button class="btn sec" id="svRev" hidden>${Icones.svg('desfazer', 14)} Descartar alterações</button>`}<button class="btn" id="svOk">${Icones.svg('check', 15)} Salvar e fechar</button></div>`;
  T.rodapePinta = (m, o, novo) => {
    const st = T.$('#svSt', m); if (!st) return;
    const p = !novo && T.rasc.pendente(o);
    st.textContent = novo ? 'Ficha nova: clique em Salvar para concluir' : p ? 'Alterações ainda não salvas (ficam guardadas como rascunho)' : 'Tudo salvo';
    const bar = st.closest('.salvar-barra'); bar.classList.toggle('pend', p);
    const rev = T.$('#svRev', m); if (rev) rev.hidden = !p;
  };

  // campo vazio: avisa, balança o campo e põe o cursor nele
  T.falta = (campo, msg) => {
    if (typeof campo === 'string') campo = T.$(campo);
    if (msg) T.toast(msg);
    if (!campo) return false;
    campo.classList.remove('balanca'); void campo.offsetWidth; campo.classList.add('balanca');
    campo.focus();
    T.som && T.som('erro');
    return false;
  };
  // dinheiro: "10.000", "10.000,50", "1500.5", "R$ 2.300" → número
  T.lerValor = (v) => {
    let s = String(v == null ? '' : v).replace(/[^\d,.-]/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };
  T.brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  T.cliente = (id) => (T.db.clientes || []).find((c) => c.id === id);
  T.vazio = (icone, titulo, texto) => `<div class="vazio">${Icones.svg(icone, 34)}<h3>${titulo}</h3>${texto ? `<p>${texto}</p>` : ''}</div>`;
})();
