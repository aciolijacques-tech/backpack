// Backpack — navegação, atalhos, arrastar arquivos e inicialização.
(function () {
  const { $ } = T;
  const PAGINAS = [
    ['inicio', 'inicio', 'Início'], ['biblioteca', 'biblioteca', 'Biblioteca'], ['tarefas', 'tarefas', 'Tarefas'],
    ['calendario', 'calendario', 'Calendário'], ['rotina', 'alvo', 'Rotina'], ['clientes', 'pessoas', 'Clientes'], ['financeiro', 'dinheiro', 'Financeiro'],
    ['mapa', 'mapa', 'Mapa de conexões'], ['ferramentas', 'ferramentas', 'Ferramentas'],
    ['conquistas', 'trofeu', 'Conquistas'], ['lixeira', 'lixeira', 'Lixeira'], ['config', 'engrenagem', 'Configurações'],
  ];

  const escuroDoMac = matchMedia('(prefers-color-scheme: dark)');
  T.aplicarConfig = () => {
    const c = T.db.config;
    const escuro = c.tema === 'escuro' || (c.tema === 'auto' && escuroDoMac.matches);
    document.body.classList.toggle('escuro', escuro);
    document.querySelector('meta[name="theme-color"]').content = escuro ? '#1d1b1a' : '#cfc6bc';
    document.documentElement.style.fontSize = `${[0.9, 1, 1.1, 1.25].includes(+c.fonte) ? 16 * c.fonte : 16}px`;
    document.body.classList.toggle('compacto', !!c.compacto);
    T.hud();
  };
  escuroDoMac.addEventListener('change', () => { if (T.db && T.db.config.tema === 'auto') T.aplicarConfig(); });

  // cada troca de tela entra no histórico: os botões voltar/avançar (e ⌘[ ⌘]) voltam para a tela e a ficha
  T.ir = (p, semHistorico) => {
    if (T.tourFechar) T.tourFechar();
    if (!semHistorico && p !== T.ui.pagina) {
      history.replaceState({ p: T.ui.pagina, item: T.atual ? T.atual.id : '', cli: T.cliAberto || '' }, '', `#${T.ui.pagina}`);
      if (T.modalAberto()) { T.cliAberto = null; T.fecharModal(); }
      history.pushState({ p }, '', `#${p}`);
    }
    T.ui.pagina = p;
    T.render();
    $('#vista').scrollTop = 0; scrollTo(0, 0);
    if (T.tourAuto) T.tourAuto();
  };
  addEventListener('popstate', (e) => {
    const st = e.state || { p: location.hash.slice(1) };
    if (!T.paginas[st.p]) return;
    if (T.modalAberto()) { T.cliAberto = null; T.fecharModal(); }
    T.ir(st.p, true);
    if (st.item && T.db.itens.some((i) => i.id === st.item)) T.abrirItem(st.item);
    else if (st.cli && T.cliente(st.cli)) T.abrirCliente(st.cli);
  });
  $('#navVolta').onclick = () => history.back();
  $('#navAvanca').onclick = () => history.forward();

  T.render = () => {
    const p = T.ui.pagina, v = $('#vista');
    ['onclick', 'oncontextmenu', 'ondragstart', 'ondragover', 'ondrop', 'ondragend'].forEach((k) => { v[k] = null; });
    const abertas = T.db.tarefas.filter((t) => !t.feita).length;
    $('#trilho').innerHTML = PAGINAS.map(([id, ic, n]) => {
      const c = id === 'tarefas' ? abertas : id === 'lixeira' ? T.db.lixeira.length : 0;
      return `<button class="nav ${p === id ? 'ativo' : ''}" data-p="${id}" aria-label="${n}">${Icones.svg(ic, 20)}${c ? `<span class="nav-conta">${c > 99 ? '99+' : c}</span>` : ''}<span class="dica">${n}</span></button>`;
    }).join('');
    const y = scrollY;
    (T.paginas[p] || T.paginas.inicio)();
    scrollTo(0, y);
    T.hud();
  };

  $('#trilho').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { T.som('clique'); T.ir(b.dataset.p); } };
  $('#btnNovo').onclick = () => T.novoItemDialogo();
  $('#btnBusca').onclick = T.abrirBusca;
  $('#btnVoz').onclick = () => T.vozCriar();
  $('#foco').onclick = () => T.focoAlternar();
  $('#hud').onclick = () => T.ir('conquistas');

  // atalhos
  document.addEventListener('keydown', (e) => {
    const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (T.modalAberto()) T.fecharModal(); T.abrirBusca(); return; }
    if (e.metaKey && (e.key === '[' || e.key === ']') && !digitando) { e.preventDefault(); if (e.key === '[') history.back(); else history.forward(); return; }
    if (e.key === 'Escape') { if (!$('#nivel-novo').hidden) $('#nivel-novo').hidden = true; else if (T.modalAberto()) T.fecharModal(); $('#menu').hidden = true; return; }
    if (digitando || e.ctrlKey || e.altKey || e.metaKey || T.modalAberto() || document.querySelector('.leitor-tela')) return;
    const k = e.key.toLowerCase();
    if (e.key === '/') { e.preventDefault(); T.abrirBusca(); }
    else if (k === 'n') { e.preventDefault(); T.novoItemDialogo(); }
    else if (k === 'v' && T.vozDisponivel()) { e.preventDefault(); T.vozCriar(); }
    else if (k === 'r') T.ir('rotina');
    else if (k === 'h') T.ir('inicio');
    else if (k === 'b') T.ir('biblioteca');
    else if (k === 't') T.ir('tarefas');
    else if (k === 'c') T.ir('calendario');
    else if (k === 'm') T.ir('mapa');
    else if (k === 'f') T.focoAlternar();
  });

  // arrastar arquivo para qualquer lugar da janela
  let profundidade = 0;
  const temArquivos = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  addEventListener('dragenter', (e) => { if (temArquivos(e)) { profundidade++; $('#soltarAqui').hidden = false; } });
  addEventListener('dragleave', (e) => { if (temArquivos(e) && --profundidade <= 0) { profundidade = 0; $('#soltarAqui').hidden = true; } });
  addEventListener('dragover', (e) => { if (temArquivos(e)) e.preventDefault(); });
  addEventListener('drop', (e) => {
    if (!temArquivos(e)) return;
    e.preventDefault(); profundidade = 0; $('#soltarAqui').hidden = true;
    const arquivos = [...e.dataTransfer.files]; if (!arquivos.length) return;
    if (T.atual) { const it = T.atual; T.anexarArquivos(it, arquivos, () => T.abrirItem(it.id)); } else T.itensDeArquivos(arquivos);
  });

  // iniciar
  (async () => {
    try { await T.carregar(); } catch (e) {
      document.body.innerHTML = '<div class="desligado"><div class="vidro">Não consegui falar com o servidor do Backpack. Abra pelo “Instalar Backpack” ou pelo “Abrir.command”.</div></div>';
      return;
    }
    await T.iniciarCelular();
    // nome para a saudação: na primeira vez pega da conta do Mac; dá para trocar nas Configurações
    if (!T.db.config.nome) { try { const u = await T.api('/api/usuario'); if (u.nome) { T.db.config.nome = u.nome; T.salvar(); } } catch (_) {} }
    T.aplicarConfig();
    T.montarFundo();
    const hash = location.hash.slice(1);
    if (T.paginas[hash]) T.ui.pagina = hash;
    history.replaceState({ p: T.ui.pagina }, '', `#${T.ui.pagina}`);
    T.render();
    if (hash.startsWith('item=')) T.abrirItem(hash.slice(5));
    T.focoSincronizar();
    await T.mostrarNovidades();
    setTimeout(() => {
      if (T.modalAberto()) return;
      if (!T.db.config.ia.configurada && !T.remoto) T.iaPrimeiraVez(); else T.tourAuto();
    }, 1200);
    if (!T.remoto) { setTimeout(() => T.checarAtualizacao(false), 5000); setTimeout(() => { if (!T.modalAberto()) T.checarAppMac(); }, 2500); }
  })();
})();
