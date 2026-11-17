// Backpack — Início: indicadores, captura rápida, tarefas do dia, missões, favoritos, recentes,
// calendário do mês, próximas tarefas e mapa de conexões.
(function () {
  const { esc, $ } = T;
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  let modoCaptura = 'tarefa';
  let mesMini = null;

  const linhaItem = (it) => {
    const t = T.tipo(it.tipo);
    return `<div class="linha-mini" data-id="${it.id}"><i class="ico-tipo" style="--c:${t.cor}">${Icones.svg(it.tipo, 14)}</i><b>${esc(it.titulo || 'Sem título')}</b><small>${new Date(it.atualizadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</small></div>`;
  };

  function miniCalendario() {
    if (!mesMini) { const n = new Date(); mesMini = [n.getFullYear(), n.getMonth()]; }
    const [A, M] = mesMini, hoje = T.hoje();
    const datas = {};
    T.db.tarefas.filter((t) => !t.feita && t.data).forEach((t) => (datas[t.data] = datas[t.data] || []).push(t.texto));
    T.db.itens.filter((i) => i.data).forEach((i) => (datas[i.data] = datas[i.data] || []).push(i.titulo));
    let h = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => `<span class="mc-sem">${d}</span>`).join('');
    for (let k = 0; k < new Date(A, M, 1).getDay(); k++) h += '<span></span>';
    for (let d = 1; d <= new Date(A, M + 1, 0).getDate(); d++) {
      const iso = T.ymd(new Date(A, M, d)), L = datas[iso] || [];
      const atras = T.db.tarefas.some((t) => !t.feita && t.data === iso && iso < hoje);
      let cls = 'mc-dia';
      if (iso === hoje) cls += ' hoje';
      if (L.length) cls += atras ? ' atrasado' : iso === hoje ? ' com-hoje' : ' com';
      h += `<span class="${cls}" data-d="${iso}" ${L.length ? `title="${esc(L.join(' • '))}"` : ''}>${d}</span>`;
    }
    return `<div class="mc-topo"><strong>${MESES[M]} ${A}</strong><div><button class="mc-nav" data-mc="-1" title="Mês anterior">${Icones.svg('esquerda', 14)}</button><button class="mc-nav" data-mc="1" title="Próximo mês">${Icones.svg('direita', 14)}</button></div></div><div class="mc-grade">${h}</div>`;
  }

  function agenda() {
    const hoje = T.hoje();
    const tarefas = T.db.tarefas.filter((t) => !t.feita && t.data).map((t) => ({ tipo: 't', id: t.id, titulo: t.texto, data: t.data, sub: T.PRIO_NOME[t.prio], cor: t.prio === 'alta' ? '#ff4d5e' : t.prio === 'media' ? '#ff7e00' : '#4f8cff', icone: 'tarefas' }));
    const itens = T.db.itens.filter((i) => i.data && i.data >= hoje).map((i) => ({ tipo: 'i', id: i.id, titulo: i.titulo || 'Sem título', data: i.data, sub: T.tipo(i.tipo).nome, cor: T.tipo(i.tipo).cor, icone: i.tipo }));
    const L = [...tarefas, ...itens].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6);
    if (!L.length) return '<li class="agenda-vazia">Nada marcado. Coloque uma data numa tarefa ou num item para ele aparecer aqui.</li>';
    return L.map((x) => {
      const atras = x.tipo === 't' && x.data < hoje, ehHoje = x.data === hoje;
      return `<li class="agenda-item" data-${x.tipo === 't' ? 'tarefa' : 'item'}="${x.id}"><i class="agenda-ico" style="--c:${x.cor}">${Icones.svg(x.icone, 16)}</i>
        <div><b>${esc(x.titulo)}</b><small>${esc(x.sub)}</small></div><span class="agenda-quando ${atras ? 'atrasada' : ehHoje ? 'hoje' : ''}">${atras ? 'Atrasada' : ehHoje ? 'Hoje' : T.fmtData(x.data)}</span></li>`;
    }).join('');
  }

  T.paginas.inicio = () => {
    const v = $('#vista'), c = T.db.config, j = T.db.jogo, hoje = T.hoje();
    const h = new Date().getHours(), oi = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const ext = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const abertas = T.db.tarefas.filter((t) => !t.feita);
    const atrasadas = abertas.filter((t) => t.data && t.data < hoje), deHoje = abertas.filter((t) => t.data === hoje);
    const itensHoje = T.db.itens.filter((i) => i.data === hoje);
    const andamento = T.db.itens.filter((i) => i.status === 'andamento').sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 5);
    const favs = T.db.itens.filter((i) => i.fav).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 5);
    const recentes = [...T.db.itens].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 4);
    const total = T.db.itens.length;
    const finHoje = T.finHoje().sort((a, b) => a.data.localeCompare(b.data));

    // indicadores
    const porTipo = T.TIPOS.map((t) => ({ t, n: T.db.itens.filter((i) => i.tipo === t.id).length }));
    const maxT = Math.max(1, ...porTipo.map((x) => x.n));
    const barras = porTipo.map(({ t, n }) => `<span title="${t.nome}: ${n}" style="--h:${Math.max(8, (n / maxT) * 100)}%;--c:${t.cor}"></span>`).join('');
    const dias = (f) => Array.from({ length: 7 }, (_, k) => { const iso = T.somarDias(hoje, f(k)); return abertas.filter((t) => t.data === iso).length + T.db.itens.filter((i) => i.data === iso).length; });
    const pulso = (vals, alerta) => { const m = Math.max(1, ...vals); return vals.map((x) => `<span style="--h:${Math.max(10, (x / m) * 100)}%" class="${x ? (alerta ? 'tem alerta' : 'tem') : ''}"></span>`).join(''); };
    const diaXp = (j.log[hoje] || { xp: 0 }).xp, meta = c.metaDiaria || 50, pctMeta = Math.min(100, Math.round((diaXp / meta) * 100));
    const comAnexo = T.db.itens.filter((i) => i.anexos.length).length, pctAnexo = total ? Math.round((comAnexo / total) * 100) : 0;
    const nHoje = deHoje.length + itensHoje.length;
    const modos = [['tarefa', 'Tarefa'], ['nota', 'Nota'], ['prompt', 'Prompt'], ['link', 'Link']];
    const ph = { tarefa: 'Nova tarefa… (termine com “hoje”, “amanhã” ou “sexta”)', nota: 'Anote uma ideia rápida…', prompt: 'Cole um prompt para guardar…', link: 'Cole um link…' };

    v.innerHTML = `<div class="inicio">
      <section class="principal">
        <div class="saudacao"><div><h1>${oi}${c.nome ? `, ${esc(c.nome)}` : ''}! ${T.botaoTutorial('inicio')}</h1><p>O que vamos guardar hoje?</p></div><span class="hoje-extenso">${ext.charAt(0).toUpperCase() + ext.slice(1)}</span></div>
        <div class="kpis">
          <article class="kpi" data-ir="biblioteca"><header><span>Itens</span><i class="kpi-ico" style="--c:var(--accent)">${Icones.svg('tudo', 15)}</i></header>
            <div class="kpi-barras">${barras}</div><strong>${total}</strong><small>${total === 1 ? 'item na biblioteca' : 'na biblioteca'}</small></article>
          <article class="kpi" data-ir="tarefas"><header><span>Para hoje</span><i class="kpi-ico" style="--c:var(--verde)">${Icones.svg('calendario', 15)}</i></header>
            <div class="kpi-pulso">${pulso(dias((k) => k))}</div><strong>${nHoje}</strong><small>${nHoje === 1 ? 'tarefa ou item' : 'tarefas e itens'}</small></article>
          <article class="kpi" data-ir="tarefas"><header><span>Atrasadas</span><i class="kpi-ico" style="--c:var(--vermelho)">${Icones.svg('alerta', 15)}</i></header>
            <div class="kpi-pulso">${pulso(Array.from({ length: 7 }, (_, k) => abertas.filter((t) => t.data === T.somarDias(hoje, k - 6) && t.data < hoje).length), true)}</div><strong>${atrasadas.length}</strong><small>${atrasadas.length === 1 ? 'tarefa' : 'tarefas'}</small></article>
          ${c.jogo
    ? `<article class="kpi" data-ir="conquistas"><header><span>Meta do dia</span><i class="kpi-ico" style="--c:var(--roxo)">${Icones.svg('alvo', 15)}</i></header>
            <div class="kpi-anel" style="--pct:${pctMeta};--cor:var(--roxo)"><span>${pctMeta}%</span></div><small class="centro">${diaXp} / ${meta} XP</small></article>`
    : `<article class="kpi" data-ir="biblioteca"><header><span>Com anexo</span><i class="kpi-ico" style="--c:var(--azul)">${Icones.svg('clipe', 15)}</i></header>
            <div class="kpi-anel" style="--pct:${pctAnexo}"><span>${comAnexo}</span></div><small class="centro">${pctAnexo}% dos itens</small></article>`}
        </div>

        <div class="captura vidro-cartao">
          <div class="seg" id="capModo">${modos.map(([k, n]) => `<button data-m="${k}" class="${modoCaptura === k ? 'on' : ''}">${Icones.svg(k === 'tarefa' ? 'tarefas' : k, 14)}<span>${n}</span></button>`).join('')}</div>
          <input type="text" id="capTexto" placeholder="${ph[modoCaptura]}" autocomplete="off">
          <button class="btn" id="capOk">Guardar</button>
        </div>

        <div class="paineis">
          <section class="painel vidro-cartao"><h3>${Icones.svg('tarefas', 16)} Para hoje <a data-ir="tarefas">ver todas</a></h3>
            ${[...atrasadas, ...deHoje].map(T.tarefaHTML).join('') || '<p class="suave">Tudo em dia.</p>'}
            ${T.rotinaHojeHTML()}
            ${finHoje.length ? `<h3>${Icones.svg('dinheiro', 16)} Contas de hoje <a data-ir="financeiro">financeiro</a></h3>${finHoje.slice(0, 4).map((f) => `<div class="fin-linha mini ${f.data < hoje ? 'atrasada' : ''}" data-ir="financeiro"><span class="fin-d">${f.data.slice(8)}/${f.data.slice(5, 7)}</span><span class="fin-x"><b>${esc(f.desc || (f.tipo === 'entrada' ? 'Entrada' : 'Saída'))}</b></span><span class="fin-v ${f.tipo === 'entrada' ? 'pos' : 'neg'}">${f.tipo === 'entrada' ? '+' : '−'} ${T.brl(f.valor)}</span></div>`).join('')}` : ''}</section>
          <section class="painel vidro-cartao">${c.jogo ? `<h3>${Icones.svg('alvo', 16)} Missões do dia ${T.dica('Complete as três para ganhar um bônus de XP. Zera todo dia.')}</h3>
            ${T.missoes().map((q) => `<div class="missao ${q.v >= q.max ? 'ok' : ''}">${Icones.svg(q.icone, 14)}<span>${q.t}</span><div class="progresso"><i style="width:${Math.min(100, (q.v / q.max) * 100)}%"></i></div><small>${q.v >= q.max ? Icones.svg('check', 13) : `${q.v}/${q.max}`}</small></div>`).join('')}` : ''}
            <h3>${Icones.svg('atualizar', 16)} Em andamento</h3>${andamento.map(linhaItem).join('') || '<p class="suave">Nada em andamento.</p>'}</section>
          <section class="painel vidro-cartao"><h3>${Icones.svg('estrela', 16)} Favoritos</h3>${favs.map(linhaItem).join('') || '<p class="suave">Marque um item com a estrela.</p>'}</section>
        </div>

        <div class="secao-titulo"><h2>Mexidos por último</h2><a class="suave" data-ir="biblioteca">abrir a Biblioteca</a></div>
        <div class="grade-cartoes">${recentes.map((it) => T.cartaoHTML(it)).join('') || T.vazio('biblioteca', 'Sua biblioteca está vazia', 'Crie o primeiro item no + do topo, com a tecla N ou arrastando um arquivo para a janela.')}</div>
      </section>

      <aside class="lateral vidro-escuro">
        <div class="mini-cal" id="miniCal">${miniCalendario()}</div>
        <div class="agenda"><div class="agenda-topo"><strong>Próximas</strong><a data-ir="calendario">calendário</a></div><ul class="agenda-lista">${agenda()}</ul></div>
        <div class="mini-mapa"><div class="agenda-topo"><strong>Conexões</strong><a data-ir="mapa">tela cheia</a></div>${total ? '<div class="mapa-caixa" id="miniMapa"></div>' : '<p class="agenda-vazia">Guarde alguns itens para ver as conexões.</p>'}</div>
      </aside></div>`;
    if (total) T.mapa($('#miniMapa'));
    const capMic = T.micBtn ? T.micBtn('capTexto') : '';
    if (capMic) $('#capOk').insertAdjacentHTML('beforebegin', capMic);

    const input = $('#capTexto');
    const guardar = () => {
      const val = input.value.trim(); if (!val) return;
      const ehUrl = /^(https?:\/\/|www\.)\S+$/i.test(val);
      const modo = ehUrl ? 'link' : modoCaptura;
      if (modo === 'tarefa') { const t = T.adicionarTarefa(val); T.toast(t && t.data ? `Tarefa criada para ${t.data === T.hoje() ? 'hoje' : T.fmtData(t.data)}` : 'Tarefa criada'); }
      else {
        const url = ehUrl && !/^https?:/i.test(val) ? `https://${val}` : val;
        const titulo = modo === 'link' ? url.replace(/^https?:\/\/(www\.)?/i, '').split(/[/?#]/)[0] : val.split('\n')[0].slice(0, 60);
        T.criarItem({ tipo: modo, titulo, texto: modo === 'nota' && val.length <= 60 ? '' : url, categoria: '' });
        T.toast(`${T.tipo(modo).nome} guardado na Biblioteca`);
      }
      T.render(); $('#capTexto').focus();
    };
    $('#capOk').onclick = guardar;
    input.onkeydown = (e) => { if (e.key === 'Enter') guardar(); };
    $('#capModo').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; modoCaptura = b.dataset.m; T.som('clique'); T.render(); $('#capTexto').focus(); };
    $('#miniCal').onclick = (e) => {
      const nav = e.target.closest('[data-mc]');
      if (nav) { const d = new Date(mesMini[0], mesMini[1] + +nav.dataset.mc, 1); mesMini = [d.getFullYear(), d.getMonth()]; $('#miniCal').innerHTML = miniCalendario(); return; }
      const dia = e.target.closest('[data-d]');
      if (dia) { const d = new Date(`${dia.dataset.d}T12:00:00`); T.ui.calMes = [d.getFullYear(), d.getMonth()]; T.ir('calendario'); }
    };
    v.onclick = (e) => {
      const hb = e.target.closest('[data-hab]'); if (hb) return T.rotinaMarca(hb.dataset.hab, e);
      const ir = e.target.closest('[data-ir]'); if (ir) return T.ir(ir.dataset.ir);
      const ag = e.target.closest('[data-tarefa]'); if (ag) return T.ir('tarefas');
      const agi = e.target.closest('[data-item]'); if (agi) return T.abrirItem(agi.dataset.item);
      if (T.cliqueTarefa(e)) return;
      T.cliqueCartao(e);
    };
    v.oncontextmenu = (e) => { const r = e.target.closest('[data-id]:not(.tarefa)'); if (r) T.menuItem(e, T.db.itens.find((i) => i.id === r.dataset.id)); };
  };
})();
