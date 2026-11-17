// Backpack — IA: Claude Code e Codex instalados no Mac (ou chave da API). Painel dentro do item,
// janela da primeira vez e seção nas Configurações.
(function () {
  const { esc, $ } = T;
  T.IAS = [
    { id: 'claude', nome: 'Claude Code', dica: 'Usa a assinatura do Claude logada neste Mac.' },
    { id: 'codex', nome: 'Codex (ChatGPT)', dica: 'Usa a assinatura do ChatGPT logada neste Mac.' },
  ];
  let st = null;
  T.iaStatus = async (forcar) => { if (!st || forcar) st = await T.api(`/api/ia/status${forcar ? '?checar=1' : ''}`); return st; };
  const ligada = (id) => (T.db.config.ia.ligadas || {})[id] !== false;
  T.iaDisponiveis = async () => {
    const s = await T.iaStatus();
    const L = T.IAS.filter((i) => s[i.id] && s[i.id].ok && ligada(i.id)).map((i) => ({ id: i.id, nome: i.nome }));
    if (s.temChave) L.push({ id: 'api', nome: 'Claude (chave da API)' });
    return L;
  };

  // ---------- painel dentro do item ----------
  const ACOES = [['melhorar', 'Melhorar'], ['corrigir', 'Corrigir'], ['encurtar', 'Encurtar'], ['resumir', 'Resumir'], ['checklist', 'Virar checklist'], ['titulo', 'Sugerir título']];
  T.painelIa = (box, it, redesenhar, estado) => {
    if (!estado) estado = {};
    const acoes = it.tipo === 'prompt' ? [...ACOES.slice(0, 4), ['prompt', 'Turbinar prompt'], ...ACOES.slice(4)] : ACOES;
    const res = estado.carregando ? `<div class="ia-carrega"><i></i><i></i><i></i> A IA está pensando…</div>`
      : estado.erro ? `<div class="ia-erro">${Icones.svg('alerta', 15)} ${esc(estado.erro)}</div>`
      : estado.saida != null ? `<div class="ia-saida">${esc(estado.saida)}</div><div class="linha">
          ${estado.k === 'titulo' ? '<button class="btn pequeno" data-u="titulo">Usar como título</button>'
          : estado.k === 'checklist' ? '<button class="btn pequeno" data-u="check">Adicionar ao checklist</button>'
          : '<button class="btn pequeno" data-u="trocar">Substituir</button><button class="btn sec pequeno" data-u="somar">Inserir abaixo</button>'}
          <button class="btn sec pequeno" data-u="copiar">${Icones.svg('copiar', 14)} Copiar</button><button class="btn sec pequeno" data-u="nao">Descartar</button></div>` : '';
    box.innerHTML = `<div class="ia-painel">
      <div class="ia-cab">${Icones.svg('ia', 16)} <b>IA</b> ${T.dica('Usa o Claude Code ou o Codex do seu Mac (a sua assinatura) ou a chave da API, conforme as Configurações. O texto só é enviado quando você clica.')}
        <span class="espaco"></span><select id="iaUsar" hidden></select><button class="btn-x" id="iaX">${Icones.svg('x', 14)}</button></div>
      <div class="chips">${acoes.map(([k, n]) => `<button class="chip" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="linha"><input type="text" id="iaPedido" placeholder="Ou peça do seu jeito: “traduza para inglês”, “deixe mais formal”…"><button class="btn ia pequeno" id="iaIr">Enviar</button></div>
      <div id="iaRes">${res}</div></div>`;
    $('#iaX', box).onclick = () => { box.innerHTML = ''; };
    T.iaDisponiveis().then((L) => {
      const sel = $('#iaUsar', box); if (!sel || L.length < 2) return;
      sel.innerHTML = `<option value="">Automático</option>${L.map((x) => `<option value="${x.id}">${x.nome}</option>`).join('')}`;
      sel.value = L.some((x) => x.id === T.db.config.ia.ultima) ? T.db.config.ia.ultima : '';
      sel.hidden = false; sel.onchange = () => { T.db.config.ia.ultima = sel.value; T.salvar(); };
    }).catch(() => {});
    const pedir = async (k, pedido) => {
      const texto = it.texto || it.descricao || it.titulo;
      if (k !== 'livre' && !texto.trim()) return T.painelIa(box, it, redesenhar, { erro: 'Escreva algo no conteúdo primeiro.' });
      T.painelIa(box, it, redesenhar, { carregando: true });
      try {
        const r = await T.api('/api/ia', { method: 'POST', body: JSON.stringify({ acao: k, pedido, texto, via: T.db.config.ia.ultima || undefined }) });
        if (T.atual !== it) return;
        T.som('estrela');
        T.painelIa(box, it, redesenhar, { saida: r.texto + (r.cortado ? '\n\n[resposta cortada por tamanho]' : ''), k });
      } catch (e) { if (T.atual === it) { T.som('erro'); T.painelIa(box, it, redesenhar, { erro: e.message }); } }
    };
    box.querySelector('.chips').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) pedir(b.dataset.k); };
    const ir = () => { const q = $('#iaPedido', box).value.trim(); if (q) pedir('livre', q); };
    $('#iaIr', box).onclick = ir;
    $('#iaPedido', box).onkeydown = (e) => { if (e.key === 'Enter') ir(); };
    $('#iaRes', box).onclick = async (e) => {
      const u = e.target.closest('[data-u]'); if (!u) return;
      const saida = estado.saida;
      if (u.dataset.u === 'copiar') { await T.copiarTexto(saida); T.som('copia'); return T.toast('Copiado'); }
      if (u.dataset.u === 'nao') return T.painelIa(box, it, redesenhar);
      const antes = { titulo: it.titulo, texto: it.texto, checklist: it.checklist.slice() };
      if (u.dataset.u === 'trocar') it.texto = saida;
      else if (u.dataset.u === 'somar') it.texto = (it.texto ? `${it.texto}\n\n` : '') + saida;
      else if (u.dataset.u === 'titulo') it.titulo = saida.replace(/^["“]|["”]$/g, '').split('\n')[0];
      else if (u.dataset.u === 'check') saida.split('\n').map((l) => l.replace(/^[-*•\d.)\s[\]x]+/i, '').trim()).filter(Boolean).forEach((t) => it.checklist.push({ id: T.uid(), t, feito: false }));
      T.mexeu(it); T.som('soltar'); redesenhar();
      T.toast('Aplicado', () => { Object.assign(it, antes); T.mexeu(it); if (T.atual === it) redesenhar(); });
    };
  };

  // ---------- janela da primeira vez ----------
  T.iaPrimeiraVez = async () => {
    let s; try { s = await T.iaStatus(true); } catch (_) { return; }
    const achadas = T.IAS.filter((i) => s[i.id] && s[i.id].ok);
    const linhas = T.IAS.map((i) => {
      const ok = s[i.id] && s[i.id].ok;
      return `<div class="cfg-linha"><span><b>${i.nome}</b><small class="${ok ? 'verde' : ''}">${ok ? `● encontrado${s[i.id].versao ? ` (v${esc(s[i.id].versao)})` : ''} · ${i.dica}` : '○ não encontrado neste Mac'}</small></span>${ok ? T.chave(`ia_${i.id}`, ligada(i.id)) : ''}</div>`;
    }).join('');
    const topo = achadas.length === 2 ? 'Encontrei o <b>Claude Code</b> e o <b>Codex</b> neste Mac. Quer usar os dois?'
      : achadas.length === 1 ? `Encontrei o <b>${achadas[0].nome}</b> neste Mac.`
        : 'Não encontrei o Claude Code nem o Codex neste Mac. Tudo bem: o Backpack funciona sem IA, e você pode instalar depois ou usar uma chave da API do Claude nas Configurações.';
    const m = T.modal(`${T.cabecalho(`${Icones.svg('ia', 20)} Sua IA no Backpack`)}<div class="modal-corpo"><p>${topo}</p>
      ${achadas.length ? '<p class="suave">Ligue as que quiser usar para melhorar, corrigir e resumir textos dentro dos itens. Elas usam a sua assinatura, sem chave e sem custo extra.</p>' : ''}
      <div class="caixa">${linhas}</div><small class="suave">Dá para mudar quando quiser em Configurações → IA.</small>
      <div class="linha fim"><button class="btn" id="iaOk">${achadas.length ? 'Salvar' : 'Entendi'}</button></div></div>`, { classe: 'pequeno', aoFechar: fim });
    function fim() {
      if (T.db.config.ia.configurada) return;
      const l = { ...(T.db.config.ia.ligadas || {}) };
      achadas.forEach((i) => { const c = $(`#ia_${i.id}`, m); if (c) l[i.id] = c.checked; });
      T.db.config.ia.ligadas = l; T.db.config.ia.configurada = true; T.salvar();
      if (achadas.some((i) => l[i.id] !== false)) { T.som('moeda'); T.toast('IA pronta! Use o botão "Pedir à IA" dentro de um item.'); }
    }
    $('#iaOk', m).onclick = () => { fim(); T.fecharModal(); };
  };

  // ---------- Configurações ----------
  T.secaoIa = () => `<section class="cfg vidro-cartao"><h3>${Icones.svg('ia', 18)} IA (Claude e Codex)</h3>
    ${T.IAS.map((i) => `<div class="cfg-linha"><span>${i.nome} ${T.dica(`${i.dica} Precisa estar instalado e logado.`)}<small id="iaSt_${i.id}">…</small></span>${T.chave(`iaOn_${i.id}`, ligada(i.id))}</div>`).join('')}
    <div class="cfg-linha"><span>Qual usar ${T.dica('Automático: usa o Claude Code; se não tiver, o Codex; se não tiver nenhum, a chave da API.')}</span>
      <select id="iaVia"><option value="auto">Automático</option><option value="claude">Claude Code</option><option value="codex">Codex</option><option value="api">Chave da API do Claude</option></select></div>
    <div class="cfg-linha"><span>Modelo do Claude ${T.dica('Vale para o Claude Code e para a chave da API. Opus: o mais caprichado. Sonnet: rápido e bom. Haiku: o mais barato.')}</span>
      <select id="iaModelo"><option value="claude-opus-5-5">Claude Opus 5.5</option><option value="claude-sonnet-5-5">Claude Sonnet 5.5</option><option value="claude-haiku-5-5">Claude Haiku 5.5</option></select></div>
    <div class="cfg-linha"><span>Chave da API do Claude (opcional) ${T.dica('Só para quem não tem Claude Code nem Codex. Crie em console.anthropic.com. Fica só neste Mac, em data/segredos.json, fora do backup e do Drive.')}<small id="iaChaveSt"></small></span></div>
    <div class="linha"><input type="password" id="iaChave" placeholder="Cole aqui a sua chave (sk-ant-…)" autocomplete="off"><button class="btn" id="iaGuardar">Guardar</button><button class="btn sec" id="iaTirar">Remover</button></div>
    <div class="linha"><button class="btn sec pequeno" id="iaDeNovo">${Icones.svg('busca', 14)} Procurar IAs de novo</button></div></section>`;

  T.ligarSecaoIa = () => {
    const c = T.db.config.ia;
    const pinta = (r) => {
      const k = $('#iaChaveSt'); if (k) { k.textContent = r.temChave ? '● conectada' : '○ sem chave'; k.className = r.temChave ? 'verde' : ''; }
      T.IAS.forEach((i) => { const e = $(`#iaSt_${i.id}`); if (!e) return; const ok = r[i.id] && r[i.id].ok; e.textContent = ok ? `● encontrado${r[i.id].versao ? ` (v${r[i.id].versao})` : ''}` : '○ não instalado'; e.className = ok ? 'verde' : ''; });
    };
    T.iaStatus(true).then(pinta).catch(() => {});
    T.IAS.forEach((i) => { const x = $(`#iaOn_${i.id}`); if (x) x.onchange = () => { c.ligadas = { ...(c.ligadas || {}), [i.id]: x.checked }; T.salvar(); T.som('clique'); }; });
    $('#iaVia').value = c.via || 'auto';
    $('#iaVia').onchange = (e) => { c.via = e.target.value; T.salvar(); T.toast('Pronto'); };
    $('#iaModelo').value = c.modelo || 'claude-sonnet-5-5';
    $('#iaModelo').onchange = (e) => { c.modelo = e.target.value; T.salvar(); };
    const guardar = async (chave) => {
      try { const r = await T.api('/api/ia/chave', { method: 'POST', body: JSON.stringify({ chave }) }); $('#iaChave').value = ''; st = null; pinta({ ...(await T.iaStatus(true)), temChave: r.temChave }); T.toast(r.temChave ? 'Chave guardada' : 'Chave removida'); } catch (e) { T.toast(e.message, null, 'erro'); }
    };
    $('#iaGuardar').onclick = () => { const k = $('#iaChave').value.trim(); if (k) guardar(k); };
    $('#iaTirar').onclick = () => guardar('');
    $('#iaDeNovo').onclick = () => { T.db.config.ia.configurada = false; T.iaPrimeiraVez(); };
  };
})();
