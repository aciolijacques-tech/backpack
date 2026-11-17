// Backpack — Biblioteca: filtros e as 4 formas de ver (grade, lista, tabela e quadro com arrastar).
(function () {
  const { esc, $, $$ } = T;
  const progresso = (it) => (it.checklist.length ? Math.round((it.checklist.filter((c) => c.feito).length / it.checklist.length) * 100) : -1);

  T.filtrados = () => {
    const u = T.ui, q = T.norm(u.q);
    const L = T.db.itens.filter((it) => {
      if (u.tipo && it.tipo !== u.tipo) return false;
      if (u.categoria && it.categoria !== u.categoria) return false;
      if (u.status && it.status !== u.status) return false;
      if (u.tag && !it.tags.includes(u.tag)) return false;
      if (u.fav && !it.fav) return false;
      if (u.recebidos && !(it.origem && it.origem.app)) return false;
      if (u.modelos && !it.modelo) return false;
      if (q && !T.norm(`${it.titulo} ${it.descricao} ${it.texto} ${it.tags.join(' ')} ${it.anexos.map((a) => a.nome).join(' ')}`).includes(q)) return false;
      return true;
    });
    const { k, d } = u.ordem;
    const val = (it) => (k === 'categoria' ? ((T.cat(it.categoria) || {}).nome || '') : k === 'tipo' ? T.tipo(it.tipo).nome : k === 'tags' ? it.tags.join(',') : it[k] || '');
    L.sort((a, b) => String(val(a)).localeCompare(String(val(b)), 'pt') * d);
    return L;
  };

  // cartão (grade, quadro e Início)
  T.cartaoHTML = (it, modo) => {
    const t = T.tipo(it.tipo), cat = T.cat(it.categoria), p = progresso(it), hoje = T.hoje();
    const st = T.STATUS.find((s) => s.id === it.status);
    const destaque = it.data === hoje;
    const previa = it.descricao || it.texto;
    const anexo = it.anexos[0];
    const marcas = `${it.rascunho ? '<span class="tag rasc" title="Tem alterações não salvas. Abra para salvar ou descartar.">rascunho</span>' : ''}${it.modelo ? '<span class="tag" style="--c:#a46bff">modelo</span>' : ''}${it.cliente && T.cliente(it.cliente) ? `<span class="tag" style="--c:#2fbf8f">${esc(T.cliente(it.cliente).nome)}</span>` : ''}`;
    const meta = `${marcas}${cat ? `<span class="tag" style="--c:${cat.cor}">${esc(cat.icone)} ${esc(cat.nome)}</span>` : ''}${it.tags.slice(0, 3).map((x) => `<span class="tag">#${esc(x)}</span>`).join('')}`;
    const acoes = `${it.data ? `<span class="pilula data ${destaque ? 'hoje' : ''}">${Icones.svg('calendario', 12)} ${destaque ? 'Hoje' : T.fmtData(it.data)}</span>` : ''}
      ${it.anexos.length ? `<a class="pilula baixar" href="${T.urlAnexo(anexo, true)}" download="${esc(anexo.nome)}" title="Baixar ${esc(anexo.nome)}" data-baixar>${Icones.svg('baixar', 12)} ${it.anexos.length > 1 ? `${it.anexos.length} anexos` : 'Baixar'}</a>` : ''}`;
    const fav = `<button class="btn-fav ${it.fav ? 'on' : ''}" data-fav="${it.id}" title="Favorito">${Icones.svg('estrela', 15)}</button>`;
    if (modo === 'lista') {
      return `<div class="linha-item vidro-cartao" draggable="true" data-id="${it.id}"><i class="ico-tipo" style="--c:${t.cor}">${Icones.svg(it.tipo, 15)}</i>
        <b>${esc(it.titulo || 'Sem título')}</b><span class="st ${it.status}">${st.nome}</span><span class="meta">${meta}</span><span class="acoes">${acoes}</span>${fav}</div>`;
    }
    return `<article class="cartao ${destaque ? 'cartao--destaque' : ''}" draggable="true" data-id="${it.id}" style="--c:${t.cor}">
      <header class="cartao-topo"><span class="cartao-tipo">${t.nome}</span><span class="cartao-cantos">${fav}<i class="ico-tipo" style="--c:${t.cor}">${Icones.svg(it.tipo, 15)}</i></span></header>
      <div class="cartao-titulo">${esc(it.titulo || 'Sem título')}</div>
      ${previa ? `<div class="cartao-texto ${it.tipo === 'comando' && !it.descricao ? 'mono' : ''}">${esc(previa)}</div>` : ''}
      ${p >= 0 ? `<div class="progresso" title="${p}% do checklist"><i style="width:${p}%"></i></div>` : ''}
      <footer class="cartao-rodape"><div class="cartao-tags"><span class="st ${it.status}">${st.nome}</span>${meta}</div><div class="cartao-acoes">${acoes}</div></footer></article>`;
  };

  function tabelaHTML(L) {
    const cols = [['titulo', 'Título'], ['tipo', 'Tipo'], ['categoria', 'Categoria'], ['status', 'Status'], ['tags', 'Etiquetas'], ['data', 'Data'], ['atualizadoEm', 'Alterado']];
    const s = T.ui.ordem;
    return `<div class="tabela-caixa vidro-cartao"><table class="tabela"><thead><tr>${cols.map(([k, n]) => `<th data-ordem="${k}" class="${s.k === k ? 'on' : ''}">${n} ${s.k === k ? (s.d > 0 ? '▲' : '▼') : ''}</th>`).join('')}</tr></thead><tbody>${L.map((it) => {
      const t = T.tipo(it.tipo), c = T.cat(it.categoria), st = T.STATUS.find((x) => x.id === it.status);
      return `<tr data-id="${it.id}"><td>${it.fav ? `<span class="estrela-on">${Icones.svg('estrela', 13)}</span> ` : ''}<b>${esc(it.titulo || 'Sem título')}</b>${it.anexos.length ? ` <span class="suave">${Icones.svg('clipe', 12)}${it.anexos.length}</span>` : ''}</td>
        <td><span class="tag" style="--c:${t.cor}">${t.nome}</span></td><td>${c ? esc(`${c.icone} ${c.nome}`) : '<span class="suave">—</span>'}</td>
        <td><span class="st ${it.status}">${st.nome}</span></td><td>${it.tags.map((x) => `<span class="tag">#${esc(x)}</span>`).join(' ')}</td>
        <td class="suave">${T.fmtData(it.data)}</td><td class="suave">${new Date(it.atualizadoEm).toLocaleDateString('pt-BR')}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function quadroHTML(L) {
    const por = T.db.config.quadroPor;
    let cols;
    if (por === 'status') cols = T.STATUS.map((s) => ({ id: s.id, nome: s.nome }));
    else if (por === 'tipo') cols = T.TIPOS.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor }));
    else cols = [{ id: '', nome: 'Sem categoria' }].concat(T.db.categorias.map((c) => ({ id: c.id, nome: `${c.icone} ${c.nome}`, cor: c.cor })));
    const chave = por === 'status' ? 'status' : por === 'tipo' ? 'tipo' : 'categoria';
    return `<div class="quadro">${cols.map((c) => {
      const its = L.filter((it) => (it[chave] || '') === c.id);
      return `<div class="coluna vidro-escuro" data-col="${esc(c.id)}"><h4>${c.cor ? `<i class="bolinha" style="background:${c.cor}"></i>` : ''}${esc(c.nome)}<span class="conta">${its.length}</span></h4><div class="coluna-cartoes">${its.map((it) => T.cartaoHTML(it)).join('')}</div></div>`;
    }).join('')}</div>`;
  }

  T.desenharResultados = () => {
    const box = $('#resultados'); if (!box) return;
    const L = T.filtrados(), visao = T.db.config.visao;
    $('#contaBib').textContent = `${L.length} de ${T.db.itens.length}`;
    if (!L.length && visao !== 'quadro') { box.innerHTML = T.vazio('biblioteca', 'Nada por aqui', 'Crie um item novo ou arraste um arquivo para a janela.'); return; }
    box.innerHTML = visao === 'tabela' ? tabelaHTML(L) : visao === 'quadro' ? quadroHTML(L)
      : visao === 'lista' ? `<div class="lista-itens">${L.map((it) => T.cartaoHTML(it, 'lista')).join('')}</div>`
        : `<div class="grade-cartoes">${L.map((it) => T.cartaoHTML(it)).join('')}</div>`;
  };

  // cliques comuns em cartões (Biblioteca e Início)
  T.cliqueCartao = (e) => {
    if (e.target.closest('[data-baixar]')) return true;
    const fav = e.target.closest('[data-fav]');
    if (fav) { e.stopPropagation(); T.alternarFav(fav.dataset.fav); return true; }
    const c = e.target.closest('[data-id]');
    if (c && !c.classList.contains('tarefa')) { T.abrirItem(c.dataset.id); return true; }
    return false;
  };

  T.paginas.biblioteca = () => {
    const u = T.ui, c = T.db.config, v = $('#vista');
    const conta = (id) => T.db.itens.filter((i) => i.tipo === id).length;
    v.innerHTML = `<div class="pagina-cab"><div><h1>Biblioteca ${T.botaoTutorial('biblioteca')}</h1><p><span id="contaBib"></span> itens</p></div>
        <div class="seg" id="visoes">${[['grade', 'Grade'], ['lista', 'Lista'], ['tabela', 'Tabela'], ['quadro', 'Quadro']].map(([k, n]) => `<button data-v="${k}" class="${c.visao === k ? 'on' : ''}" title="${n}">${Icones.svg(k, 15)}<span>${n}</span></button>`).join('')}</div></div>
      <div class="chips-tipo" id="chipsTipo">
        <button class="chip ${!u.tipo ? 'on' : ''}" data-tipo="">${Icones.svg('tudo', 14)} Tudo <b>${T.db.itens.length}</b></button>
        ${T.TIPOS.map((t) => `<button class="chip ${u.tipo === t.id ? 'on' : ''}" data-tipo="${t.id}" style="--c:${t.cor}">${Icones.svg(t.id, 14)} ${t.nome} <b>${conta(t.id)}</b></button>`).join('')}
      </div>
      <div class="filtros vidro-cartao">
        <label class="campo-busca">${Icones.svg('busca', 15)}<input id="fq" type="text" placeholder="Filtrar esta lista…" value="${esc(u.q)}"></label>
        <select id="fCat"><option value="">Todas as categorias</option>${T.db.categorias.map((x) => `<option value="${x.id}" ${u.categoria === x.id ? 'selected' : ''}>${esc(x.icone)} ${esc(x.nome)}</option>`).join('')}</select>
        <select id="fSt"><option value="">Qualquer status</option>${T.STATUS.map((x) => `<option value="${x.id}" ${u.status === x.id ? 'selected' : ''}>${x.nome}</option>`).join('')}</select>
        <select id="fTag"><option value="">Todas as etiquetas</option>${T.todasTags().map((x) => `<option ${u.tag === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        ${T.chave('fFav', u.fav, 'Favoritos')}
        ${T.db.itens.some((i) => i.modelo) ? T.chave('fMod', u.modelos, 'Modelos') : ''}
        ${T.db.itens.some((i) => i.origem && i.origem.app) ? T.chave('fRec', u.recebidos, 'Recebidos') : ''}
        ${c.visao === 'quadro' ? `<select id="fPor" title="Colunas do quadro"><option value="status" ${c.quadroPor === 'status' ? 'selected' : ''}>Colunas: status</option><option value="categoria" ${c.quadroPor === 'categoria' ? 'selected' : ''}>Colunas: categoria</option><option value="tipo" ${c.quadroPor === 'tipo' ? 'selected' : ''}>Colunas: tipo</option></select>` : ''}
      </div>
      <div id="resultados"></div>`;
    T.desenharResultados();

    $('#chipsTipo').onclick = (e) => { const x = e.target.closest('[data-tipo]'); if (!x) return; u.tipo = x.dataset.tipo; T.som('clique'); T.render(); };
    const rr = () => T.desenharResultados();
    $('#fq').oninput = (e) => { u.q = e.target.value; rr(); };
    $('#fCat').onchange = (e) => { u.categoria = e.target.value; rr(); };
    $('#fSt').onchange = (e) => { u.status = e.target.value; rr(); };
    $('#fTag').onchange = (e) => { u.tag = e.target.value; rr(); };
    $('#fFav').onchange = (e) => { u.fav = e.target.checked; rr(); };
    if ($('#fMod')) $('#fMod').onchange = (e) => { u.modelos = e.target.checked; rr(); };
    if ($('#fRec')) $('#fRec').onchange = (e) => { u.recebidos = e.target.checked; rr(); };
    if ($('#fPor')) $('#fPor').onchange = (e) => { c.quadroPor = e.target.value; T.salvar(); rr(); };
    $('#visoes').onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b) return; c.visao = b.dataset.v; T.salvar(); T.som('clique'); T.render(); };

    const res = $('#resultados');
    res.onclick = (e) => {
      const th = e.target.closest('th[data-ordem]');
      if (th) { const k = th.dataset.ordem; u.ordem = { k, d: u.ordem.k === k ? -u.ordem.d : 1 }; rr(); return; }
      T.cliqueCartao(e);
    };
    res.oncontextmenu = (e) => { const x = e.target.closest('[data-id]'); if (x) T.menuItem(e, T.db.itens.find((i) => i.id === x.dataset.id)); };

    // arrastar cartões entre colunas do quadro
    let arrasto = null;
    res.ondragstart = (e) => { const x = e.target.closest('[data-id]'); if (!x || e.target.closest('[data-baixar]')) return; arrasto = x.dataset.id; x.classList.add('arrastando'); e.dataTransfer.setData('text/x-backpack', arrasto); e.dataTransfer.effectAllowed = 'move'; };
    res.ondragend = () => { arrasto = null; $$('.arrastando').forEach((x) => x.classList.remove('arrastando')); $$('.coluna.sobre').forEach((x) => x.classList.remove('sobre')); };
    res.ondragover = (e) => { const col = e.target.closest('.coluna'); if (col && arrasto) { e.preventDefault(); $$('.coluna.sobre').forEach((x) => { if (x !== col) x.classList.remove('sobre'); }); col.classList.add('sobre'); } };
    res.ondrop = (e) => {
      const col = e.target.closest('.coluna'); if (!col || !arrasto) return;
      e.preventDefault(); e.stopPropagation();
      const it = T.db.itens.find((i) => i.id === arrasto); if (!it) return;
      const chave = c.quadroPor === 'status' ? 'status' : c.quadroPor === 'tipo' ? 'tipo' : 'categoria';
      if (it[chave] !== col.dataset.col) { it[chave] = col.dataset.col; T.mexeu(it); T.som('soltar'); }
      T.render();
    };
  };
})();
