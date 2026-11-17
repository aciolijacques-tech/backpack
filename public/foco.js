// Backpack — modo foco. O relógio fica no servidor: dá para fechar a janela que o macOS avisa no fim.
(function () {
  const { $ } = T;
  let fim = 0, min = 25, resgatando = false, pref = 25; // pref: tempo escolhido e ainda não iniciado
  const limita = (n) => Math.max(5, Math.min(180, Math.round(n / 5) * 5));
  const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  async function resgatar() {
    if (resgatando || !T.db) return; resgatando = true;
    try {
      const r = await T.api('/api/foco/resgatar', { method: 'POST' });
      for (let i = 0; i < r.n; i++) T.ganhar('foco');
      if (r.n) { T.som('meta'); T.confete(null, null, 90, 11); T.toast(r.n > 1 ? `${r.n} focos concluídos! XP na conta.` : 'Foco concluído! Respire um pouco.'); if (T.ui.pagina === 'inicio') T.render(); }
    } catch (_) {}
    resgatando = false;
  }

  function pintar() {
    const el = $('#foco'); if (!el) return;
    if (!fim) { el.classList.remove('rodando'); $('#focoT').textContent = pref !== 25 ? `Foco ${pref} min` : 'Foco'; document.title = 'Backpack'; return; }
    const falta = fim - Date.now();
    if (falta <= 0) { fim = 0; pintar(); setTimeout(resgatar, 1200); return; }
    el.classList.add('rodando'); $('#focoT').textContent = fmt(falta); document.title = `${fmt(falta)} · Backpack`;
  }

  T.focoSincronizar = async () => {
    try {
      const r = await T.api('/api/foco');
      fim = r.fim ? Date.now() + (r.fim - r.agora) : 0; min = r.min || 25;
      pintar();
      if (r.pendentes) resgatar();
    } catch (_) {}
  };

  T.focoIniciar = async (m) => {
    try {
      const r = await T.api('/api/foco/iniciar', { method: 'POST', body: JSON.stringify({ min: m || 25 }) });
      fim = Date.now() + (r.fim - r.agora); min = r.min; T.som('estrela'); pintar();
      T.toast(`Foco de ${min} min começou. Pode fechar a janela: o Mac avisa no fim.`);
    } catch (e) { T.toast(e.message, null, 'erro'); }
  };

  T.focoAlternar = async () => {
    if (fim) {
      if (!(await T.confirmar('Parar o foco agora? Esse tempo não vale XP.', 'Parar'))) return;
      await T.api('/api/foco/parar', { method: 'POST' }).catch(() => {});
      fim = 0; T.som('clique'); pintar(); return;
    }
    const PRONTOS = [15, 25, 30, 45, 60, 90];
    const m = T.modal(`${T.cabecalho(`${Icones.svg('foco', 20)} Modo foco`)}<div class="modal-corpo">
      <p>Quanto tempo? ${T.dica('O relógio roda no servidor do Backpack. Pode fechar a janela: no fim aparece um aviso do macOS. A rodinha do mouse (ou as setas) muda de 5 em 5 minutos.')}</p>
      <div class="foco-num" id="focoNum" tabindex="0" title="Role a rodinha ou use as setas"><button class="btn-icone vidro-botao" data-d="-5">−</button><b id="focoMin">${pref}</b><span>min</span><button class="btn-icone vidro-botao" data-d="5">${Icones.svg('mais', 14)}</button></div>
      <div class="foco-grade">${PRONTOS.map((n) => `<button class="btn ${n === pref ? '' : 'sec'}" data-m="${n}">${n} min</button>`).join('')}</div>
      <div class="linha entre"><button class="btn sec pequeno" id="focoTeste">${Icones.svg('alerta', 14)} Testar o aviso do Mac</button><button class="btn" id="focoIr">Começar</button></div></div>`, { classe: 'pequeno' });
    const mostra = () => { $('#focoMin', m).textContent = pref; T.$$('[data-m]', m).forEach((b) => b.classList.toggle('sec', +b.dataset.m !== pref)); pintar(); };
    const muda = (d) => { pref = limita(pref + d); T.som('clique'); mostra(); };
    $('#focoTeste', m).onclick = () => T.api('/api/aviso-teste', { method: 'POST' }).then(() => T.toast('Aviso enviado. Olhe o canto da tela.'));
    $('#focoIr', m).onclick = () => { T.fecharModal(); T.focoIniciar(pref); };
    m.onwheel = (e) => { e.preventDefault(); muda(e.deltaY < 0 ? 5 : -5); };
    m.onkeydown = (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); muda(5); } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); muda(-5); } };
    m.onclick = (e) => {
      const d = e.target.closest('[data-d]'); if (d) return muda(+d.dataset.d);
      const b = e.target.closest('[data-m]'); if (!b) return;
      // clicar escolhe; clicar de novo no mesmo começa
      if (+b.dataset.m === pref) { T.fecharModal(); T.focoIniciar(pref); } else { pref = +b.dataset.m; T.som('clique'); mostra(); }
    };
    $('#focoIr', m).focus();
  };
  // rodinha em cima do botão do foco (parado) escolhe o tempo antes de abrir
  document.getElementById('foco').addEventListener('wheel', (e) => { if (fim) return; e.preventDefault(); pref = limita(pref + (e.deltaY < 0 ? 5 : -5)); T.som('clique'); pintar(); }, { passive: false });

  setInterval(pintar, 1000);
  setInterval(T.focoSincronizar, 30000);
  addEventListener('focus', T.focoSincronizar);
})();
