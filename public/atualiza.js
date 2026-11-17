// Backpack — aviso de versão nova e atualização com um clique (a pasta data/ nunca é tocada).
// O app confere ao abrir e a cada 6 h; o servidor também avisa pelo macOS com a janela fechada.
(function () {
  const { esc, $ } = T;

  T.checarAtualizacao = async (manual) => {
    let r;
    try { r = await T.api(`/api/atualizacao${manual ? '?forcar=1' : ''}`); } catch (e) { if (manual) T.toast(e.message, null, 'erro'); return; }
    if (r.erro) { if (manual) T.toast(`Não consegui olhar o GitHub: ${r.erro}`, null, 'erro'); return; }
    if (!r.temNova) { if (manual) { T.som('moeda'); T.toast(`Você já está na versão mais nova (${r.atual}).`); } return; }
    const fita = $('#fitaAtualizacao');
    if (fita) { fita.hidden = false; fita.querySelector('b').textContent = `Backpack ${r.nova} disponível`; fita.onclick = () => T.checarAtualizacao(true); }
    if (!manual && T.db.config.atualizacaoPulada === r.nova) return;
    if (T.modalAberto() && !manual) { setTimeout(() => T.checarAtualizacao(false), 15000); return; }
    const m = T.modal(`${T.cabecalho(`${Icones.svg('presente', 20)} Saiu o Backpack ${esc(r.nova)}`)}<div class="modal-corpo">
      <p class="suave">Você está na versão ${esc(r.atual)}. O que tem de novo:</p>
      <ul class="novidades">${(r.novidades || []).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      ${r.git ? '<p class="aviso">Esta pasta é uma cópia de desenvolvimento (Git). Atualize no Terminal com <code>git pull</code> e reinicie o Backpack.</p>'
        : '<p class="suave">Seus itens, anexos, tarefas e chaves ficam como estão: a atualização só troca os arquivos do app.</p>'}
      <div class="linha fim"><button class="btn sec" id="upDepois">Depois</button>${r.git ? '' : `<button class="btn" id="upOk">${Icones.svg('baixar', 15)} Atualizar agora</button>`}</div></div>`, { classe: 'pequeno' });
    $('#upDepois', m).onclick = () => { T.db.config.atualizacaoPulada = r.nova; T.salvar(); T.fecharModal(); };
    if (!r.git) $('#upOk', m).onclick = () => aplicar(r.nova);
  };

  async function aplicar(nova) {
    const m = T.modal(`<div class="modal-corpo centro">${Icones.svg('baixar', 40)}<h2>Atualizando o Backpack…</h2><p class="suave" id="upMsg">Baixando a versão ${esc(nova)} do GitHub. Não feche esta janela.</p></div>`, { classe: 'pequeno' });
    try { await T.api('/api/atualizacao/aplicar', { method: 'POST' }); } catch (e) { $('#upMsg', m).textContent = `${e.message} Nada foi trocado.`; return; }
    $('#upMsg', m).textContent = 'Pronto! Reabrindo o app…';
    const ini = Date.now();
    const tentar = async () => {
      try { const r = await fetch('/api/ping', { cache: 'no-store' }).then((x) => x.json()); if (r.versao === nova) { location.reload(); return; } } catch (_) {}
      if (Date.now() - ini > 60000) { $('#upMsg', m).textContent = 'A atualização terminou, mas o app não reabriu sozinho. Abra o "Instalar Backpack" de novo.'; return; }
      setTimeout(tentar, 1000);
    };
    setTimeout(tentar, 2000);
  }

  T.secaoVersao = () => `<section class="cfg vidro-cartao"><h3>${Icones.svg('atualizar', 18)} Versão</h3>
    <div class="cfg-linha"><span>Backpack <b id="versaoAtual">…</b> ${T.dica('O app confere o GitHub ao abrir e a cada 6 horas, e avisa quando sai versão nova. A atualização troca só os arquivos do app: seus itens, anexos e chaves (pasta data) ficam como estão.')}</span>
      <button class="btn sec pequeno" id="versaoChecar">${Icones.svg('busca', 14)} Procurar atualização</button></div></section>`;
  T.ligarSecaoVersao = () => {
    T.api('/api/versao').then((v) => { const e = $('#versaoAtual'); if (e) e.textContent = `v${v.versao}`; }).catch(() => {});
    const b = $('#versaoChecar'); if (b) b.onclick = () => { T.toast('Olhando o GitHub…'); T.checarAtualizacao(true); };
  };

  // a atualização mexeu no app do Mac: falta rodar o instalador (o botão abre ele)
  let avisouApp = false;
  T.checarAppMac = async () => {
    if (avisouApp || T.remoto) return;
    let v; try { v = await T.api('/api/versao'); } catch (_) { return; }
    if (v.appMac !== 'reinstalar') return;
    avisouApp = true;
    const m = T.modal(`${T.cabecalho(`${Icones.svg('atualizar', 18)} Falta um passo`)}<div class="modal-corpo">
      <p>Esta versão mudou o app do Mac. Para ele ficar em dia, o instalador precisa rodar de novo.</p>
      <p class="suave">Leva cerca de 1 minuto e o app reabre sozinho. Seus itens, anexos e chaves ficam como estão.</p>
      <div class="linha fim"><button class="btn sec" data-fechar>Depois</button><button class="btn" id="reinst">${Icones.svg('atualizar', 15)} Atualizar o app agora</button></div></div>`, { classe: 'pequeno' });
    $('#reinst', m).onclick = async () => {
      try { await T.api('/api/reinstalar', { method: 'POST' }); T.fecharModal(); T.toast('Abrindo o instalador… o Backpack reabre sozinho no fim.'); } catch (e) { T.toast(e.message, null, 'erro'); }
    };
  };

  setInterval(() => T.checarAtualizacao(false), 6 * 3600e3);
})();
