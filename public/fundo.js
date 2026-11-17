// Backpack — fundo com três ambientes (casa, escritório e aula) se revezando atrás do vidro.
// Só a troca (fade) anima: a imagem fica parada no resto do tempo, para o vidro não pesar.
(function () {
  const { $ } = T;
  T.AMBIENTES = [
    { id: 'casa', nome: 'Casa' },
    { id: 'escritorio', nome: 'Escritório' },
    { id: 'aula', nome: 'Aula' },
  ];
  let atual = 0, timer = 0;
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)');

  T.urlAmbiente = (id) => `/api/ambientes/${id}?v=${(T.db && T.db.config.fundo.versao) || 0}`;

  T.montarFundo = () => {
    const caixa = $('.ambiente');
    caixa.innerHTML = T.AMBIENTES.map((a, i) => `<div class="amb ${i === atual ? 'on' : ''}" data-amb="${a.id}" style="background-image:url('${T.urlAmbiente(a.id)}')"></div>`).join('');
    clearInterval(timer);
    const f = T.db.config.fundo;
    if (f.animado && !reduzido.matches) timer = setInterval(T.proximoAmbiente, (f.segundos || 10) * 1000);
  };

  T.proximoAmbiente = () => {
    if (document.hidden) return; // não troca com a janela escondida
    const L = document.querySelectorAll('.ambiente .amb');
    if (!L.length) return;
    L[atual].classList.remove('on');
    atual = (atual + 1) % L.length;
    L[atual].classList.add('on');
  };

  T.mostrarAmbiente = (id) => {
    const i = T.AMBIENTES.findIndex((a) => a.id === id);
    if (i < 0) return;
    const L = document.querySelectorAll('.ambiente .amb');
    L[atual].classList.remove('on'); atual = i; L[atual].classList.add('on');
  };

  // ---------- Configurações ----------
  T.secaoFundo = () => {
    const f = T.db.config.fundo;
    return `<section class="cfg vidro-cartao"><h3>${Icones.svg('imagem', 18)} Fundo</h3>
      <div class="cfg-linha"><span>Trocar de ambiente sozinho ${T.dica('Os três ambientes se revezam atrás do vidro. Desligando, fica parado no que estiver na tela.')}</span>${T.chave('fAnimado', f.animado)}</div>
      <div class="cfg-linha"><span>Tempo em cada ambiente</span><div class="seg" id="fSeg">${[6, 10, 20, 30].map((n) => `<button data-s="${n}" class="${f.segundos === n ? 'on' : ''}">${n} s</button>`).join('')}</div></div>
      <div class="ambientes-cfg">${T.AMBIENTES.map((a) => `<div class="amb-cfg" data-id="${a.id}">
        <div class="amb-mini" style="background-image:url('${T.urlAmbiente(a.id)}')" title="Mostrar agora"></div>
        <b>${a.nome}</b>
        <div class="linha"><button class="btn sec pequeno" data-a="trocar">${Icones.svg('subir', 14)} Trocar foto</button><button class="btn sec pequeno" data-a="padrao" title="Voltar à imagem que vem com o app">Padrão</button></div>
      </div>`).join('')}</div>
      <input type="file" id="fArquivo" accept="image/jpeg,image/png,image/webp" hidden>
      <small class="suave">Use fotos na horizontal (JPG, PNG ou WEBP, até 20 MB). Elas ficam em <code>data/ambientes</code> e não são apagadas nas atualizações.</small></section>`;
  };

  T.ligarSecaoFundo = () => {
    const f = T.db.config.fundo;
    $('#fAnimado').onchange = (e) => { f.animado = e.target.checked; T.salvar(); T.montarFundo(); T.som('clique'); };
    $('#fSeg').onclick = (e) => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      f.segundos = +b.dataset.s; T.salvar(); T.montarFundo(); T.som('clique');
      $('#fSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    };
    let alvo = '';
    const arquivo = $('#fArquivo');
    const atualizar = () => { f.versao = Date.now(); T.salvar(); T.montarFundo(); T.mostrarAmbiente(alvo); T.render(); };
    document.querySelector('.ambientes-cfg').onclick = async (e) => {
      const caixa = e.target.closest('.amb-cfg'); if (!caixa) return;
      alvo = caixa.dataset.id;
      if (e.target.closest('.amb-mini')) return T.mostrarAmbiente(alvo);
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'trocar') return arquivo.click();
      try { await T.api(`/api/ambientes/${alvo}`, { method: 'DELETE' }); atualizar(); T.toast('Voltou à imagem padrão'); } catch (er) { T.toast(er.message, null, 'erro'); }
    };
    arquivo.onchange = async () => {
      const file = arquivo.files[0]; arquivo.value = '';
      if (!file) return;
      try {
        const r = await fetch(`/api/ambientes/${alvo}`, { method: 'POST', headers: { 'X-Backpack': '1', 'Content-Type': file.type }, body: file });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.erro || `erro ${r.status}`);
        atualizar(); T.som('moeda'); T.toast('Foto trocada');
      } catch (er) { T.toast(er.message, null, 'erro'); }
    };
  };
})();
