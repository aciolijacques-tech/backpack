// Backpack — enviar itens para o Notion e o Trello; seção nas Configurações.
(function () {
  const { esc, $ } = T;
  let st = null;
  const NOME = { notion: 'Notion', trello: 'Trello' };
  T.intStatus = async (forcar) => { if (!st || forcar) st = await T.api('/api/int/status'); return st; };

  T.enviarItem = async (it, para) => {
    const s = await T.intStatus();
    if (!s[para].ok) { T.toast(`Conecte o ${NOME[para]} nas Configurações primeiro.`); return T.ir('config'); }
    T.toast(`Enviando para o ${NOME[para]}…`);
    try {
      const r = await T.api(`/api/int/${para}/enviar`, { method: 'POST', body: JSON.stringify({ id: it.id }) });
      it.enviado = { ...(it.enviado || {}), [para]: { url: r.url, em: T.agora() } }; T.salvar();
      T.som('moeda');
      const el = document.createElement('div');
      el.className = 'toast vidro-escuro';
      el.innerHTML = `<span>Enviado para o ${NOME[para]}</span>${r.url ? `<a class="btn-toast" href="${esc(r.url)}" target="_blank" rel="noopener">Abrir</a>` : ''}`;
      $('#toasts').appendChild(el); setTimeout(() => el.remove(), 7000);
    } catch (e) { T.toast(e.message, null, 'erro'); }
  };

  T.menuEnviar = (e, it) => T.menu(e, [
    { icone: 'enviar', t: 'Enviar para o Notion', fn: () => T.enviarItem(it, 'notion') },
    { icone: 'enviar', t: 'Enviar para o Trello', fn: () => T.enviarItem(it, 'trello') },
  ]);

  T.secaoIntegracoes = () => `<section class="cfg vidro-cartao"><h3>${Icones.svg('enviar', 18)} Notion e Trello</h3><div id="intCorpo"><small class="suave">Carregando…</small></div></section>`;

  T.ligarSecaoIntegracoes = async () => {
    const box = $('#intCorpo'); if (!box) return;
    let s; try { s = await T.intStatus(true); } catch (e) { box.textContent = e.message; return; }
    const ponto = (ok) => `<small class="${ok ? 'verde' : ''}">${ok ? '● conectado' : '○ não conectado'}</small>`;
    box.innerHTML = `
      <div class="cfg-linha"><span>Notion ${T.dica('1) Em notion.so/profile/integrations crie uma integração interna e copie o “Internal Integration Secret”. 2) No Notion, abra a página onde os itens vão cair → ••• → Conexões → adicione a integração. 3) Cole o segredo aqui e escolha a página.')}${ponto(s.notion.ok)}</span></div>
      <div class="linha"><input type="password" id="nTok" placeholder="${s.notion.temToken ? 'Segredo guardado (cole outro para trocar)' : 'Segredo da integração (ntn_…)'}" autocomplete="off"><button class="btn sec" id="nBuscar">Buscar páginas</button></div>
      <div class="linha"><select id="nPag"><option value="">${s.notion.alvoNome ? esc(s.notion.alvoNome) : '— escolha a página de destino —'}</option></select><button class="btn" id="nSalvar">Guardar</button><button class="btn sec" id="nTirar">Remover</button></div>
      <div class="cfg-linha"><span>Trello ${T.dica('1) Em trello.com/power-ups/admin crie um Power-Up e gere a chave da API. 2) Na mesma página, gere o Token e autorize. 3) Cole a chave e o token aqui e escolha a lista.')}${ponto(s.trello.ok)}</span></div>
      <div class="linha"><input type="password" id="tChave" placeholder="${s.trello.temChave ? 'Chave guardada' : 'API key'}" autocomplete="off"><input type="password" id="tTok" placeholder="${s.trello.temChave ? 'Token guardado' : 'Token'}" autocomplete="off"><button class="btn sec" id="tBuscar">Buscar listas</button></div>
      <div class="linha"><select id="tLista"><option value="">${s.trello.alvoNome ? esc(s.trello.alvoNome) : '— escolha a lista de destino —'}</option></select><button class="btn" id="tSalvar">Guardar</button><button class="btn sec" id="tTirar">Remover</button></div>
      <small class="suave">Depois de conectar, clique com o botão direito num item ou use “Enviar para…” dentro dele. As chaves ficam só neste ${T.pc}, em data/segredos.json, fora do backup, do Drive e do GitHub.</small>`;
    const erro = (e) => T.toast(e.message, null, 'erro');
    $('#nBuscar').onclick = async () => {
      try {
        const r = await T.api('/api/int/notion/paginas', { method: 'POST', body: JSON.stringify({ token: $('#nTok').value.trim() }) });
        if (!r.paginas.length) return T.toast('Nenhuma página encontrada. Conecte a integração a uma página no Notion (••• → Conexões).');
        $('#nPag').innerHTML = r.paginas.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('');
        T.toast(`${r.paginas.length} página(s) encontrada(s)`);
      } catch (e) { erro(e); }
    };
    $('#nSalvar').onclick = async () => {
      const sel = $('#nPag'); if (!sel.value) return T.toast('Escolha a página primeiro (Buscar páginas).');
      try { await T.api('/api/int/salvar', { method: 'POST', body: JSON.stringify({ notion: { token: $('#nTok').value.trim(), alvo: sel.value, alvoNome: sel.selectedOptions[0].textContent } }) }); T.som('moeda'); T.toast('Notion conectado'); T.ligarSecaoIntegracoes(); } catch (e) { erro(e); }
    };
    $('#nTirar').onclick = async () => { await T.api('/api/int/salvar', { method: 'POST', body: JSON.stringify({ notion: null }) }); T.toast('Notion desconectado'); T.ligarSecaoIntegracoes(); };
    $('#tBuscar').onclick = async () => {
      try {
        const r = await T.api('/api/int/trello/listas', { method: 'POST', body: JSON.stringify({ key: $('#tChave').value.trim(), token: $('#tTok').value.trim() }) });
        if (!r.listas.length) return T.toast('Nenhuma lista encontrada nos seus quadros.');
        $('#tLista').innerHTML = r.listas.map((l) => `<option value="${esc(l.id)}">${esc(l.nome)}</option>`).join('');
        T.toast(`${r.listas.length} lista(s) encontrada(s)`);
      } catch (e) { erro(e); }
    };
    $('#tSalvar').onclick = async () => {
      const sel = $('#tLista'); if (!sel.value) return T.toast('Escolha a lista primeiro (Buscar listas).');
      try { await T.api('/api/int/salvar', { method: 'POST', body: JSON.stringify({ trello: { key: $('#tChave').value.trim(), token: $('#tTok').value.trim(), alvo: sel.value, alvoNome: sel.selectedOptions[0].textContent } }) }); T.som('moeda'); T.toast('Trello conectado'); T.ligarSecaoIntegracoes(); } catch (e) { erro(e); }
    };
    $('#tTirar').onclick = async () => { await T.api('/api/int/salvar', { method: 'POST', body: JSON.stringify({ trello: null }) }); T.toast('Trello desconectado'); T.ligarSecaoIntegracoes(); };
  };
})();
