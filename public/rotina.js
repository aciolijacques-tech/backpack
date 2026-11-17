// Backpack — Rotina: hábitos com sequência de dias, metas com progresso e o mapa do mês.
// Lógica adaptada do MyLoot (MIT, Prestes Design). Dados em db.habitos e db.metas.
(function () {
  const { esc, $, $$ } = T;
  const H = () => T.db.habitos || (T.db.habitos = []);
  const G = () => T.db.metas || (T.db.metas = []);

  let dia = ''; // dia na tela (vazio = hoje)
  const D = () => dia || T.hoje();
  const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const dow = (d) => new Date(`${d}T12:00:00`).getDay();
  const EM_HAB = ['💧', '🏃', '📚', '🧘', '🥗', '💪', '😴', '🧹', '✍️', '🎸', '💰', '📵', '🦷', '🚶', '☀️', '🙏', '🧠', '🎨', '📞', '🏄'];
  const EM_META = ['🎯', '💰', '👥', '📈', '🏋️', '📚', '✈️', '🏠', '🚗', '💻', '❤️', '🏆'];
  const UN_HAB = ['vez', 'min', 'h', 'copos', 'L', 'km', 'páginas'];
  const UN_META = ['R$', 'clientes', 'vendas', 'posts', 'kg', 'km', 'livros', 'vezes'];

  // ---------- contas ----------
  const alvo = (h) => Math.max(1, Number(h.alvo) || 1);
  const valor = (h, d) => Number((h.log || {})[d]) || 0;
  const feito = (h, d) => valor(h, d) >= alvo(h);
  const semanaDe = (d) => { const ini = T.somarDias(d, -dow(d)); return Array.from({ length: 7 }, (_, i) => T.somarDias(ini, i)); };
  const naSemana = (h, d) => semanaDe(d).filter((x) => feito(h, x)).length;
  // o hábito vale neste dia? (todo dia · dias escolhidos · X vezes por semana, em qualquer dia)
  const previsto = (h, d) => {
    if (h.criado && d < h.criado) return false;
    if (h.freq === 'semana') return (h.dias || []).includes(dow(d));
    if (h.freq === 'vezes') return feito(h, d) || naSemana(h, d) < (h.vezes || 1);
    return true;
  };
  // dias seguidos cumprindo (folga não quebra); em "X vezes por semana", semanas seguidas
  const sequencia = (h) => {
    const hoje = T.hoje();
    if (h.freq === 'vezes') {
      let n = 0, d = hoje;
      if (naSemana(h, d) < (h.vezes || 1)) d = T.somarDias(d, -7);
      for (let i = 0; i < 104; i++) { if (naSemana(h, d) >= (h.vezes || 1)) n++; else break; d = T.somarDias(d, -7); if (h.criado && semanaDe(d)[6] < h.criado) break; }
      return n;
    }
    let n = 0, d = hoje;
    if (!feito(h, d)) d = T.somarDias(d, -1);
    for (let i = 0; i < 730; i++) {
      if (h.criado && d < h.criado) break;
      if (h.freq === 'semana' && !(h.dias || []).includes(dow(d))) { d = T.somarDias(d, -1); continue; }
      if (!feito(h, d)) break;
      n++; d = T.somarDias(d, -1);
    }
    return n;
  };
  T.rotinaMaiorSeq = () => Math.max(0, ...H().filter((h) => h.freq !== 'vezes').map(sequencia));
  const freqNome = (h) => (h.freq === 'semana' ? ((h.dias || []).length === 7 ? 'Todo dia' : (h.dias || []).slice().sort().map((i) => DOW[i]).join(', '))
    : h.freq === 'vezes' ? `${h.vezes || 1}x por semana` : 'Todo dia');
  const doDia = (d) => H().filter((h) => previsto(h, d));
  T.rotinaDia = (d) => { const L = doDia(d); return { total: L.length, feitos: L.filter((h) => feito(h, d)).length }; };

  function marcar(h, d, modo, ev) {
    if (d > T.hoje()) return T.toast('Esse dia ainda não chegou. Dá para marcar hoje ou dias que já passaram.');
    const antes = feito(h, d), a = alvo(h), v = valor(h, d);
    const passo = a <= 12 ? 1 : a <= 60 ? 5 : 10;
    const novo = modo === 'mais' ? Math.min(a * 3, v + passo) : modo === 'menos' ? Math.max(0, v - passo) : (antes ? 0 : a);
    h.log = h.log || {};
    if (novo > 0) h.log[d] = novo; else delete h.log[d];
    if (feito(h, d) && !antes) {
      const at = ev ? { x: ev.clientX, y: ev.clientY } : null;
      if (d === T.hoje()) T.ganhar('habito', at); else T.som('check');
      T.confete(at ? at.x : null, at ? at.y : null, 22, 5);
      const r = T.rotinaDia(d), log = T.registroDoDia();
      if (d === T.hoje() && r.total > 1 && r.feitos === r.total && !log.rot) { log.rot = true; setTimeout(() => { T.som('meta'); T.chuva(); T.toast('Rotina de hoje completa!'); }, 500); }
    } else T.som('clique');
    T.salvar(); T.render();
  }
  T.rotinaMarca = (id, ev) => { const h = H().find((x) => x.id === id); if (h) marcar(h, T.hoje(), 'alterna', ev); };

  // ---------- pedaços de tela ----------
  const pontos = (h, d) => `<div class="hab-sem" title="Últimos 7 dias">${Array.from({ length: 7 }, (_, i) => T.somarDias(d, i - 6)).map((x) => {
    const ok = feito(h, x), pv = previsto(h, x) || ok;
    return `<i class="${ok ? 'ok' : !pv ? 'folga' : x < T.hoje() ? 'falhou' : ''} ${x === d ? 'hj' : ''}" title="${DOW[dow(x)]} ${x.slice(8)}/${x.slice(5, 7)}: ${ok ? 'feito' : !pv ? 'folga' : x < T.hoje() ? 'não feito' : 'em aberto'}"></i>`;
  }).join('')}</div>`;

  function habHTML(h, d, folga) {
    const ok = feito(h, d), a = alvo(h), v = valor(h, d), s = sequencia(h);
    return `<div class="hab ${ok ? 'ok' : ''} ${folga ? 'folga' : ''}" data-h="${h.id}">
      <button class="hab-chk" data-a="chk" title="${ok ? 'Desmarcar' : 'Marcar como feito'}" aria-label="${ok ? 'Desmarcar' : 'Marcar como feito'}: ${esc(h.nome)}">${ok ? Icones.svg('check', 16) : ''}</button>
      <span class="hab-em">${esc(h.em || '🎯')}</span>
      <div class="hab-tx"><b>${esc(h.nome)}</b><small>${folga ? (h.freq === 'vezes' ? 'semana já completa · ' : 'hoje não é dia · ') : ''}${freqNome(h)}${a > 1 ? ` · ${v} de ${a} ${esc(h.un || '')}` : ''}${h.hora ? ` · lembrete ${esc(h.hora)}` : ''}</small>
        ${a > 1 ? `<div class="progresso"><i style="width:${Math.min(100, (v / a) * 100)}%"></i></div>` : ''}</div>
      ${a > 1 ? `<button class="btn-icone vidro-botao" data-a="menos" title="Tirar um pouco">−</button><button class="btn-icone vidro-botao" data-a="mais" title="Somar um pouco">${Icones.svg('mais', 14)}</button>` : ''}
      ${pontos(h, d)}
      <span class="hab-seq ${s ? 'on' : ''}" title="${h.freq === 'vezes' ? 'Semanas seguidas batendo a meta' : 'Dias seguidos cumprindo'}">${Icones.svg('fogo', 14)} ${s}</span>
      <button class="btn-icone" data-a="ed" title="Editar hábito">${Icones.svg('editar', 15)}</button>
    </div>`;
  }
  const fmtMeta = (g, v) => (g.un === 'R$' ? T.brl(v) : `${(Number(v) || 0).toLocaleString('pt-BR')}${g.un ? ` ${g.un}` : ''}`);
  function metaHTML(g) {
    const pct = g.alvo > 0 ? Math.min(100, Math.round((g.atual / g.alvo) * 100)) : 0, hoje = T.hoje();
    const falta = g.prazo ? Math.round((new Date(`${g.prazo}T12:00:00`) - new Date(`${hoje}T12:00:00`)) / 864e5) : null;
    const prazo = g.prazo ? ` · até ${T.fmtData(g.prazo)}${pct >= 100 ? '' : falta < 0 ? ' (prazo passou)' : falta === 0 ? ' (é hoje)' : ` (faltam ${falta} dia${falta === 1 ? '' : 's'})`}` : '';
    return `<div class="meta-c ${pct >= 100 ? 'ok' : ''} ${g.prazo && falta < 0 && pct < 100 ? 'atrasada' : ''}" data-g="${g.id}">
      <div class="meta-topo"><span class="hab-em">${esc(g.em || '🎯')}</span><div class="hab-tx"><b>${esc(g.nome)}</b><small>${esc(fmtMeta(g, g.atual))} de ${esc(fmtMeta(g, g.alvo))}${prazo}</small></div>
        <b class="meta-pct">${pct}%</b><button class="btn-icone" data-a="ged" title="Editar meta">${Icones.svg('editar', 15)}</button></div>
      <div class="progresso"><i style="width:${pct}%"></i></div>
      <div class="meta-add"><input type="text" inputmode="decimal" id="gIn-${g.id}" placeholder="Quanto você avançou?" aria-label="Valor para somar na meta ${esc(g.nome)}"><button class="btn pequeno" data-a="soma">${Icones.svg('mais', 13)} Somar</button>${(g.hist || []).length ? `<button class="btn sec pequeno" data-a="tira" title="Tira o último valor somado">${Icones.svg('desfazer', 13)} Desfazer</button>` : ''}</div>
    </div>`;
  }
  function mesHTML(d) {
    const [Y, Mo] = d.split('-').map(Number), prim = new Date(Y, Mo - 1, 1), n = new Date(Y, Mo, 0).getDate(), hoje = T.hoje();
    const cel = [];
    for (let i = 0; i < prim.getDay(); i++) cel.push('<i class="vz"></i>');
    for (let k = 1; k <= n; k++) {
      const x = `${Y}-${String(Mo).padStart(2, '0')}-${String(k).padStart(2, '0')}`, r = T.rotinaDia(x), fut = x > hoje;
      const nv = fut || !r.total ? '' : `n${r.feitos === 0 ? 0 : Math.max(1, Math.round((r.feitos / r.total) * 4))}`;
      cel.push(`<button class="${nv} ${x === d ? 'sel' : ''} ${x === hoje ? 'hj' : ''}" data-d="${x}" ${fut ? 'disabled' : ''} title="${k}/${Mo}: ${fut ? 'ainda não chegou' : r.total ? `${r.feitos} de ${r.total} hábito${r.total > 1 ? 's' : ''}` : 'sem hábitos'}">${k}</button>`);
    }
    return `<div class="rot-cal">${DOW.map((x) => `<span>${x}</span>`).join('')}${cel.join('')}</div>
      <div class="rot-leg"><i class="n0"></i> nada <i class="n1"></i><i class="n2"></i><i class="n3"></i><i class="n4"></i> tudo feito</div>`;
  }

  // ---------- página ----------
  T.paginas.rotina = () => {
    const v = $('#vista'), d = D(), hoje = T.hoje();
    const todos = H(), L = todos.filter((h) => previsto(h, d)), folga = todos.filter((h) => !previsto(h, d) && !(h.criado && d < h.criado));
    const ok = L.filter((h) => feito(h, d)).length;
    const nomeDia = d === hoje ? 'Hoje' : d === T.somarDias(hoje, -1) ? 'Ontem' : DOW[dow(d)];
    const dataLonga = new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    v.innerHTML = `<div class="pagina-cab"><div><h1>Rotina ${T.botaoTutorial('rotina')}</h1><p>Hábitos para repetir e metas para alcançar.</p></div>
        <div class="linha"><button class="btn" id="hNovo">${Icones.svg('mais', 15)} Novo hábito</button><button class="btn sec" id="gNovo">${Icones.svg('alvo', 15)} Nova meta</button></div></div>
      <div class="rot-nav vidro-cartao"><button class="btn-icone vidro-botao" id="rP" title="Dia anterior">${Icones.svg('esquerda', 16)}</button>
        <h3><b>${nomeDia}</b> <small>${dataLonga}</small></h3>
        <button class="btn-icone vidro-botao" id="rN" title="Dia seguinte" ${d >= hoje ? 'disabled' : ''}>${Icones.svg('direita', 16)}</button>
        ${d !== hoje ? '<button class="btn sec pequeno" id="rH">Voltar para hoje</button>' : ''}${T.dica('Esqueceu de marcar ontem? Volte o dia com as setas e marque. Dias que ainda não chegaram ficam travados.')}</div>
      <div class="rot-grade">
        <section class="painel vidro-cartao rot-hab"><h3>${Icones.svg('atualizar', 16)} Hábitos ${L.length ? `<span class="conta">${ok} de ${L.length}</span>` : ''} ${T.dica('Clique no círculo quando fizer. O fogo mostra há quantos dias seguidos você cumpre; as bolinhas são os últimos 7 dias.')}</h3>
          ${L.map((h) => habHTML(h, d)).join('')}${folga.map((h) => habHTML(h, d, true)).join('')}
          ${todos.length && !L.length && !folga.length ? '<p class="suave">Nenhum hábito tinha sido criado até este dia.</p>' : ''}
          ${!todos.length ? `<div class="vazio">${Icones.svg('alvo', 30)}<h3>Nenhum hábito ainda</h3><p>Comece com um só. Exemplos para criar com um clique:</p>
            <div class="linha centro">${[['💧', 'Beber água', 8, 'copos'], ['📚', 'Ler', 10, 'páginas'], ['🏃', 'Treinar', 1, 'vez'], ['🧘', 'Meditar', 10, 'min']].map(([e, n, a, u]) => `<button class="chip" data-ex="${e}|${n}|${a}|${u}">${e} ${n}</button>`).join('')}</div></div>` : ''}</section>
        <section class="painel vidro-cartao rot-metas"><h3>${Icones.svg('alvo', 16)} Metas ${T.dica('Um número para alcançar até uma data: faturar 10 mil, fechar 5 clientes, ler 12 livros. Vá somando o que avançou.')}</h3>
          ${G().map(metaHTML).join('') || `<div class="vazio">${Icones.svg('trofeu', 30)}<h3>Nenhuma meta ainda</h3><p>Crie uma meta com número e prazo e vá somando o progresso.</p></div>`}</section>
        <section class="painel vidro-cartao rot-mes"><h3>${Icones.svg('calendario', 16)} ${new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} ${T.dica('Cada quadrado é um dia. Quanto mais forte a cor, mais hábitos cumpridos. Clique num dia para ver e marcar.')}</h3>${mesHTML(d)}</section>
      </div>`;
    const ir = (x) => { dia = x >= hoje ? '' : x; T.som('clique'); T.render(); };
    $('#rP').onclick = () => ir(T.somarDias(d, -1));
    $('#rN').onclick = () => ir(T.somarDias(d, 1));
    if ($('#rH')) $('#rH').onclick = () => ir(hoje);
    $('#hNovo').onclick = () => editarHabito();
    $('#gNovo').onclick = () => editarMeta();
    v.onclick = (e) => {
      const ex = e.target.closest('[data-ex]');
      if (ex) { const [em, nome, a, un] = ex.dataset.ex.split('|'); return editarHabito(null, { em, nome, alvo: +a, un }); }
      const cd = e.target.closest('.rot-cal [data-d]'); if (cd) return ir(cd.dataset.d);
      const a = (e.target.closest('[data-a]') || {}).dataset; if (!a || !a.a) return;
      const hr = e.target.closest('.hab');
      if (hr) {
        const h = H().find((x) => x.id === hr.dataset.h); if (!h) return;
        if (a.a === 'ed') return editarHabito(h);
        if (hr.classList.contains('folga') && a.a === 'chk' && h.freq !== 'vezes') return T.toast('Hoje não é dia desse hábito. Para mudar os dias, clique em editar.');
        return marcar(h, d, a.a === 'chk' ? 'alterna' : a.a, e);
      }
      const gr = e.target.closest('.meta-c'); if (!gr) return;
      const g = G().find((x) => x.id === gr.dataset.g); if (!g) return;
      if (a.a === 'ged') return editarMeta(g);
      if (a.a === 'soma') return somar(g, $(`#gIn-${g.id}`), e);
      if (a.a === 'tira') {
        const u = (g.hist || []).pop(); if (!u) return;
        g.atual = Math.max(0, Math.round((g.atual - u.v) * 100) / 100); if (g.atual < g.alvo) g.feitoEm = '';
        T.salvar(); T.som('desfazer'); T.render(); T.toast(`Tirei ${fmtMeta(g, u.v)}`);
      }
    };
    v.onkeydown = (e) => { if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('gIn-')) { const g = G().find((x) => `gIn-${x.id}` === e.target.id); if (g) somar(g, e.target, e); } };
  };

  function somar(g, campo, ev) {
    const n = T.lerValor(campo.value);
    if (!n) return T.falta(campo, 'Escreva quanto você avançou (ex.: 500).');
    const antes = g.atual >= g.alvo;
    g.atual = Math.round((g.atual + n) * 100) / 100; (g.hist = g.hist || []).push({ d: T.hoje(), v: n });
    if (!antes && g.atual >= g.alvo) {
      g.feitoEm = T.hoje(); T.ganhar('meta', ev ? { x: ev.clientX, y: ev.clientY } : null);
      setTimeout(() => { T.som('meta'); T.chuva(); T.confete(null, null, 120, 12); T.toast(`Meta batida: ${g.nome}!`); }, 250);
    } else { T.som('moeda'); T.toast(`+ ${fmtMeta(g, n)} na meta`); }
    T.salvar(); T.render();
  }

  // ---------- janelas ----------
  const escolheEmoji = (L, atual) => `<div class="em-grade" id="emG">${L.map((e) => `<button type="button" class="${e === atual ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>`;
  const ligarEmoji = (m, o) => { $('#emG', m).onclick = (e) => { const b = e.target.closest('[data-e]'); if (!b) return; o.em = b.dataset.e; $$('#emG button', m).forEach((x) => x.classList.toggle('on', x === b)); T.som('clique'); }; };

  function editarHabito(h, pre) {
    const novo = !h;
    const o = { em: '💧', nome: '', freq: 'dia', dias: [1, 2, 3, 4, 5], vezes: 3, alvo: 1, un: 'vez', hora: '', ...(pre || {}), ...(h ? JSON.parse(JSON.stringify(h)) : {}) };
    const m = T.modal(`${T.cabecalho(novo ? 'Novo hábito' : 'Editar hábito')}<div class="modal-corpo">
      <div class="campo"><span>Ícone</span>${escolheEmoji(EM_HAB.includes(o.em) ? EM_HAB : [o.em, ...EM_HAB], o.em)}</div>
      <label class="campo">Nome do hábito<div class="linha com-mic"><input type="text" id="hNome" placeholder="Ex.: Beber água, Ler, Treinar" value="${esc(o.nome)}" maxlength="200">${T.micBtn ? T.micBtn('hNome') : ''}</div></label>
      <div class="campo"><span>Com que frequência? ${T.dica('Todo dia: vale sempre. Dias da semana: só nos dias escolhidos (os outros são folga e não quebram a sequência). X vezes por semana: em qualquer dia, até completar o número.')}</span>
        <div class="seg" id="hFreq"><button data-f="dia" class="${o.freq === 'dia' ? 'on' : ''}">Todo dia</button><button data-f="semana" class="${o.freq === 'semana' ? 'on' : ''}">Dias da semana</button><button data-f="vezes" class="${o.freq === 'vezes' ? 'on' : ''}">X vezes por semana</button></div>
        <div class="linha" id="hDias" ${o.freq === 'semana' ? '' : 'hidden'}>${DOW.map((n, i) => `<button type="button" class="chip ${o.dias.includes(i) ? 'on' : ''}" data-i="${i}">${n}</button>`).join('')}</div>
        <div class="linha" id="hVz" ${o.freq === 'vezes' ? '' : 'hidden'}><input type="number" id="hVezes" min="1" max="7" value="${o.vezes}" class="curto"><span>vezes por semana</span></div></div>
      <div class="grade2">
        <div class="campo"><span>Quanto por dia? ${T.dica('Para “fiz ou não fiz”, deixe 1 vez. Para contar (8 copos, 30 minutos), coloque o número e a unidade: aparecem − e + para ir somando.')}</span>
          <div class="linha"><input type="number" id="hAlvo" min="1" max="999" value="${alvo(o)}" class="curto"><select id="hUn">${(UN_HAB.includes(o.un) ? UN_HAB : [o.un, ...UN_HAB]).map((u) => `<option ${u === o.un ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div></div>
        <label class="campo">Lembrete ${T.dica('Opcional. No horário, o Mac avisa se o hábito do dia ainda não foi marcado.')}<input type="time" id="hHora" value="${esc(o.hora || '')}"></label>
      </div>
      <div class="linha ${novo ? 'fim' : 'entre'}">${novo ? '' : `<button class="btn perigo" id="hDel">${Icones.svg('lixeira', 15)} Apagar</button>`}<button class="btn" id="hOk">${Icones.svg('check', 15)} Salvar hábito</button></div></div>`, { classe: 'pequeno' });
    ligarEmoji(m, o);
    $('#hFreq', m).onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; o.freq = b.dataset.f; $$('#hFreq button', m).forEach((x) => x.classList.toggle('on', x === b)); $('#hDias', m).hidden = o.freq !== 'semana'; $('#hVz', m).hidden = o.freq !== 'vezes'; T.som('clique'); };
    $('#hDias', m).onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i; o.dias = o.dias.includes(i) ? o.dias.filter((x) => x !== i) : [...o.dias, i]; b.classList.toggle('on', o.dias.includes(i)); T.som('clique'); };
    const ok = () => {
      o.nome = $('#hNome', m).value.trim();
      if (!o.nome) return T.falta($('#hNome', m), 'Dê um nome ao hábito.');
      if (o.freq === 'semana' && !o.dias.length) return T.toast('Escolha pelo menos um dia da semana.');
      o.vezes = Math.max(1, Math.min(7, +$('#hVezes', m).value || 1));
      o.alvo = Math.max(1, Math.min(999, Math.round(+$('#hAlvo', m).value || 1))); o.un = $('#hUn', m).value; o.hora = $('#hHora', m).value;
      if (novo) H().push({ id: T.uid(), criado: T.hoje(), log: {}, ...o }); else Object.assign(h, o, { log: h.log || {} });
      T.salvar(); T.som('pop'); T.fecharModal(); T.render(); T.toast(novo ? 'Hábito criado. Marque quando fizer!' : 'Hábito salvo');
    };
    $('#hOk', m).onclick = ok; $('#hNome', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    if ($('#hDel', m)) {
      $('#hDel', m).onclick = () => {
        const i = H().indexOf(h); T.db.habitos = H().filter((x) => x !== h); T.salvar(); T.som('lixo'); T.fecharModal(); T.render();
        T.toast('Hábito apagado', () => { H().splice(Math.max(0, i), 0, h); T.salvar(); T.render(); });
      };
    }
    if (novo && !o.nome) $('#hNome', m).focus();
  }

  function editarMeta(g) {
    const novo = !g;
    const o = { em: '🎯', nome: '', alvo: 0, atual: 0, un: 'R$', prazo: '', ...(g ? JSON.parse(JSON.stringify(g)) : {}) };
    const num = (v) => (v ? String(v).replace('.', ',') : '');
    const m = T.modal(`${T.cabecalho(novo ? 'Nova meta' : 'Editar meta')}<div class="modal-corpo">
      <div class="campo"><span>Ícone</span>${escolheEmoji(EM_META.includes(o.em) ? EM_META : [o.em, ...EM_META], o.em)}</div>
      <label class="campo">O que você quer alcançar?<div class="linha com-mic"><input type="text" id="gNome" placeholder="Ex.: Faturar 10 mil em dezembro" value="${esc(o.nome)}" maxlength="200">${T.micBtn ? T.micBtn('gNome') : ''}</div></label>
      <div class="grade2">
        <label class="campo">Número da meta ${T.dica('O total que você quer alcançar. Ex.: 10000 (reais), 5 (clientes), 12 (livros).')}<input type="text" inputmode="decimal" id="gAlvo" placeholder="10000" value="${num(o.alvo)}"></label>
        <label class="campo">Em quê?<input type="text" id="gUn" list="gUnL" value="${esc(o.un)}" placeholder="R$"><datalist id="gUnL">${UN_META.map((u) => `<option value="${u}">`).join('')}</datalist></label>
        <label class="campo">Quanto já tem<input type="text" inputmode="decimal" id="gAtual" placeholder="0" value="${num(o.atual)}"></label>
        <label class="campo">Prazo<input type="date" id="gPrazo" value="${esc(o.prazo || '')}"></label>
      </div>
      <div class="linha ${novo ? 'fim' : 'entre'}">${novo ? '' : `<button class="btn perigo" id="gDel">${Icones.svg('lixeira', 15)} Apagar</button>`}<button class="btn" id="gOk">${Icones.svg('check', 15)} Salvar meta</button></div></div>`, { classe: 'pequeno' });
    ligarEmoji(m, o);
    const ok = () => {
      o.nome = $('#gNome', m).value.trim();
      if (!o.nome) return T.falta($('#gNome', m), 'Escreva o que você quer alcançar.');
      o.alvo = T.lerValor($('#gAlvo', m).value);
      if (!(o.alvo > 0)) return T.falta($('#gAlvo', m), 'Coloque o número da meta (ex.: 10000).');
      o.atual = Math.max(0, T.lerValor($('#gAtual', m).value)); o.un = $('#gUn', m).value.trim(); o.prazo = $('#gPrazo', m).value;
      o.feitoEm = o.atual >= o.alvo ? (o.feitoEm || T.hoje()) : '';
      if (novo) G().push({ id: T.uid(), criadoEm: T.agora(), hist: [], ...o }); else Object.assign(g, o, { hist: g.hist || [] });
      T.salvar(); T.som('pop'); T.fecharModal(); T.render(); T.toast(novo ? 'Meta criada. Vá somando o que avançar!' : 'Meta salva');
    };
    $('#gOk', m).onclick = ok; $('#gNome', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    if ($('#gDel', m)) {
      $('#gDel', m).onclick = () => {
        const i = G().indexOf(g); T.db.metas = G().filter((x) => x !== g); T.salvar(); T.som('lixo'); T.fecharModal(); T.render();
        T.toast('Meta apagada', () => { G().splice(Math.max(0, i), 0, g); T.salvar(); T.render(); });
      };
    }
    if (novo) $('#gNome', m).focus();
  }

  // Início: rotina de hoje em botões
  T.rotinaHojeHTML = () => {
    const d = T.hoje(), L = doDia(d);
    if (!L.length) return '';
    const ok = L.filter((h) => feito(h, d)).length;
    return `<h3>${Icones.svg('alvo', 16)} Rotina de hoje <span class="conta">${ok} de ${L.length}</span> <a data-ir="rotina">abrir</a></h3>
      <div class="rot-mini">${L.map((h) => `<button class="hab-mini ${feito(h, d) ? 'ok' : ''}" data-hab="${h.id}" title="${feito(h, d) ? 'Feito. Clique para desmarcar.' : 'Clique para marcar como feito'}">${esc(h.em || '🎯')} ${esc(h.nome)}</button>`).join('')}</div>`;
  };
})();
