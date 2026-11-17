// Backpack — tarefas (com data escrita no texto) e calendário mensal com arrastar para remarcar.
(function () {
  const { esc, $, $$ } = T;
  const SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  // "pagar conta amanhã", "reunião sexta", "entregar dia 20", "revisar 25/11", "ligar em 3 dias"
  T.lerTarefa = (bruto) => {
    let texto = bruto.trim(), data = '';
    const hoje = T.hoje();
    const n = T.norm(texto);
    const regras = [
      [/\s+(?:para\s+|ate\s+)?depois de amanha$/, () => T.somarDias(hoje, 2)],
      [/\s+(?:para\s+|ate\s+)?amanha$/, () => T.somarDias(hoje, 1)],
      [/\s+(?:para\s+|ate\s+)?hoje$/, () => hoje],
      [/\s+(?:na\s+|no\s+)?semana que vem$/, () => T.somarDias(hoje, 7)],
      [/\s+em\s+(\d{1,3})\s+dias?$/, (m) => T.somarDias(hoje, +m[1])],
      [/\s+(?:na\s+|no\s+|ate\s+|para\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?$/, (m) => {
        const alvo = SEMANA.indexOf(m[1]), d = new Date(`${hoje}T12:00:00`).getDay();
        return T.somarDias(hoje, ((alvo - d + 7) % 7) || 7);
      }],
      [/\s+(?:dia\s+|em\s+|ate\s+|para\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/, (m) => {
        const ano = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : new Date().getFullYear();
        let s = `${ano}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
        if (Number.isNaN(Date.parse(s)) || +m[2] > 12 || +m[1] > 31) return '';
        if (!m[3] && s < hoje) s = `${ano + 1}${s.slice(4)}`;
        return s;
      }],
      [/\s+dia\s+(\d{1,2})$/, (m) => {
        const d = new Date(), dia = +m[1]; if (dia < 1 || dia > 31) return '';
        let alvo = new Date(d.getFullYear(), d.getMonth(), dia);
        if (T.ymd(alvo) < hoje) alvo = new Date(d.getFullYear(), d.getMonth() + 1, dia);
        return T.ymd(alvo);
      }],
    ];
    for (const [re, fn] of regras) {
      const m = re.exec(` ${n}`);
      if (!m) continue;
      const d = fn(m);
      if (!d) continue;
      data = d;
      texto = texto.slice(0, texto.length - (m[0].length - 1)).trim();
      break;
    }
    return { texto, data };
  };

  T.REPS = { '': 'Não repete', dia: 'Todo dia', uteis: 'Dias úteis', semana: 'Toda semana', mes: 'Todo mês' };
  // extra: { hora, rep, cliente }. Hora ou repetição sem data usam o dia de hoje.
  T.adicionarTarefa = (bruto, data, prio, extra = {}) => {
    const p = T.lerTarefa(bruto);
    if (!p.texto) return null;
    let d = p.data || data || '';
    if (!d && (extra.hora || extra.rep)) d = T.hoje();
    const t = { id: T.uid(), texto: p.texto, data: d, prio: prio || 'media', feita: false, feitaEm: null, xp: false, hora: extra.hora || '', rep: extra.rep || '', cliente: extra.cliente || '', criadoEm: T.agora() };
    T.db.tarefas.push(t); T.salvar(); T.som('pop');
    return t;
  };

  // próxima data de uma tarefa que repete
  T.proximaData = (data, rep) => {
    const base = data || T.hoje();
    if (rep === 'dia') return T.somarDias(base, 1);
    if (rep === 'semana') return T.somarDias(base, 7);
    if (rep === 'uteis') { let d = T.somarDias(base, 1); while ([0, 6].includes(new Date(`${d}T12:00:00`).getDay())) d = T.somarDias(d, 1); return d; }
    if (rep === 'mes') {
      const [a, m, dia] = base.split('-').map(Number);
      const ultimo = new Date(a, m + 1, 0).getDate();
      return T.ymd(new Date(a, m, Math.min(dia, ultimo)));
    }
    return '';
  };

  T.alternarTarefa = (t, ev) => {
    t.feita = !t.feita;
    t.feitaEm = t.feita ? T.agora() : null;
    if (t.feita) {
      const onde = ev ? { x: ev.clientX, y: ev.clientY } : null;
      if (!t.xp) { t.xp = true; T.ganhar('tarefa', onde); } else { T.som('feito'); T.salvar(); }
      T.confete(onde ? onde.x : null, onde ? onde.y : null, 30, 6);
      let prox = null;
      if (t.rep) {
        prox = { ...t, id: T.uid(), data: T.proximaData(t.data, t.rep), feita: false, feitaEm: null, xp: false, criadoEm: T.agora() };
        T.db.tarefas.push(prox); t.rep = ''; T.salvar();
      }
      T.toast(prox ? `Concluída. A próxima fica para ${T.fmtData(prox.data)}` : 'Tarefa concluída', () => {
        t.feita = false; t.feitaEm = null;
        if (prox) { t.rep = prox.rep; T.db.tarefas = T.db.tarefas.filter((x) => x.id !== prox.id); }
        T.salvar(); T.som('desfazer'); T.render();
      });
    } else { T.som('clique'); T.salvar(); }
    T.render();
  };

  T.tarefaHTML = (t) => {
    const atrasada = !t.feita && t.data && t.data < T.hoje();
    const quando = t.data ? (t.data === T.hoje() ? 'Hoje' : T.fmtData(t.data)) : 'sem data';
    return `<div class="tarefa ${t.feita ? 'feita' : ''}" data-id="${t.id}">
      <label class="caixa-check"><input type="checkbox" ${t.feita ? 'checked' : ''}><span></span></label>
      <span class="tarefa-txt" data-a="editar">${esc(t.texto)}</span>
      ${t.cliente && T.cliente(t.cliente) ? `<span class="pilula cli" data-a="editar" title="Cliente">${esc(T.cliente(t.cliente).nome)}</span>` : ''}
      ${t.rep ? `<span class="pilula rep" data-a="editar" title="${T.REPS[t.rep]}">${Icones.svg('atualizar', 12)} ${T.REPS[t.rep]}</span>` : ''}
      <span class="pilula data ${atrasada ? 'atrasada' : t.data === T.hoje() ? 'hoje' : ''}" data-a="editar" title="Mudar data">${Icones.svg('calendario', 12)} ${quando}${t.hora ? ` · ${t.hora}` : ''}</span>
      <span class="pilula prio ${t.prio}" data-a="prio" title="Clique para mudar a prioridade">${T.PRIO_NOME[t.prio]}</span>
      <button class="btn-x" data-a="rm" title="Mandar para a lixeira">${Icones.svg('x', 14)}</button></div>`;
  };

  // clique nas linhas de tarefa (serve para qualquer página que mostre tarefas)
  T.cliqueTarefa = (e) => {
    const row = e.target.closest('.tarefa'); if (!row) return false;
    const t = T.db.tarefas.find((x) => x.id === row.dataset.id); if (!t) return true;
    const a = (e.target.closest('[data-a]') || {}).dataset;
    if (e.target.type === 'checkbox') T.alternarTarefa(t, e);
    else if (a && a.a === 'rm') T.paraLixeira('tarefa', t);
    else if (a && a.a === 'prio') { t.prio = T.PRIOS[(T.PRIOS.indexOf(t.prio) + 1) % 3]; T.salvar(); T.som('clique'); T.render(); }
    else if (a && a.a === 'editar') editarTarefa(t);
    return true;
  };

  T.opcoesCliente = (sel) => `<option value="">— nenhum —</option>${(T.db.clientes || []).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt')).map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.nome || 'Sem nome')}</option>`).join('')}`;
  const optsRep = (sel) => Object.entries(T.REPS).map(([k, n]) => `<option value="${k}" ${k === (sel || '') ? 'selected' : ''}>${n}</option>`).join('');
  T.optsRep = optsRep;

  function editarTarefa(t, opt = {}) {
    const m = T.modal(`${T.cabecalho('Editar tarefa')}<div class="modal-corpo">
      <div class="linha com-mic"><input type="text" id="etTexto" value="${esc(t.texto)}" maxlength="1000">${T.micBtn ? T.micBtn('etTexto') : ''}</div>
      <div class="grade2"><label class="campo">Data<input type="date" id="etData" value="${t.data}"></label>
      <label class="campo">Lembrete ${T.dica('O Mac avisa nesse horário, no dia da tarefa, mesmo com o Backpack fechado.')}<input type="time" id="etHora" value="${t.hora || ''}"></label>
      <label class="campo">Prioridade<select id="etPrio">${T.PRIOS.map((p) => `<option value="${p}" ${p === t.prio ? 'selected' : ''}>${T.PRIO_NOME[p]}</option>`).join('')}</select></label>
      <label class="campo">Repetir ${T.dica('Ao concluir, a próxima é criada sozinha.')}<select id="etRep">${optsRep(t.rep)}</select></label>
      ${(T.db.clientes || []).length ? `<label class="campo">Cliente<select id="etCli">${T.opcoesCliente(t.cliente)}</select></label>` : ''}</div>
      <div class="linha entre"><button class="btn perigo" id="etLixo">${Icones.svg('lixeira', 15)} Lixeira</button><button class="btn" id="etOk">Salvar</button></div></div>`, { classe: 'pequeno', aoFechar: opt.aoFechar });
    $('#etTexto', m).focus();
    const ok = () => {
      t.texto = $('#etTexto', m).value.trim() || t.texto; t.data = $('#etData', m).value; t.prio = $('#etPrio', m).value;
      t.hora = $('#etHora', m).value; t.rep = $('#etRep', m).value;
      if ($('#etCli', m)) t.cliente = $('#etCli', m).value;
      if (!t.data && (t.hora || t.rep)) t.data = T.hoje();
      T.salvar(); T.fecharModal(); T.render();
    };
    $('#etOk', m).onclick = ok;
    $('#etTexto', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    $('#etLixo', m).onclick = () => { T.fecharModal(); T.paraLixeira('tarefa', t); };
  }
  T.editarTarefa = editarTarefa;

  // caixa de nova tarefa: campo + microfone + Adicionar; embaixo data, lembrete, prioridade, repetição e cliente
  T.caixaNovaTarefa = (pref = 't', extra = {}) => `<div class="tnova vidro-cartao">
      <div class="tnova-l1"><input type="text" id="${pref}Nova" placeholder="Nova tarefa… escreva “amanhã”, “sexta” ou “dia 20” no fim para marcar a data" autocomplete="off">
        ${T.micBtn ? T.micBtn(`${pref}Nova`) : ''}<button class="btn apagado" id="${pref}Add">${Icones.svg('mais', 15)} Adicionar</button></div>
      <div class="tnova-l2">
        <span class="tnova-data"><input type="date" id="${pref}Data" title="Data (opcional)" value="${extra.data || ''}"><button class="chip" data-dia="0">Hoje</button><button class="chip" data-dia="1">Amanhã</button></span>
        <label title="Lembrete com horário">${Icones.svg('alerta', 13)}<input type="time" id="${pref}Hr"></label>
        <select id="${pref}Prio" title="Prioridade"><option value="alta">Alta</option><option value="media" selected>Média</option><option value="baixa">Baixa</option></select>
        <select id="${pref}Rp" title="Repetir">${optsRep('')}</select>
        ${(T.db.clientes || []).length && !extra.cliente ? `<select id="${pref}Cli" title="Cliente">${T.opcoesCliente('')}</select>` : ''}
        ${T.dica('A data também pode ir no texto. Com lembrete, o Mac avisa no horário. Com repetição, ao concluir a próxima é criada sozinha.')}
      </div></div>`;
  T.ligarNovaTarefa = (pref = 't', extra = {}, depois) => {
    const i = $(`#${pref}Nova`), b = $(`#${pref}Add`);
    const pinta = () => b.classList.toggle('apagado', !i.value.trim());
    const add = () => {
      if (!i.value.trim()) return T.falta(i, 'Escreva a tarefa primeiro.');
      const cli = $(`#${pref}Cli`) ? $(`#${pref}Cli`).value : extra.cliente || '';
      const t = T.adicionarTarefa(i.value, $(`#${pref}Data`).value, $(`#${pref}Prio`).value, { hora: $(`#${pref}Hr`).value, rep: $(`#${pref}Rp`).value, cliente: cli });
      if (!t) return;
      if (depois) depois(t); else { T.render(); $(`#${pref}Nova`) && $(`#${pref}Nova`).focus(); }
    };
    i.oninput = pinta;
    b.onclick = add;
    i.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    T.$$(`[data-dia]`, i.closest('.tnova')).forEach((c) => { c.onclick = () => { $(`#${pref}Data`).value = T.somarDias(T.hoje(), +c.dataset.dia); T.som('clique'); }; });
  };

  // ---------- página Tarefas ----------
  T.paginas.tarefas = () => {
    const v = $('#vista'), hoje = T.hoje();
    const abertas = T.db.tarefas.filter((t) => !t.feita);
    const ordem = { alta: 0, media: 1, baixa: 2 };
    const srt = (a, b) => (a.data || '9').localeCompare(b.data || '9') || ordem[a.prio] - ordem[b.prio];
    const G = [
      ['atrasadas', 'Atrasadas', abertas.filter((t) => t.data && t.data < hoje).sort(srt)],
      ['hoje', 'Hoje', abertas.filter((t) => t.data === hoje).sort(srt)],
      ['proximas', 'Próximas', abertas.filter((t) => t.data > hoje).sort(srt)],
      ['sem', 'Sem data', abertas.filter((t) => !t.data).sort(srt)],
    ];
    const feitas = T.db.tarefas.filter((t) => t.feita).sort((a, b) => (b.feitaEm || '').localeCompare(a.feitaEm || '')).slice(0, 12);
    v.innerHTML = `<div class="pagina-cab"><div><h1>Tarefas ${T.botaoTutorial('tarefas')}</h1><p>${abertas.length} aberta${abertas.length === 1 ? '' : 's'}</p></div></div>
      ${T.caixaNovaTarefa('t')}
      <div class="tcols">${G.map(([k, n, L]) => (L.length ? `<section class="grupo-tarefas ${k} vidro-cartao"><h3>${n} <span class="conta">${L.length}</span></h3>${L.map(T.tarefaHTML).join('')}</section>` : '')).join('')}
      ${feitas.length ? `<section class="grupo-tarefas vidro-cartao"><h3>Concluídas recentemente</h3>${feitas.map(T.tarefaHTML).join('')}</section>` : ''}</div>
      ${!abertas.length ? T.vazio('tarefas', 'Nenhuma tarefa pendente', 'Escreva a próxima no campo acima.') : ''}`;
    T.ligarNovaTarefa('t');
    v.onclick = (e) => { T.cliqueTarefa(e); };
  };

  // ---------- página Calendário ----------
  T.paginas.calendario = () => {
    const u = T.ui; if (!u.calMes) { const n = new Date(); u.calMes = [n.getFullYear(), n.getMonth()]; }
    const [A, M] = u.calMes, primeiro = new Date(A, M, 1), inicio = new Date(A, M, 1 - primeiro.getDay());
    const titulo = primeiro.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const dias = [];
    for (let i = 0; i < 42; i++) { const d = new Date(inicio); d.setDate(inicio.getDate() + i); dias.push(d); }
    const hoje = T.hoje(), v = $('#vista');
    v.innerHTML = `<div class="pagina-cab"><div><h1>${titulo.charAt(0).toUpperCase() + titulo.slice(1)} ${T.botaoTutorial('calendario')}</h1><p>Clique num dia para criar uma tarefa. Arraste uma tarefa para outro dia para remarcar.</p></div>
      <div class="linha"><button class="btn-icone vidro-botao" id="calAnt" title="Mês anterior">${Icones.svg('esquerda', 18)}</button><button class="btn sec pequeno" id="calHoje">Hoje</button><button class="btn-icone vidro-botao" id="calProx" title="Próximo mês">${Icones.svg('direita', 18)}</button></div></div>
      <div class="cal-mes vidro-cartao">${['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => `<div class="cal-dds">${d}</div>`).join('')}${dias.map((d) => {
        const k = T.ymd(d);
        const ts = T.db.tarefas.filter((t) => t.data === k), its = T.db.itens.filter((i) => i.data === k);
        const rot = T.rotinaDia && k <= hoje ? T.rotinaDia(k) : null;
        const fins = (T.db.fin || []).filter((f) => f.data === k && !f.pago);
        return `<div class="cal-celula ${d.getMonth() !== M ? 'fora' : ''} ${k === hoje ? 'hoje' : ''}" data-d="${k}"><span class="cal-n">${d.getDate()}${rot && rot.total ? `<b class="cal-rot ${rot.feitos >= rot.total ? 'ok' : ''}" title="Rotina: ${rot.feitos} de ${rot.total} hábitos">🎯 ${rot.feitos}/${rot.total}</b>` : ''}</span>
          ${ts.map((t) => `<div class="cal-chip ${t.prio} ${t.feita ? 'feita' : ''}" draggable="true" data-t="${t.id}" title="${esc(t.texto)}">${t.hora ? `<b>${t.hora}</b> ` : ''}${esc(t.texto)}</div>`).join('')}
          ${fins.map((f) => `<div class="cal-chip fin ${f.tipo}" data-f="${f.id}" title="${esc(f.desc)} · ${T.brl(f.valor)}">${f.tipo === 'entrada' ? '+' : '−'} ${esc(f.desc || 'Lançamento')}</div>`).join('')}
          ${its.map((i) => `<div class="cal-chip item" style="--c:${T.tipo(i.tipo).cor}" data-i="${i.id}" title="${esc(i.titulo)}">${esc(i.titulo || 'Sem título')}</div>`).join('')}</div>`;
      }).join('')}</div>`;
    const ir = (n) => { const d = new Date(A, M + n, 1); u.calMes = [d.getFullYear(), d.getMonth()]; T.render(); };
    $('#calAnt').onclick = () => ir(-1); $('#calProx').onclick = () => ir(1);
    $('#calHoje').onclick = () => { u.calMes = null; T.render(); };
    let arrasto = null;
    v.onclick = (e) => {
      const chip = e.target.closest('.cal-chip');
      if (chip && chip.dataset.i) return T.abrirItem(chip.dataset.i);
      if (chip && chip.dataset.t) return editarTarefa(T.db.tarefas.find((x) => x.id === chip.dataset.t));
      if (chip && chip.dataset.f) return T.ir('financeiro');
      const dia = e.target.closest('.cal-celula'); if (dia) criarNoDia(dia.dataset.d);
    };
    v.ondragstart = (e) => { const c = e.target.closest('[data-t]'); if (c) { arrasto = c.dataset.t; e.dataTransfer.setData('text/x-backpack', arrasto); } };
    v.ondragover = (e) => { const d = e.target.closest('.cal-celula'); if (d && arrasto) { e.preventDefault(); $$('.cal-celula.sobre').forEach((x) => x.classList.remove('sobre')); d.classList.add('sobre'); } };
    v.ondrop = (e) => {
      const d = e.target.closest('.cal-celula'); if (!d || !arrasto) return;
      e.preventDefault(); e.stopPropagation();
      const t = T.db.tarefas.find((x) => x.id === arrasto); arrasto = null;
      if (t && t.data !== d.dataset.d) { t.data = d.dataset.d; T.salvar(); T.som('soltar'); T.toast(`Remarcada para ${T.fmtData(t.data)}`); }
      T.render();
    };
    v.ondragend = () => { arrasto = null; };
  };

  function criarNoDia(data) {
    const m = T.modal(`${T.cabecalho(`Nova tarefa · ${T.fmtData(data)}`)}<div class="modal-corpo">
      <input type="text" id="cdTexto" placeholder="O que precisa ser feito?">
      <div class="linha"><select id="cdPrio"><option value="alta">Alta</option><option value="media" selected>Média</option><option value="baixa">Baixa</option></select>
      <label class="linha" title="Lembrete com horário">${Icones.svg('alerta', 14)}<input type="time" id="cdHora"></label>
      <button class="btn" id="cdOk">${Icones.svg('mais', 15)} Criar</button></div></div>`, { classe: 'pequeno' });
    $('#cdTexto', m).focus();
    const ok = () => {
      if (!$('#cdTexto', m).value.trim()) return T.falta($('#cdTexto', m), 'Escreva a tarefa primeiro.');
      if (T.adicionarTarefa($('#cdTexto', m).value, data, $('#cdPrio', m).value, { hora: $('#cdHora', m).value })) { T.fecharModal(); T.render(); }
    };
    $('#cdOk', m).onclick = ok;
    $('#cdTexto', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
  }
})();
