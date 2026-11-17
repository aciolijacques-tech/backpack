// Backpack — Clientes: contatos, funil (status), atalhos de contato e tudo do cliente junto:
// tarefas, itens da Biblioteca e lançamentos do Financeiro. Ideia do MyLoot (MIT, Prestes Design).
(function () {
  const { esc, $, $$ } = T;
  T.STATUS_CLI = [
    { id: 'prospect', nome: 'Prospect', cor: '#e0a100' },
    { id: 'ativo', nome: 'Ativo', cor: '#2fbf8f' },
    { id: 'pausado', nome: 'Pausado', cor: '#4f8cff' },
    { id: 'encerrado', nome: 'Encerrado', cor: '#8b8e96' },
  ];
  const st = (id) => T.STATUS_CLI.find((s) => s.id === id) || T.STATUS_CLI[1];
  const C = () => T.db.clientes || (T.db.clientes = []);
  let filtro = '', busca = '', modo = 'cartoes', novoAberto = null;
  T.cliAberto = null;

  const soNum = (s) => String(s || '').replace(/\D/g, '');
  T.cliLinks = (c) => {
    const L = [];
    const w = soNum(c.whats);
    if (w) L.push(['enviar', 'WhatsApp', `https://wa.me/${w.length <= 11 ? `55${w}` : w}`]);
    if (c.email) L.push(['nota', 'E-mail', `mailto:${c.email.trim()}`]);
    if (c.insta) L.push(['imagem', 'Instagram', /^https?:/i.test(c.insta) ? c.insta : `https://instagram.com/${c.insta.trim().replace(/^@/, '')}`]);
    if (c.site) L.push(['link', 'Site', /^https?:/i.test(c.site) ? c.site : `https://${c.site.trim()}`]);
    if (c.trello) L.push(['quadro', 'Trello', /^https?:/i.test(c.trello) ? c.trello : `https://${c.trello.trim()}`]);
    if (c.pasta) L.push(['pasta', 'Pasta', /^https?:/i.test(c.pasta) ? c.pasta : '#pasta']);
    return L;
  };
  const botoes = (c) => T.cliLinks(c).map(([ic, n, u]) => (u === '#pasta'
    ? `<button class="cli-a" data-pasta="${c.id}" title="Abrir a pasta no Finder">${Icones.svg(ic, 14)}<small>${n}</small></button>`
    : `<a class="cli-a" href="${esc(u)}" target="_blank" rel="noopener" title="${n}">${Icones.svg(ic, 14)}<small>${n}</small></a>`)).join('');
  T.abrirPastaCliente = async (c) => {
    if (T.remoto) return T.toast('A pasta abre só no Mac.');
    try { await T.api('/api/abrir-pasta', { method: 'POST', body: JSON.stringify({ pasta: c.pasta }) }); T.som('abrir'); } catch (e) { T.toast(e.message, null, 'erro'); }
  };
  const iniciais = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const corDe = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h} 60% 52%)`; };
  T.avatarCli = (c) => `<span class="avatar" style="background:${corDe(c.nome)}">${esc(iniciais(c.nome))}</span>`;

  function cartaoHTML(c) {
    const s = st(c.status), tA = T.db.tarefas.filter((t) => t.cliente === c.id && !t.feita).length, nI = T.db.itens.filter((i) => i.cliente === c.id).length;
    return `<article class="cartao cli" data-cli="${c.id}" draggable="true" style="--c:${s.cor}">
      <header class="cartao-topo">${T.avatarCli(c)}<div class="cli-nome"><div class="cartao-titulo">${esc(c.nome || 'Sem nome')}</div>${c.empresa ? `<small class="suave">${esc(c.empresa)}</small>` : ''}</div><span class="pilula st" style="--c:${s.cor}">${s.nome}</span></header>
      <div class="cartao-tags">${c.rascunho ? '<span class="tag rasc" title="Tem alterações não salvas. Abra para salvar ou descartar.">rascunho</span>' : ''}${tA ? `<span class="tag">${tA} tarefa${tA > 1 ? 's' : ''}</span>` : ''}${nI ? `<span class="tag">${nI} ite${nI > 1 ? 'ns' : 'm'}</span>` : ''}${c.tags.slice(0, 3).map((x) => `<span class="tag">#${esc(x)}</span>`).join('')}</div>
      ${T.cliLinks(c).length ? `<div class="cli-barra">${botoes(c)}</div>` : ''}</article>`;
  }

  T.paginas.clientes = () => {
    const v = $('#vista'), L0 = C(), q = T.norm(busca);
    const L = L0.filter((c) => (!filtro || c.status === filtro) && (!q || T.norm([c.nome, c.empresa, c.email, c.insta, c.notas, c.tags.join(' ')].join(' ')).includes(q)))
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    const conta = (id) => L0.filter((c) => c.status === id).length;
    v.innerHTML = `<div class="pagina-cab"><div><h1>Clientes ${T.botaoTutorial('clientes')}</h1><p>Contato, status, Trello e pasta de cada cliente, com as tarefas e os itens dele juntos.</p></div>
        <button class="btn" id="cliNovo">${Icones.svg('mais', 15)} Novo cliente</button></div>
      <div class="chips-tipo" id="cliF"><button class="chip ${!filtro ? 'on' : ''}" data-f="">Todos <b>${L0.length}</b></button>${T.STATUS_CLI.map((s) => `<button class="chip ${filtro === s.id ? 'on' : ''}" data-f="${s.id}" style="--c:${s.cor}">${s.nome} <b>${conta(s.id)}</b></button>`).join('')}</div>
      <div class="filtros vidro-cartao"><label class="campo-busca">${Icones.svg('busca', 15)}<input id="cliQ" type="text" placeholder="Buscar cliente…" value="${esc(busca)}"></label>
        <div class="seg" id="cliV"><button data-v="cartoes" class="${modo === 'cartoes' ? 'on' : ''}">${Icones.svg('grade', 14)} Cartões</button><button data-v="funil" class="${modo === 'funil' ? 'on' : ''}">${Icones.svg('quadro', 14)} Funil</button></div>${T.dica('Funil: uma coluna por status. Arraste o cliente de uma coluna para outra.')}</div>
      <div id="cliRes">${!L0.length ? `<div class="vazio">${Icones.svg('pessoas', 34)}<h3>Nenhum cliente ainda</h3><p>Guarde contato, status, link do Trello e a pasta de cada cliente, e junte as tarefas e os itens dele.</p><button class="btn" data-novo="1">${Icones.svg('mais', 15)} Cadastrar o primeiro</button></div>`
        : modo === 'funil' ? `<div class="quadro">${T.STATUS_CLI.map((s) => { const cs = L.filter((c) => c.status === s.id); return `<div class="coluna vidro-cartao" data-col="${s.id}"><h3 style="--c:${s.cor}">${s.nome} <span class="conta">${cs.length}</span></h3><div class="coluna-cartoes">${cs.map(cartaoHTML).join('')}</div></div>`; }).join('')}</div>`
          : L.length ? `<div class="grade-cartoes">${L.map(cartaoHTML).join('')}</div>` : T.vazio('busca', 'Ninguém encontrado')}</div>`;
    $('#cliF').onclick = (e) => { const x = e.target.closest('[data-f]'); if (!x) return; filtro = x.dataset.f; T.som('clique'); T.render(); };
    $('#cliQ').oninput = (e) => { busca = e.target.value; const p = e.target.selectionStart; T.render(); const i = $('#cliQ'); i.focus(); i.setSelectionRange(p, p); };
    $('#cliV').onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b) return; modo = b.dataset.v; T.som('clique'); T.render(); };
    $('#cliNovo').onclick = () => T.novoCliente();
    v.onclick = (e) => {
      if (e.target.closest('[data-novo]')) return T.novoCliente();
      const pa = e.target.closest('[data-pasta]'); if (pa) { e.stopPropagation(); return T.abrirPastaCliente(T.cliente(pa.dataset.pasta)); }
      if (e.target.closest('a')) return;
      const c = e.target.closest('[data-cli]'); if (c) T.abrirCliente(c.dataset.cli);
    };
    v.oncontextmenu = (e) => { const c = e.target.closest('[data-cli]'); if (c) menuCliente(e, T.cliente(c.dataset.cli)); };
    let arrasto = null;
    v.ondragstart = (e) => { const c = e.target.closest('[data-cli]'); if (c) { arrasto = c.dataset.cli; e.dataTransfer.setData('text/x-backpack', arrasto); } };
    v.ondragover = (e) => { const col = e.target.closest('.coluna'); if (col && arrasto) { e.preventDefault(); $$('.coluna.sobre').forEach((x) => x.classList.remove('sobre')); col.classList.add('sobre'); } };
    v.ondrop = (e) => {
      const col = e.target.closest('.coluna'); if (!col || !arrasto) return; e.preventDefault();
      const c = T.cliente(arrasto); arrasto = null;
      if (c && c.status !== col.dataset.col) { c.status = col.dataset.col; c.atualizadoEm = T.agora(); T.salvar(); T.som('soltar'); T.toast(`${c.nome}: ${st(c.status).nome}`); }
      T.render();
    };
    v.ondragend = () => { arrasto = null; };
  };

  T.novoCliente = (o) => {
    const t = T.agora();
    const c = { id: T.uid(), nome: '', empresa: '', status: 'ativo', email: '', whats: '', insta: '', site: '', trello: '', pasta: '', notas: '', tags: [], rascunho: '', criadoEm: t, atualizadoEm: t, _novo: true, ...o };
    C().push(c);
    novoAberto = c.id;
    T.abrirCliente(c.id);
  };

  function menuCliente(e, c) {
    if (!c) return;
    T.menu(e, [
      { icone: 'abrir', t: 'Abrir', fn: () => T.abrirCliente(c.id) },
      ...T.cliLinks(c).map(([ic, n, u]) => ({ icone: ic, t: `Abrir ${n}`, fn: () => (u === '#pasta' ? T.abrirPastaCliente(c) : window.open(u, '_blank', 'noopener')) })),
      { icone: 'enviar', t: 'Enviar para o Trello', fn: () => enviarTrello(c) },
      '-', { sub: 'Mudar status' }, ...T.STATUS_CLI.filter((s) => s.id !== c.status).map((s) => ({ icone: 'ponto', t: s.nome, fn: () => { c.status = s.id; c.atualizadoEm = T.agora(); T.salvar(); T.render(); } })),
      '-', { icone: 'lixeira', t: 'Mandar para a lixeira', perigo: true, fn: () => T.paraLixeira('cliente', c) },
    ]);
  }
  async function enviarTrello(c) {
    try { const r = await T.api('/api/int/trello/enviar', { method: 'POST', body: JSON.stringify({ cliente: c.id }) }); T.som('feito'); T.toast('Cliente enviado para o Trello'); if (r.url) window.open(r.url, '_blank', 'noopener'); } catch (e) { T.toast(e.message, null, 'erro'); }
  }

  // ---------- ficha ----------
  T.abrirCliente = (id) => {
    const c = T.cliente(id); if (!c) return;
    T.cliAberto = c.id;
    T.som('abrir');
    let base = T.rasc.abrir(c);
    const toca = () => { if (novoAberto !== c.id) T.rasc.tocar(c, base); c.atualizadoEm = T.agora(); delete c._novo; T.salvar(); T.rodapePinta(m, c, novoAberto === c.id); };
    const m = T.modal('<div></div>', {
      classe: 'item cliente',
      aoFechar: () => {
        T.cliAberto = null;
        const eraNovo = novoAberto === c.id; novoAberto = null;
        if (!c.nome.trim() && (c._novo || eraNovo)) T.db.clientes = C().filter((x) => x !== c);
        else if (eraNovo && C().includes(c)) { T.ganhar('cliente'); T.toast('Cliente salvo'); }
        if (!eraNovo && C().includes(c) && T.rasc.guardar(c)) T.toast('Alterações guardadas como rascunho. Abra a ficha de novo para salvar ou descartar.');
        delete c._novo; T.salvar(); T.render();
      },
    });
    const campo = (k, rot, ph, tipo) => `<label class="campo">${rot}<input type="${tipo || 'text'}" data-k="${k}" value="${esc(c[k])}" placeholder="${ph}"></label>`;
    function desenhar() {
      const s = st(c.status);
      const ts = T.db.tarefas.filter((t) => t.cliente === c.id).sort((a, b) => a.feita - b.feita || (a.data || '9').localeCompare(b.data || '9'));
      const its = T.db.itens.filter((i) => i.cliente === c.id).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
      const soltos = T.db.itens.filter((i) => !i.cliente && !i.modelo);
      m.style.setProperty('--c', s.cor);
      m.innerHTML = `<div class="modal-cab">${T.avatarCli(c)}<h2 id="cTit">${esc(c.nome || 'Novo cliente')}</h2>
          <button class="btn-icone" id="cDel" title="Mandar para a lixeira">${Icones.svg('lixeira', 18)}</button><button class="btn-icone" data-fechar title="Fechar (Esc)">${Icones.svg('x', 18)}</button></div>
        <div class="modal-corpo">
          <div class="linha com-mic"><input class="titulo-in" id="cNome" type="text" placeholder="Nome do cliente" value="${esc(c.nome)}" maxlength="200"></div>
          <div class="seg" id="cSt">${T.STATUS_CLI.map((x) => `<button data-s="${x.id}" class="${x.id === c.status ? 'on' : ''}" style="--c:${x.cor}">${x.nome}</button>`).join('')}</div>
          ${T.cliLinks(c).length ? `<div class="cli-barra grande">${botoes(c)}</div>` : ''}
          <div class="grade2">${campo('empresa', 'Empresa / marca', 'Ex: Padaria do João')}${campo('whats', 'WhatsApp', '(81) 99999-9999', 'tel')}
            ${campo('email', 'E-mail', 'nome@email.com', 'email')}${campo('insta', 'Instagram', '@perfil')}
            ${campo('site', 'Site', 'site.com.br')}${campo('trello', 'Quadro do Trello', 'Cole o link do quadro')}</div>
          <label class="campo">Pasta do cliente ${T.dica('Caminho da pasta no Mac (ex.: ~/Clientes/João) ou link do Google Drive. O botão Pasta abre direto.')}<input type="text" data-k="pasta" value="${esc(c.pasta)}" placeholder="~/Clientes/Nome ou link do Drive"></label>
          <label class="campo">Etiquetas<input type="text" id="cTags" value="${esc(c.tags.join(', '))}" placeholder="social media, mensal…"></label>
          <label class="campo">Anotações<div class="caixa-copia"><textarea data-k="notas" id="cNotas" rows="4" placeholder="Briefing, combinados, valores, preferências…">${esc(c.notas)}</textarea>${T.micBtn ? T.micBtn('cNotas') : ''}</div></label>
          <div class="campo"><span>${Icones.svg('tarefas', 14)} Tarefas do cliente</span>
            <div id="cTarefas">${ts.map(T.tarefaHTML).join('') || '<small class="suave">Nenhuma tarefa ainda.</small>'}</div>
            <div class="linha com-mic"><input type="text" id="cTk" placeholder="Nova tarefa… (ex.: Postar carrossel amanhã)">${T.micBtn ? T.micBtn('cTk') : ''}<button class="btn" id="cTkOk">${Icones.svg('mais', 14)} Adicionar</button></div></div>
          <div class="campo"><span>${Icones.svg('biblioteca', 14)} Itens do cliente ${T.dica('Briefings, roteiros, prompts, arquivos e links deste cliente. Crie aqui ou ligue um item que já existe.')}</span>
            ${its.map((it) => `<div class="linha-mini" data-it="${it.id}"><i class="ico-tipo" style="--c:${T.tipo(it.tipo).cor}">${Icones.svg(it.tipo, 14)}</i><b>${esc(it.titulo || 'Sem título')}</b><button class="btn-x" data-solta="${it.id}" title="Desligar do cliente">${Icones.svg('x', 13)}</button></div>`).join('') || '<small class="suave">Nenhum item ligado.</small>'}
            <div class="linha"><button class="btn sec pequeno" id="cItNovo">${Icones.svg('mais', 13)} Novo item</button>${T.modelos().length ? `<button class="btn sec pequeno" id="cItMod">${Icones.svg('duplicar', 13)} Usar modelo</button>` : ''}
              ${soltos.length ? `<select id="cItLiga"><option value="">Ligar item que já existe…</option>${soltos.slice(0, 300).map((i) => `<option value="${i.id}">${esc(i.titulo || 'Sem título')}</option>`).join('')}</select>` : ''}</div></div>
          ${T.finDoCliente ? T.finDoCliente(c) : ''}
          <div class="linha"><button class="btn sec pequeno" id="cTrello">${Icones.svg('enviar', 13)} Enviar para o Trello</button>${T.dica('Cria um cartão com contatos, anotações e tarefas abertas na lista conectada em Configurações → Integrações.')}</div>
        </div>${T.rodapeSalvar(novoAberto === c.id)}`;
      ligar();
      T.rodapePinta(m, c, novoAberto === c.id);
    }
    function ligar() {
      $('#svOk', m).onclick = () => {
        if (!c.nome.trim()) return T.falta($('#cNome', m), 'Dê um nome ao cliente primeiro.');
        const novo = novoAberto === c.id;
        if (novo) { novoAberto = null; T.ganhar('cliente'); }
        delete c._novo; T.rasc.salvar(c); T.salvar(); T.fecharModal(); T.toast(novo ? 'Cliente cadastrado' : 'Cliente salvo');
      };
      if ($('#svRev', m)) $('#svRev', m).onclick = () => { T.rasc.reverter(c); base = T.rasc.foto(c); T.salvar(); T.som('desfazer'); desenhar(); T.toast('Alterações descartadas: voltou a versão salva'); };
      if ($('#svNo', m)) $('#svNo', m).onclick = () => { T.db.clientes = C().filter((x) => x !== c); novoAberto = null; T.salvar(); T.fecharModal(); T.toast('Cadastro descartado'); };
      $('#cDel', m).onclick = () => { T.fecharModal(); if (C().includes(c) && c.nome.trim()) T.paraLixeira('cliente', c); };
      $('#cNome', m).oninput = (e) => { c.nome = e.target.value; toca(); $('#cTit', m).textContent = c.nome || 'Novo cliente'; };
      // ao sair de um campo de contato, só a barra de atalhos é refeita (redesenhar tudo apagaria o que está sendo digitado)
      const barra = () => {
        let bar = $('.cli-barra.grande', m);
        const html = botoes(c);
        if (!html) { if (bar) bar.remove(); return; }
        if (!bar) { $('#cSt', m).insertAdjacentHTML('afterend', '<div class="cli-barra grande"></div>'); bar = $('.cli-barra.grande', m); }
        bar.innerHTML = html;
        $$('[data-pasta]', bar).forEach((b) => { b.onclick = () => T.abrirPastaCliente(c); });
      };
      $$('[data-k]', m).forEach((el) => { el.oninput = () => { c[el.dataset.k] = el.value; toca(); }; if (el.tagName === 'INPUT') el.onchange = barra; });
      $('#cTags', m).oninput = (e) => { c.tags = [...new Set(e.target.value.split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean))]; toca(); };
      $('#cSt', m).onclick = (e) => { const x = e.target.closest('[data-s]'); if (!x) return; c.status = x.dataset.s; toca(); T.som('clique'); desenhar(); };
      $$('.cli-barra [data-pasta]', m).forEach((b) => { b.onclick = () => T.abrirPastaCliente(c); });
      const addT = () => {
        const i = $('#cTk', m);
        if (!i.value.trim()) return T.falta(i, 'Escreva a tarefa primeiro.');
        if (T.adicionarTarefa(i.value, '', 'media', { cliente: c.id })) { desenhar(); $('#cTk', m).focus(); }
      };
      $('#cTkOk', m).onclick = addT; $('#cTk', m).onkeydown = (e) => { if (e.key === 'Enter') addT(); };
      $('#cTarefas', m).onclick = (e) => {
        const row = e.target.closest('.tarefa'); if (!row) return;
        const t = T.db.tarefas.find((x) => x.id === row.dataset.id); if (!t) return;
        const a = (e.target.closest('[data-a]') || {}).dataset || {};
        if (e.target.type === 'checkbox') { T.alternarTarefa(t, e); desenhar(); }
        else if (a.a === 'rm') { T.paraLixeira('tarefa', t, true); desenhar(); }
        else if (a.a === 'prio') { t.prio = T.PRIOS[(T.PRIOS.indexOf(t.prio) + 1) % 3]; T.salvar(); desenhar(); }
        else if (a.a === 'editar') T.editarTarefa(t);
      };
      $$('[data-it]', m).forEach((r) => { r.onclick = (e) => { if (e.target.closest('[data-solta]')) return; T.abrirItem(r.dataset.it); }; });
      $$('[data-solta]', m).forEach((b) => { b.onclick = () => { const it = T.db.itens.find((i) => i.id === b.dataset.solta); if (it) { it.cliente = ''; T.mexeu(it); desenhar(); } }; });
      $('#cItNovo', m).onclick = () => { T.novoItemDialogo({ cliente: c.id }); };
      if ($('#cItMod', m)) $('#cItMod', m).onclick = () => { T.escolherModelo({ cliente: c.id }); };
      if ($('#cItLiga', m)) $('#cItLiga', m).onchange = (e) => { const it = T.db.itens.find((i) => i.id === e.target.value); if (it) { it.cliente = c.id; T.mexeu(it); T.som('soltar'); desenhar(); } };
      $('#cTrello', m).onclick = () => enviarTrello(c);
      if ($('#cFin', m)) $('#cFin', m).onclick = () => { T.finEditar({ tipo: 'entrada', cliente: c.id, desc: `Pagamento ${c.nome || ''}`.trim(), cat: 'Serviço / cliente' }); };
    }
    desenhar();
    if (!c.nome) $('#cNome', m).focus();
  };
})();
