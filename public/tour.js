// Backpack — tutorial guiado por tela, novidades depois de atualizar e "Reportar problema".
// O tutorial começa sozinho na primeira vez em cada tela; o botão "? Tutorial" ao lado do nome revê.
(function () {
  const { esc, $ } = T;

  T.TOURS = {
    inicio: [
      ['.kpis', 'Resumo do dia: itens guardados, o que é para hoje, atrasadas e a meta de XP.'],
      ['.captura', 'Captura rápida: escreva e aperte Enter. Escolha se vira tarefa, nota, prompt ou link.'],
      ['.paineis', 'Tarefas de hoje, rotina, missões e favoritos ficam aqui.'],
      ['.lateral', 'Calendário do mês, próximas datas e o mapa de conexões.'],
      ['#btnNovo', 'O + cria um item novo (ou use a tecla N). Dá para começar de um modelo ou falando.'],
    ],
    biblioteca: [
      ['#chipsTipo', 'Filtre pelo tipo: estudo, prompt, instrução, comando, link ou nota.'],
      ['.filtros', 'Busque, filtre por categoria, status, etiqueta, favoritos e modelos.'],
      ['#visoes', 'Veja em grade, lista, tabela ou quadro (no quadro dá para arrastar).'],
      ['#resultados', 'Clique num cartão para abrir. Botão direito abre o menu.'],
    ],
    tarefas: [
      ['.tnova', 'Escreva a tarefa. “amanhã”, “sexta” ou “dia 20” no fim viram data. O microfone dita.'],
      ['.tnova-l2', 'Data, lembrete com horário (o computador avisa), prioridade, repetição e cliente.'],
      ['.tcols', 'As tarefas ficam separadas em atrasadas, hoje, próximas e sem data.'],
    ],
    calendario: [['.cal-mes', 'Clique num dia para criar uma tarefa. Arraste uma tarefa para remarcar. O 🎯 mostra os hábitos do dia.']],
    rotina: [
      ['#hNovo', 'Crie hábitos: todo dia, só em alguns dias ou X vezes por semana.'],
      ['.rot-hab', 'Clique no círculo quando fizer. O fogo conta os dias seguidos.'],
      ['.rot-metas', 'Metas com número e prazo: vá somando o que avançou até 100%.'],
      ['.rot-mes', 'O mapa do mês mostra quanto da rotina você cumpriu em cada dia.'],
    ],
    clientes: [
      ['#cliNovo', 'Cadastre o cliente com contatos, Trello e pasta.'],
      ['#cliV', 'Veja em cartões ou no funil (arraste entre as colunas para mudar o status).'],
    ],
    financeiro: [
      ['.fin-barra', 'Troque o mês e lance entradas e saídas. Contas fixas podem repetir todo mês ou ser parceladas.'],
      ['.fin-kpis', 'Recebido, pago, saldo, a receber, a pagar e a previsão de como o mês fecha.'],
      ['#fCalc', 'A calculadora mostra quanto vale sua hora e o preço de um projeto.'],
    ],
    mapa: [['#mapaBox', 'Cada ponto é um item. As linhas ligam itens com etiquetas iguais, da mesma categoria ou que citam um ao outro.']],
    ferramentas: [['#fNova', 'Adicione os sites que você usa. “Guardar” vira um link na Biblioteca.']],
    conquistas: [['.kpis', 'Nível, XP, sequência de dias e o que você já fez.'], ['.grade-conquistas', 'As conquistas acendem quando você chega lá.']],
    lixeira: [['.pagina-cab', 'O que você apaga vem para cá. Dá para restaurar ou apagar de vez.']],
    config: [['.cfg-menu', 'Pule direto para a seção: aparência, fundo, celular, IA, dados e mais.']],
  };

  T.botaoTutorial = (p) => (T.TOURS[p] ? `<button class="tutorial-btn" data-tutorial="${p}" title="Ver o tutorial desta tela">? Tutorial</button>` : '');
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-tutorial]'); if (b) { e.preventDefault(); T.tour(b.dataset.tutorial, true); } });

  let ativo = null;
  function fechar() { if (!ativo) return; ativo.el.remove(); ativo = null; removeEventListener('resize', posicionar); }
  function posicionar() {
    if (!ativo) return;
    const [sel, txt] = ativo.passos[ativo.i];
    const alvo = document.querySelector(sel);
    const caixa = ativo.el.querySelector('.tour-caixa'), luz = ativo.el.querySelector('.tour-luz');
    caixa.querySelector('p').textContent = txt;
    caixa.querySelector('.tour-n').textContent = `${ativo.i + 1} de ${ativo.passos.length}`;
    caixa.querySelector('[data-t="prox"]').textContent = ativo.i === ativo.passos.length - 1 ? 'Entendi' : 'Próximo';
    if (!alvo) { luz.style.opacity = 0; caixa.style.left = `${innerWidth / 2 - 160}px`; caixa.style.top = `${innerHeight / 2 - 60}px`; return; }
    alvo.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    const r = alvo.getBoundingClientRect();
    Object.assign(luz.style, { opacity: 1, left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
    const w = Math.min(320, innerWidth - 24);
    const embaixo = r.bottom + 170 < innerHeight;
    caixa.style.left = `${Math.max(12, Math.min(r.left, innerWidth - w - 12))}px`;
    caixa.style.top = `${embaixo ? r.bottom + 14 : Math.max(12, r.top - 150)}px`;
  }
  // forcar: mostra mesmo com os tutoriais desligados (botão "? Tutorial")
  T.tour = (p, forcar) => {
    const passos = (T.TOURS[p] || []).filter(([sel]) => document.querySelector(sel));
    if (!passos.length) { if (forcar) T.toast('Esta tela não tem tutorial.'); return; }
    fechar();
    const el = document.createElement('div');
    el.className = 'tour';
    el.innerHTML = `<div class="tour-luz"></div><div class="tour-caixa vidro"><small class="tour-n"></small><p></p>
      <div class="linha entre"><button class="btn sec pequeno" data-t="pular">${forcar ? 'Fechar' : 'Pular tutoriais'}</button><button class="btn pequeno" data-t="prox">Próximo</button></div></div>`;
    document.body.appendChild(el);
    ativo = { el, passos, i: 0, p };
    el.onclick = (e) => {
      const b = e.target.closest('[data-t]');
      if (!b && e.target !== el) return;
      if (b && b.dataset.t === 'pular' && !forcar) { T.db.config.tourOff = true; T.salvar(); T.toast('Tutoriais desligados. Para rever, use “? Tutorial” ao lado do nome da tela.'); }
      if (b && b.dataset.t === 'prox' && ativo.i < ativo.passos.length - 1) { ativo.i++; posicionar(); T.som('clique'); return; }
      fechar();
    };
    addEventListener('resize', posicionar);
    posicionar();
    if (!forcar) { T.db.config.tour = { ...(T.db.config.tour || {}), [p]: true }; T.salvar(); }
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ativo) { e.stopPropagation(); fechar(); } }, true);
  // primeira vez em cada tela: espera janelas fecharem
  T.tourAuto = () => {
    const c = T.db.config, p = T.ui.pagina;
    if (c.tourOff || (c.tour || {})[p] || T.remoto || ativo) return;
    setTimeout(() => { if (!T.modalAberto() && T.ui.pagina === p && !ativo) T.tour(p); }, 700);
  };
  T.tourFechar = fechar;

  // ---------- novidades: uma vez depois de atualizar ----------
  T.mostrarNovidades = async () => {
    try {
      const v = await T.api('/api/versao');
      const c = T.db.config;
      if (!c.versaoVista) { c.versaoVista = v.versao; T.salvar(); return; } // instalação nova não vê
      if (c.versaoVista === v.versao || !(v.novidades || []).length) return;
      c.versaoVista = v.versao; T.salvar();
      T.modal(`${T.cabecalho(`${Icones.svg('presente', 18)} Novidades da versão ${esc(v.versao)}`)}<div class="modal-corpo"><ul class="novidades">${v.novidades.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        <div class="linha fim"><button class="btn" data-fechar>Legal!</button></div></div>`, { classe: 'pequeno' });
    } catch (_) {}
  };

  // ---------- reportar problema ----------
  const erros = [];
  const guarda = (msg) => { erros.push(`${new Date().toLocaleTimeString('pt-BR')} ${String(msg).slice(0, 300)}`); if (erros.length > 8) erros.shift(); };
  addEventListener('error', (e) => guarda(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
  addEventListener('unhandledrejection', (e) => guarda(`promessa: ${(e.reason && e.reason.message) || e.reason}`));
  const toastOriginal = T.toast;
  T.toast = (msg, desfazer, tipo) => { if (tipo === 'erro') guarda(msg); return toastOriginal(msg, desfazer, tipo); };
  const REPO = 'https://github.com/aciolijacques-tech/backpack';

  T.reportar = async () => {
    let versao = '';
    try { versao = (await T.api('/api/versao')).versao; } catch (_) {}
    const tecnico = [`Backpack ${versao}`, navigator.userAgent, `Tela: ${T.ui.pagina}`, `Itens: ${T.db.itens.length}`, ...(erros.length ? ['Erros recentes:', ...erros] : ['Sem erros recentes'])].join('\n');
    const m = T.modal(`${T.cabecalho(`${Icones.svg('alerta', 18)} Reportar problema ou sugestão`)}<div class="modal-corpo">
      <div class="seg" id="rTipo"><button data-t="Problema" class="on">Problema</button><button data-t="Sugestão">Sugestão</button></div>
      <label class="campo">O que aconteceu? (ou o que você gostaria)<div class="caixa-copia"><textarea id="rTx" rows="5" placeholder="Conte o passo a passo: onde clicou, o que esperava e o que aconteceu."></textarea>${T.micBtn ? T.micBtn('rTx') : ''}</div></label>
      <details><summary class="suave">Informações técnicas que vão junto</summary><pre class="mono pequeno-txt">${esc(tecnico)}</pre></details>
      <div class="linha fim"><button class="btn sec" id="rCop">${Icones.svg('copiar', 14)} Copiar</button><button class="btn" id="rGh">${Icones.svg('abrir', 14)} Abrir no GitHub</button></div>
      <small class="suave">Nada é enviado sozinho: você vê tudo antes. Seus itens não vão junto.</small></div>`, { classe: 'pequeno' });
    let tipo = 'Problema';
    $('#rTipo', m).onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tipo = b.dataset.t; T.$$('#rTipo button', m).forEach((x) => x.classList.toggle('on', x === b)); };
    const texto = () => `${$('#rTx', m).value.trim()}\n\n---\n${tecnico}`;
    $('#rCop', m).onclick = () => { if (!$('#rTx', m).value.trim()) return T.falta($('#rTx', m), 'Conte o que aconteceu primeiro.'); T.copiarTexto(texto()); T.toast('Copiado'); };
    $('#rGh', m).onclick = () => {
      const tx = $('#rTx', m).value.trim();
      if (!tx) return T.falta($('#rTx', m), 'Conte o que aconteceu primeiro.');
      const url = `${REPO}/issues/new?title=${encodeURIComponent(`${tipo}: ${tx.split('\n')[0].slice(0, 70)}`)}&body=${encodeURIComponent(texto().slice(0, 6000))}`;
      window.open(url, '_blank', 'noopener');
    };
  };
})();
