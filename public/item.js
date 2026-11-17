// Backpack — cartão do item: edição com salvamento automático, checklist, links, anexos e IA.
(function () {
  const { esc, $, $$ } = T;
  T.atual = null; // item aberto

  T.anexarArquivos = async (it, arquivos, depois) => {
    let n = 0;
    for (const f of arquivos) {
      try { it.anexos.push(await T.enviarArquivo(f)); n++; T.ganhar('anexo'); } catch (e) { T.toast(`${f.name}: ${e.message}`, null, 'erro'); }
    }
    if (n) { T.mexeu(it); T.som('soltar'); T.toast(n > 1 ? `${n} arquivos anexados` : 'Arquivo anexado'); }
    if (depois) depois();
  };

  // arrastar arquivos para a janela: cada arquivo vira um item
  T.itensDeArquivos = async (arquivos) => {
    let ultimo = null;
    for (const f of arquivos) {
      const doc = /\.(pdf|docx?|pptx?|epub|txt|md)$/i.test(f.name);
      const it = T.criarItem({ tipo: doc ? 'pdf' : 'nota', titulo: f.name.replace(/\.[^.]+$/, '') });
      await T.anexarArquivos(it, [f]);
      ultimo = it;
    }
    T.render();
    if (ultimo && arquivos.length === 1) T.abrirItem(ultimo.id);
    else T.toast(`${arquivos.length} itens criados`);
  };

  T.novoItemDireto = (o) => { const it = T.criarItem({ titulo: '', ...o }, true); it._novo = true; T.abrirItem(it.id); return it; };

  // ---------- modelos: item marcado como modelo aparece em "Novo item" ----------
  T.modelos = () => T.db.itens.filter((i) => i.modelo).sort((a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'pt'));
  T.usarModelo = (mod, o = {}) => {
    const c = JSON.parse(JSON.stringify(mod));
    ['id', 'criadoEm', 'atualizadoEm', '_salvo'].forEach((k) => delete c[k]);
    c.anexos = c.anexos.map((a) => ({ ...a, id: T.uid() })); // o arquivo é o mesmo (o Backpack nunca apaga anexos)
    c.titulo = String(c.titulo || '').replace(/^Modelo:\s*/i, '').replace(/^./, (x) => x.toUpperCase());
    const it = T.novoItemDireto({ ...c, modelo: false, fav: false, rascunho: '', origem: null, enviado: {}, titulo: c.titulo, checklist: c.checklist.map((x) => ({ ...x, id: T.uid(), feito: false })), ...o });
    T.toast(`Criado a partir do modelo “${mod.titulo || 'Sem título'}”`);
    return it;
  };
  T.escolherModelo = (o) => T.novoItemDialogo(o, true);

  // Novo item: em branco (por tipo), a partir de um modelo ou por voz — tudo numa tela só
  T.novoItemDialogo = (o = {}, soModelos) => {
    const L = T.modelos();
    const m = T.modal(`${T.cabecalho(`${Icones.svg('mais', 18)} ${soModelos ? 'Usar modelo' : 'Novo item'}`)}<div class="modal-corpo">
      ${soModelos ? '' : `<div class="secao-mini">Em branco</div><div class="mod-grade">${T.TIPOS.map((t) => `<button class="mod" data-tipo="${t.id}" style="--c:${t.cor}"><i class="ico-tipo" style="--c:${t.cor}">${Icones.svg(t.id, 16)}</i><b>${t.nome}</b></button>`).join('')}
        ${T.vozDisponivel && T.vozDisponivel() ? `<button class="mod voz" data-voz="1"><i class="ico-tipo" style="--c:#ff5a7a">${Icones.svg('mic', 16)}</i><b>Por voz</b><small>Fale e vire item ou tarefa</small></button>` : ''}</div>`}
      <div class="secao-mini">Modelos ${T.dica('Qualquer item pode virar modelo: abra o item e ligue “Usar como modelo”. Os modelos aparecem aqui.')}</div>
      ${L.length ? `<div class="mod-grade">${L.map((x) => `<button class="mod" data-mod="${x.id}" title="${esc(x.descricao)}" style="--c:${T.tipo(x.tipo).cor}"><i class="ico-tipo" style="--c:${T.tipo(x.tipo).cor}">${Icones.svg(x.tipo, 16)}</i><b>${esc(x.titulo || 'Sem título')}</b>${x.descricao ? `<small>${esc(x.descricao)}</small>` : ''}</button>`).join('')}</div>` : '<p class="suave">Nenhum modelo ainda. Abra um item e ligue “Usar como modelo”.</p>'}
    </div>`, { classe: 'medio' });
    m.onclick = (e) => {
      const t = e.target.closest('[data-tipo]'); if (t) { T.fecharModal(); return T.novoItemDireto({ tipo: t.dataset.tipo, ...o }); }
      const md = e.target.closest('[data-mod]'); if (md) { T.fecharModal(); return T.usarModelo(T.db.itens.find((i) => i.id === md.dataset.mod), o); }
      if (e.target.closest('[data-voz]')) { T.fecharModal(); T.vozCriar(o); }
    };
    const b = T.$('[data-tipo]', m); if (b) b.focus();
  };

  T.menuItem = (e, it) => {
    if (!it) return;
    const cats = T.db.categorias.filter((c) => c.id !== it.categoria).map((c) => ({ emoji: c.icone, t: c.nome, fn: () => { it.categoria = c.id; T.mexeu(it); T.som('soltar'); T.render(); } }));
    if (it.categoria) cats.unshift({ icone: 'tudo', t: 'Sem categoria', fn: () => { it.categoria = ''; T.mexeu(it); T.render(); } });
    T.menu(e, [
      { icone: 'abrir', t: 'Abrir', fn: () => T.abrirItem(it.id) },
      { icone: 'copiar', t: 'Copiar conteúdo', fn: () => T.copiarItem(it) },
      { icone: 'estrela', t: it.fav ? 'Tirar dos favoritos' : 'Favoritar', fn: () => T.alternarFav(it.id) },
      { icone: 'enviar', t: 'Enviar para o Notion', fn: () => T.enviarItem(it, 'notion') },
      { icone: 'enviar', t: 'Enviar para o Trello', fn: () => T.enviarItem(it, 'trello') },
      { icone: 'duplicar', t: 'Duplicar', fn: () => T.duplicar(it) },
      ...(cats.length ? ['-', { sub: 'Mover para categoria' }, ...cats] : []),
      '-',
      { icone: 'lixeira', t: 'Mandar para a lixeira', perigo: true, fn: () => T.paraLixeira('item', it) },
    ]);
  };

  T.abrirItem = (id) => {
    const it = T.db.itens.find((i) => i.id === id);
    if (!it) return;
    T.atual = it;
    T.som('abrir');
    const novo = !!it._novo;
    let base = T.rasc.abrir(it);
    const voltouRascunho = !!it._salvo;
    let m = null;
    const mexeu = () => { if (!novo) T.rasc.tocar(it, base); T.mexeu(it); if (m) T.rodapePinta(m, it, novo); };
    m = T.modal('<div></div>', {
      classe: 'item',
      aoFechar: () => {
        T.atual = null;
        // item novo que ficou vazio é descartado sem barulho
        if (it._novo && !it.titulo && !it.descricao && !it.texto && !it.anexos.length && !it.checklist.length) {
          T.db.itens = T.db.itens.filter((x) => x.id !== it.id); T.salvar();
        } else if (!novo && T.rasc.guardar(it)) {
          T.mexeu(it);
          T.toast('Alterações guardadas como rascunho. Abra o item de novo para salvar ou descartar.');
        }
        delete it._novo; delete it._xp;
        T.render();
      },
    });

    function desenhar() {
      const t = T.tipo(it.tipo);
      m.style.setProperty('--c', t.cor);
      m.innerHTML = `
        <div class="modal-cab">
          <i class="ico-tipo" style="--c:${t.cor}">${Icones.svg(it.tipo, 18)}</i>
          <h2>${t.nome}</h2>
          <span class="salvo" id="salvo">${Icones.svg('check', 14)} salvo</span>
          <button class="btn-icone ${it.fav ? 'fav' : ''}" id="eFav" title="Favorito">${Icones.svg('estrela', 18)}</button>
          <button class="btn-icone" id="eDel" title="Mandar para a lixeira">${Icones.svg('lixeira', 18)}</button>
          <button class="btn-icone" data-fechar title="Fechar (Esc)">${Icones.svg('x', 18)}</button>
        </div>
        <div class="modal-corpo">
          <div class="seg tipos" id="eTipos">${T.TIPOS.map((x) => `<button data-t="${x.id}" class="${x.id === it.tipo ? 'on' : ''}" style="--c:${x.cor}">${Icones.svg(x.id, 15)} ${x.nome}</button>`).join('')}</div>
          <input class="titulo-in" id="eTitulo" type="text" placeholder="Título" value="${esc(it.titulo)}" maxlength="300">
          ${voltouRascunho ? `<div class="aviso">${Icones.svg('editar', 14)} Este item tem alterações em rascunho. Clique em “Salvar e fechar” para ficar com elas, ou “Descartar alterações”.</div>` : ''}
          ${it.origem && it.origem.app ? `<div class="aviso suave">${Icones.svg('enviar', 14)} Veio de ${esc(it.origem.app)}${it.origem.url ? ` · <a href="${esc(it.origem.url)}" target="_blank" rel="noopener">abrir original</a>` : ''}</div>` : ''}
          <label class="campo">Descrição ${T.dica('Um resumo curto. Aparece no cartão.')}
            <div class="caixa-copia"><textarea id="eDesc" rows="2" placeholder="Sobre o que é?">${esc(it.descricao)}</textarea>${T.micBtn ? T.micBtn('eDesc') : ''}</div></label>
          <label class="campo">${it.tipo === 'link' ? 'Endereço (URL)' : 'Conteúdo'}
            <div class="caixa-copia"><textarea id="eTexto" rows="${it.tipo === 'link' ? 2 : 7}" class="${it.tipo === 'comando' ? 'mono' : ''}" placeholder="${it.tipo === 'link' ? 'https://…' : it.tipo === 'comando' ? 'Cole o comando aqui' : 'Escreva ou cole aqui'}">${esc(it.texto)}</textarea>
            <span class="caixa-acoes">${it.tipo !== 'link' && T.micBtn ? T.micBtn('eTexto') : ''}<button class="btn sec pequeno" id="eCopiar">${Icones.svg('copiar', 14)} Copiar</button></span></div></label>
          <div class="linha">
            <button class="btn ia pequeno" id="eIa">${Icones.svg('ia', 15)} Pedir à IA</button>
            <button class="btn sec pequeno" id="eEnviar">${Icones.svg('enviar', 14)} Enviar para…</button>
            ${it.tipo === 'link' && /^https?:\/\//i.test(it.texto.trim()) ? `<a class="btn sec pequeno" href="${esc(it.texto.trim().split(/\s/)[0])}" target="_blank" rel="noopener">${Icones.svg('abrir', 14)} Abrir link</a>` : ''}
          </div>
          <div id="eIaCaixa"></div>
          <div class="grade3">
            <label class="campo">Categoria<select id="eCat"><option value="">— nenhuma —</option>${T.db.categorias.map((c) => `<option value="${c.id}" ${c.id === it.categoria ? 'selected' : ''}>${esc(c.icone)} ${esc(c.nome)}</option>`).join('')}</select></label>
            <label class="campo">Status<select id="eSt">${T.STATUS.map((s) => `<option value="${s.id}" ${s.id === it.status ? 'selected' : ''}>${s.nome}</option>`).join('')}</select></label>
            <label class="campo">Data<input type="date" id="eData" value="${it.data}"></label>
          </div>
          <div class="grade2">
            ${(T.db.clientes || []).length ? `<label class="campo">Cliente<select id="eCli">${T.opcoesCliente(it.cliente)}</select></label>` : ''}
            <div class="cfg-linha"><span>Usar como modelo ${T.dica('Modelos aparecem no “Novo item”: viram um ponto de partida para itens parecidos (briefing, roteiro, checklist).')}</span>${T.chave('eModelo', it.modelo)}</div>
          </div>
          <label class="campo">Etiquetas ${T.dica('Separe com vírgula. Ex: ia, estudo, urgente')}
            <input type="text" id="eTags" value="${esc(it.tags.join(', '))}" placeholder="ia, estudo…" list="listaTags">
            <datalist id="listaTags">${T.todasTags().map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label>
          <div class="campo"><span>Checklist</span><div id="eCheck"></div></div>
          <div class="campo"><span>Links</span><div id="eLinks"></div></div>
          <div class="campo"><span>Anexos ${T.dica('Arraste arquivos para cá. Eles ficam guardados na pasta data/anexos do Backpack.')}</span><div id="eAnexos"></div><div id="ePrev"></div></div>
        </div>${T.rodapeSalvar(novo)}`;
      ligar();
      T.rodapePinta(m, it, novo);
      desenharCheck(); desenharLinks(); desenharAnexos();
    }

    function ligar() {
      $('#eDel', m).onclick = () => { T.fecharModal(); T.paraLixeira('item', it); };
      $('#eFav', m).onclick = () => { it.fav = !it.fav; mexeu(); T.som(it.fav ? 'estrela' : 'clique'); $('#eFav', m).classList.toggle('fav', it.fav); };
      $('#eCopiar', m).onclick = () => T.copiarItem(it);
      $('#eEnviar', m).onclick = (e) => T.menuEnviar(e, it);
      $('#eIa', m).onclick = () => T.painelIa($('#eIaCaixa', m), it, desenhar);
      $('#eTipos', m).onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; it.tipo = b.dataset.t; mexeu(); T.som('clique'); desenhar(); };
      $('#eTitulo', m).oninput = (e) => {
        it.titulo = e.target.value; mexeu();
        if (it._novo && !it._xp && it.titulo.trim().length > 2) { it._xp = true; T.ganhar('item'); }
      };
      $('#eDesc', m).oninput = (e) => { it.descricao = e.target.value; mexeu(); };
      $('#eTexto', m).oninput = (e) => { it.texto = e.target.value; mexeu(); };
      $('#eCat', m).onchange = (e) => { it.categoria = e.target.value; mexeu(); };
      $('#eSt', m).onchange = (e) => { it.status = e.target.value; mexeu(); T.som('clique'); };
      $('#eData', m).onchange = (e) => { it.data = e.target.value; mexeu(); };
      $('#eTags', m).oninput = (e) => { it.tags = [...new Set(e.target.value.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean))]; mexeu(); };
      if ($('#eCli', m)) $('#eCli', m).onchange = (e) => { it.cliente = e.target.value; mexeu(); };
      $('#eModelo', m).onchange = (e) => { it.modelo = e.target.checked; mexeu(); T.som('clique'); if (it.modelo) T.toast('Agora ele aparece em “Novo item” como modelo'); };
      $('#svOk', m).onclick = () => {
        if (novo && !it.titulo.trim() && !it.texto.trim() && !it.anexos.length) return T.falta($('#eTitulo', m), 'Dê um título ou escreva algo antes de salvar.');
        delete it._novo; T.rasc.salvar(it); T.mexeu(it); T.fecharModal(); T.toast(novo ? 'Item guardado' : 'Item salvo');
      };
      if ($('#svRev', m)) $('#svRev', m).onclick = () => { T.rasc.reverter(it); base = T.rasc.foto(it); T.mexeu(it); T.som('desfazer'); desenhar(); T.toast('Alterações descartadas: voltou a versão salva'); };
      if ($('#svNo', m)) $('#svNo', m).onclick = () => { T.db.itens = T.db.itens.filter((x) => x.id !== it.id); delete it._novo; T.salvar(); T.atual = null; T.fecharModal(); T.toast('Item descartado'); };
    }

    function desenharCheck() {
      const box = $('#eCheck', m);
      const feitos = it.checklist.filter((c) => c.feito).length;
      box.innerHTML = (it.checklist.length ? `<div class="progresso"><i style="width:${Math.round((feitos / it.checklist.length) * 100)}%"></i></div>` : '')
        + it.checklist.map((c) => `<div class="passo ${c.feito ? 'feito' : ''}" data-id="${c.id}"><input type="checkbox" ${c.feito ? 'checked' : ''}><input type="text" value="${esc(c.t)}"><button class="btn-x" title="Remover">${Icones.svg('x', 14)}</button></div>`).join('')
        + '<input type="text" id="eCheckNovo" class="novo-passo" placeholder="+ Novo passo (Enter)">';
      box.onchange = (e) => {
        const row = e.target.closest('.passo'); if (!row || e.target.type !== 'checkbox') return;
        const c = it.checklist.find((x) => x.id === row.dataset.id);
        c.feito = e.target.checked; mexeu();
        if (c.feito) T.ganhar('check', { x: e.clientX || innerWidth / 2, y: e.clientY || innerHeight / 2 });
        desenharCheck();
      };
      box.oninput = (e) => { const row = e.target.closest('.passo'); if (row && e.target.type === 'text') { it.checklist.find((x) => x.id === row.dataset.id).t = e.target.value; mexeu(); } };
      box.onclick = (e) => { const x = e.target.closest('.btn-x'); if (x) { it.checklist = it.checklist.filter((c) => c.id !== x.closest('.passo').dataset.id); mexeu(); desenharCheck(); } };
      $('#eCheckNovo', m).onkeydown = (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) { it.checklist.push({ id: T.uid(), t: e.target.value.trim(), feito: false }); mexeu(); T.som('clique'); desenharCheck(); $('#eCheckNovo', m).focus(); }
      };
    }

    function desenharLinks() {
      const box = $('#eLinks', m);
      box.innerHTML = it.links.map((l) => `<div class="passo" data-id="${l.id}">${Icones.svg('link', 15)}<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.rotulo || l.url)}</a><button class="btn-x" title="Remover">${Icones.svg('x', 14)}</button></div>`).join('')
        + '<input type="text" id="eLinkNovo" class="novo-passo" placeholder="+ Cole um link e aperte Enter">';
      box.onclick = (e) => { const x = e.target.closest('.btn-x'); if (x) { it.links = it.links.filter((l) => l.id !== x.closest('.passo').dataset.id); mexeu(); desenharLinks(); } };
      $('#eLinkNovo', m).onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        let v = e.target.value.trim(); if (!v) return;
        if (!/^[a-z]+:\/\//i.test(v)) v = `https://${v}`;
        if (!/^https?:\/\//i.test(v)) return T.toast('Use um link que comece com http:// ou https://');
        let rotulo = ''; try { rotulo = new URL(v).hostname.replace(/^www\./, ''); } catch (_) {}
        it.links.push({ id: T.uid(), url: v, rotulo }); mexeu(); T.som('clique'); desenharLinks(); $('#eLinkNovo', m).focus();
      };
    }

    function desenharAnexos() {
      const box = $('#eAnexos', m);
      box.innerHTML = it.anexos.map((a) => `<div class="anexo" data-id="${a.id}">
          <i class="anexo-ico">${Icones.svg(T.iconeArquivo(a), 18)}</i>
          <span class="anexo-nome" title="${esc(a.nome)}">${esc(a.nome)}</span><small>${T.tamanho(a.tamanho)}</small>
          <button class="btn sec pequeno" data-a="ver">${T.ehTexto(a.nome) ? `${Icones.svg('livro', 14)} Ler` : `${Icones.svg('olho', 14)} Ver`}</button>
          <a class="btn sec pequeno" href="${T.urlAnexo(a, true)}" download="${esc(a.nome)}">${Icones.svg('baixar', 14)} Baixar</a>
          <button class="btn sec pequeno" data-a="abrir" title="Abrir no programa do Mac">${Icones.svg('abrir', 14)} Abrir</button>
          <button class="btn sec pequeno" data-a="pasta" title="Mostrar no Finder">${Icones.svg('pasta', 14)}</button>
          <button class="btn-x" data-a="rm" title="Remover do item">${Icones.svg('x', 14)}</button></div>`).join('')
        + `<div class="soltar-aqui" id="eSoltar">${Icones.svg('clipe', 16)} Arraste arquivos aqui ou clique para escolher</div><input type="file" id="eArquivo" multiple hidden>`;
      box.onclick = async (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = it.anexos.find((x) => x.id === b.closest('.anexo').dataset.id);
        if (b.dataset.a === 'rm') {
          const pos = it.anexos.indexOf(a);
          it.anexos = it.anexos.filter((x) => x !== a); mexeu(); desenharAnexos(); $('#ePrev', m).innerHTML = '';
          return T.toast(`Anexo "${a.nome}" tirado do item`, () => { it.anexos.splice(pos, 0, a); mexeu(); if (T.atual === it) desenharAnexos(); });
        }
        if (b.dataset.a === 'abrir' || b.dataset.a === 'pasta') {
          return T.api(b.dataset.a === 'abrir' ? '/api/abrir' : '/api/mostrar', { method: 'POST', body: JSON.stringify({ arquivo: a.arquivo }) }).catch((er) => T.toast(er.message, null, 'erro'));
        }
        previa(a);
      };
      const zona = $('#eSoltar', m), fi = $('#eArquivo', m);
      zona.onclick = () => fi.click();
      fi.onchange = () => T.anexarArquivos(it, [...fi.files], desenharAnexos);
      zona.ondragover = (e) => { e.preventDefault(); zona.classList.add('sobre'); };
      zona.ondragleave = () => zona.classList.remove('sobre');
      zona.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); zona.classList.remove('sobre'); T.anexarArquivos(it, [...e.dataTransfer.files], desenharAnexos); };
    }

    function previa(a) {
      if (T.ehTexto(a.nome)) return T.abrirLeitor(a);
      const url = T.urlAnexo(a), n = a.nome.toLowerCase(), box = $('#ePrev', m);
      let h = '';
      if (/\.(png|jpe?g|gif|webp|svg)$/.test(n)) h = `<img src="${url}" alt="">`;
      else if (/\.pdf$/.test(n)) h = `<iframe src="${url}" title="${esc(a.nome)}"></iframe>`;
      else if (/\.(mp4|webm|mov)$/.test(n)) h = `<video src="${url}" controls></video>`;
      else if (/\.(mp3|wav|ogg|m4a)$/.test(n)) h = `<audio src="${url}" controls></audio>`;
      else if (/\.(csv|json|log)$/.test(n)) h = `<iframe src="${url}" class="branco" title="${esc(a.nome)}"></iframe>`;
      else { T.toast('Sem pré-visualização para esse tipo. Use Baixar ou Abrir.'); return; }
      box.innerHTML = `<div class="previa">${h}</div>`;
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    desenhar();
    if (!it.titulo) $('#eTitulo', m).focus();
  };
})();
