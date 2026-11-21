// Backpack — Financeiro: fluxo de caixa do mês (entradas e saídas, recebido/pago e a receber/a pagar),
// contas que repetem, parcelas, ligação com clientes, calculadora de preço e planilha CSV.
// Regras adaptadas do MyLoot (MIT, Prestes Design). Dados em db.fin.
(function () {
  const { esc, $, $$ } = T;
  // Duas frentes (decisão do Jacques: designer que trabalha com IA, separando Empresa de Casa).
  // "cat" continua texto livre (lançamentos antigos mantêm o que já tinham); estas listas só alimentam
  // o <select> conforme a frente e o tipo escolhidos.
  T.FIN_CAT = {
    empresa: {
      entrada: ['Serviço de design', 'Projeto de IA / automação', 'Consultoria', 'Comissão / parceria', 'Rendimento', 'Outros'],
      saida: ['Ferramentas de IA', 'Assinaturas de design', 'Anúncios e marketing', 'Equipamentos', 'Impostos e taxas', 'Equipe e freelas', 'Pró-labore', 'Outros'],
    },
    casa: {
      entrada: ['Pró-labore recebido', 'Salário', 'Rendimento', 'Outros'],
      saida: ['Moradia', 'Contas (água, luz, internet)', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Outros'],
    },
  };
  T.FIN_NOME_FRENTE = { casa: 'Casa', empresa: 'Empresa' };
  T.FORMAS = ['PIX', 'Cartão', 'Boleto', 'Transferência', 'Dinheiro'];
  const fin = () => T.db.fin || (T.db.fin = []);
  const mesDe = (ymd) => ymd.slice(0, 7);
  const nomeMes = (ym) => { const s = new Date(`${ym}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
  const somaMes = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const diaNoMes = (ym, dia) => { const [y, m] = ym.split('-').map(Number); const fim = new Date(y, m, 0).getDate(); return `${ym}-${String(Math.min(dia, fim)).padStart(2, '0')}`; };
  let mes = null, filtro = '', frente = 'tudo'; // 'tudo' | 'casa' | 'empresa' | 'sc' (sem classificar)

  T.finResumo = (L) => {
    const r = { rec: 0, pag: 0, aRec: 0, aPag: 0 };
    L.forEach((f) => { if (f.tipo === 'entrada') { if (f.pago) r.rec += f.valor; else r.aRec += f.valor; } else if (f.pago) r.pag += f.valor; else r.aPag += f.valor; });
    r.saldo = r.rec - r.pag; r.prev = r.rec + r.aRec - r.pag - r.aPag;
    return r;
  };
  T.finHoje = () => { const h = T.hoje(); return fin().filter((f) => !f.pago && f.data <= h); };
  const naFrente = (f) => frente === 'tudo' || (frente === 'sc' ? !f.frente : f.frente === frente);

  T.paginas.financeiro = () => {
    if (!mes) mes = mesDe(T.hoje());
    const v = $('#vista'), hoje = T.hoje();
    const doMes = fin().filter((f) => mesDe(f.data) === mes && naFrente(f)).sort((a, b) => a.data.localeCompare(b.data) || (a.tipo === 'entrada' ? -1 : 1));
    const R = T.finResumo(doMes);
    const L = doMes.filter((f) => !filtro || (filtro === 'pend' ? !f.pago : f.tipo === filtro));
    const atras = fin().filter((f) => !f.pago && f.data < hoje && mesDe(f.data) < mes && naFrente(f));
    const semFrente = fin().filter((f) => !f.frente).length;
    const meses = Array.from({ length: 6 }, (_, i) => somaMes(mes, i - 5));
    const graf = meses.map((m) => { const x = T.finResumo(fin().filter((f) => mesDe(f.data) === m && naFrente(f))); return { m, e: x.rec + x.aRec, s: x.pag + x.aPag }; });
    const max = Math.max(1, ...graf.map((g) => Math.max(g.e, g.s)));
    const porCat = {};
    doMes.filter((f) => f.tipo === 'saida').forEach((f) => { porCat[f.cat || 'Outros'] = (porCat[f.cat || 'Outros'] || 0) + f.valor; });
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const totS = cats.reduce((s, c) => s + c[1], 0) || 1;
    const kpi = (rot, val, cls, dica) => `<article class="kpi"><header><span>${rot}${dica ? ` ${T.dica(dica)}` : ''}</span></header><strong class="${cls || ''}">${T.brl(val)}</strong></article>`;
    v.innerHTML = `<div class="pagina-cab"><div><h1>Financeiro ${T.botaoTutorial('financeiro')}</h1><p>O que entrou, o que saiu e o que ainda vai entrar ou sair.</p></div>
        <div class="linha"><button class="btn sec pequeno" id="fCalc">${Icones.svg('raio', 14)} Calcular preço</button><button class="btn sec pequeno" id="fCsv">${Icones.svg('baixar', 14)} Planilha (CSV)</button></div></div>
      <div class="seg fin-frentes" id="fFr">${[['tudo', 'Tudo'], ['empresa', 'Empresa'], ['casa', 'Casa'], ...(semFrente ? [['sc', `A classificar (${semFrente})`]] : [])].map(([k, n]) => `<button data-fr="${k}" class="${frente === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="fin-barra vidro-cartao"><button class="btn-icone vidro-botao" id="fp" title="Mês anterior">${Icones.svg('esquerda', 16)}</button><h3>${nomeMes(mes)}</h3><button class="btn-icone vidro-botao" id="fn" title="Próximo mês">${Icones.svg('direita', 16)}</button><button class="btn sec pequeno" id="fh">Hoje</button>
        <button class="btn pequeno fin-e" id="fAddE">${Icones.svg('mais', 14)} Entrada</button><button class="btn pequeno fin-s" id="fAddS">− Saída</button></div>
      ${atras.length ? `<div class="aviso vidro-cartao">${Icones.svg('alerta', 15)} ${atras.length} conta${atras.length > 1 ? 's' : ''} de meses anteriores ainda em aberto (${T.brl(atras.reduce((s, f) => s + (f.tipo === 'entrada' ? f.valor : -f.valor), 0))}). <a data-atras="1">ver</a></div>` : ''}
      <div class="kpis fin-kpis">${kpi('Recebido', R.rec, 'pos')}${kpi('Pago', R.pag, 'neg')}${kpi('Saldo do mês', R.saldo, R.saldo >= 0 ? 'pos' : 'neg', 'Recebido menos pago: só o que já aconteceu.')}
        ${kpi('A receber', R.aRec)}${kpi('A pagar', R.aPag)}${kpi('Previsão do mês', R.prev, R.prev >= 0 ? 'pos' : 'neg', 'Como o mês fecha se tudo o que está previsto for recebido e pago.')}</div>
      <div class="fin-grade">
        <section class="painel vidro-cartao"><h3>${Icones.svg('lista', 16)} Lançamentos <span class="seg pequeno" id="fF">${[['', 'Tudo'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['pend', 'Pendentes']].map(([k, n]) => `<button data-f="${k}" class="${filtro === k ? 'on' : ''}">${n}</button>`).join('')}</span></h3>
          ${L.length ? L.map((f) => {
            const cli = f.cliente ? T.cliente(f.cliente) : null, atrasada = !f.pago && f.data < hoje;
            return `<div class="fin-linha ${f.pago ? 'ok' : ''} ${atrasada ? 'atrasada' : ''}" data-f="${f.id}"><label class="caixa-check" title="${f.tipo === 'entrada' ? 'Recebido' : 'Pago'}"><input type="checkbox" ${f.pago ? 'checked' : ''}><span></span></label>
              <span class="fin-d">${f.data.slice(8)}/${f.data.slice(5, 7)}</span><span class="fin-x"><b>${esc(f.desc || (f.tipo === 'entrada' ? 'Entrada' : 'Saída'))}</b><small>${f.frente ? `${T.FIN_NOME_FRENTE[f.frente]} · ` : ''}${esc(f.cat || '')}${f.forma ? ` · ${esc(f.forma)}` : ''}${cli ? ` · ${esc(cli.nome)}` : ''}${f.parc ? ` · parcela ${esc(f.parc)}` : ''}${f.serie && !f.parc ? ' · todo mês' : ''}${atrasada ? ' · atrasado' : ''}</small></span>
              <span class="fin-v ${f.tipo === 'entrada' ? 'pos' : 'neg'}">${f.tipo === 'entrada' ? '+' : '−'} ${T.brl(f.valor)}</span></div>`;
          }).join('') : `<div class="vazio">${Icones.svg('dinheiro', 30)}<h3>Nada lançado em ${nomeMes(mes)}</h3><p>Lance o que entrou e o que saiu. Contas fixas podem repetir todo mês.</p></div>`}
        </section>
        <div class="fin-lado">
          <section class="painel vidro-cartao"><h3>${Icones.svg('tabela', 16)} Últimos 6 meses</h3><div class="fin-graf">${graf.map((g) => `<div class="fg" title="${nomeMes(g.m)}: entrou ${T.brl(g.e)} · saiu ${T.brl(g.s)}"><div class="fb"><i class="e" style="height:${(g.e / max) * 100}%"></i><i class="s" style="height:${(g.s / max) * 100}%"></i></div><small>${new Date(`${g.m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>`).join('')}</div>
            <div class="fin-leg"><span><i class="e"></i>Entradas</span><span><i class="s"></i>Saídas</span></div></section>
          <section class="painel vidro-cartao"><h3>${Icones.svg('alvo', 16)} Para onde foi o dinheiro</h3>${cats.length ? cats.map(([c, val]) => `<div class="missao"><span>${esc(c)}</span><div class="progresso neg"><i style="width:${(val / totS) * 100}%"></i></div><small>${T.brl(val)}</small></div>`).join('') : '<p class="suave">Sem saídas neste mês.</p>'}</section>
        </div>
      </div>`;
    const ir = (n) => { mes = somaMes(mes, n); T.som('clique'); T.render(); };
    $('#fp').onclick = () => ir(-1); $('#fn').onclick = () => ir(1); $('#fh').onclick = () => { mes = mesDe(T.hoje()); T.render(); };
    $('#fAddE').onclick = () => T.finEditar({ tipo: 'entrada', data: mes === mesDe(hoje) ? hoje : `${mes}-01` });
    $('#fAddS').onclick = () => T.finEditar({ tipo: 'saida', data: mes === mesDe(hoje) ? hoje : `${mes}-01` });
    $('#fCalc').onclick = () => T.calcPreco();
    $('#fCsv').onclick = csv;
    $('#fF').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filtro = b.dataset.f; T.som('clique'); T.render(); };
    $('#fFr').onclick = (e) => { const b = e.target.closest('[data-fr]'); if (!b) return; frente = b.dataset.fr; T.som('clique'); T.render(); };
    v.onclick = (e) => {
      if (e.target.closest('[data-atras]')) { const a = fin().filter((f) => !f.pago && f.data < hoje).sort((x, y) => x.data.localeCompare(y.data))[0]; if (a) { mes = mesDe(a.data); filtro = 'pend'; T.render(); } return; }
      const row = e.target.closest('.fin-linha'); if (!row) return;
      const f = fin().find((x) => x.id === row.dataset.f); if (!f) return;
      if (e.target.closest('.caixa-check')) { if (e.target.type === 'checkbox') T.finPago(f, e.target.checked); return; }
      T.finEditar(f);
    };
  };

  T.finPago = (f, on) => {
    f.pago = on; f.pagoEm = on ? T.hoje() : '';
    T.salvar(); T.som(on ? (f.tipo === 'entrada' ? 'moeda' : 'clique') : 'desfazer');
    if (on && f.tipo === 'entrada') T.confete(null, null, 24, 5);
    T.render();
  };

  T.finEditar = (o) => {
    const novo = !o.id;
    const f = novo ? { id: T.uid(), tipo: 'entrada', desc: '', valor: 0, data: T.hoje(), pago: false, pagoEm: '', cat: '', frente: ['casa', 'empresa'].includes(frente) ? frente : 'empresa', cliente: '', forma: '', serie: '', parc: '', obs: '', criadoEm: T.agora(), ...o } : o;
    const m = T.modal(`${T.cabecalho(novo ? 'Novo lançamento' : 'Editar lançamento')}<div class="modal-corpo">
      <div class="linha entre">
        <div class="seg fin-tipo" id="ft"><button data-t="entrada" class="${f.tipo === 'entrada' ? 'on' : ''}">+ Entrada</button><button data-t="saida" class="${f.tipo === 'saida' ? 'on' : ''}">− Saída</button></div>
        <div class="seg fin-tipo" id="ffr"><button data-fr="empresa" class="${f.frente === 'empresa' ? 'on' : ''}">Empresa</button><button data-fr="casa" class="${f.frente === 'casa' ? 'on' : ''}">Casa</button></div>
      </div>
      <div class="linha com-mic"><input type="text" id="fd" placeholder="Descrição (ex.: Mensalidade do cliente, Adobe, DAS do MEI)" value="${esc(f.desc)}" maxlength="300">${T.micBtn ? T.micBtn('fd') : ''}</div>
      <div class="grade2"><label class="campo">Valor (R$)<input type="text" id="fv" inputmode="decimal" placeholder="0,00" value="${f.valor ? String(f.valor.toFixed(2)).replace('.', ',') : ''}"></label>
        <label class="campo">${f.tipo === 'entrada' ? 'Data / vencimento' : 'Vencimento'}<input type="date" id="fdt" value="${f.data}"></label>
        <label class="campo">Categoria<select id="fc"></select></label><label class="campo">Forma<select id="ffo"><option value="">—</option>${T.FORMAS.map((x) => `<option ${x === f.forma ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        ${(T.db.clientes || []).length ? `<label class="campo">Cliente<select id="fcl">${T.opcoesCliente(f.cliente)}</select></label>` : ''}
        ${novo ? `<label class="campo">Repetir ${T.dica('Todo mês: cria os próximos 12 meses (mensalidades e contas fixas). Parcelado: coloque o valor total e ele divide em parcelas mensais.')}<select id="fr"><option value="">Não repete</option><option value="mes">Todo mês (12 meses)</option><option value="parc">Parcelado</option></select></label>
        <label class="campo" id="fnp" hidden>Número de parcelas<input type="number" id="fpn" min="2" max="48" value="3"></label>` : ''}</div>
      <div class="cfg-linha"><span>${f.tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}</span>${T.chave('fpg', f.pago)}</div>
      <textarea id="fo" rows="2" placeholder="Observação (opcional)">${esc(f.obs || '')}</textarea>
      <div class="linha ${novo ? 'fim' : 'entre'}">${novo ? '' : `<button class="btn perigo" id="fdel">${Icones.svg('lixeira', 15)} Apagar</button>`}<button class="btn" id="fok">Salvar</button></div></div>`, { classe: 'pequeno' });
    const cats = () => { $('#fc', m).innerHTML = T.FIN_CAT[f.frente || 'empresa'][f.tipo].map((c) => `<option ${c === f.cat ? 'selected' : ''}>${c}</option>`).join(''); };
    cats();
    $('#fd', m).focus();
    $('#ft', m).onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; f.tipo = b.dataset.t; $$('#ft button', m).forEach((x) => x.classList.toggle('on', x === b)); cats(); };
    $('#ffr', m).onclick = (e) => { const b = e.target.closest('[data-fr]'); if (!b) return; f.frente = b.dataset.fr; $$('#ffr button', m).forEach((x) => x.classList.toggle('on', x === b)); cats(); };
    if ($('#fr', m)) $('#fr', m).onchange = (e) => { $('#fnp', m).hidden = e.target.value !== 'parc'; };
    const ok = () => {
      const valor = T.lerValor($('#fv', m).value);
      if (!valor) return T.falta($('#fv', m), 'Coloque o valor primeiro.');
      Object.assign(f, { desc: $('#fd', m).value.trim(), valor, data: $('#fdt', m).value || T.hoje(), cat: $('#fc', m).value, frente: f.frente || 'empresa', forma: $('#ffo', m).value, pago: $('#fpg', m).checked, obs: $('#fo', m).value.trim() });
      f.pagoEm = f.pago ? (f.pagoEm || T.hoje()) : '';
      if ($('#fcl', m)) f.cliente = $('#fcl', m).value;
      if (novo) {
        const rep = $('#fr', m) ? $('#fr', m).value : '';
        const n = rep === 'mes' ? 12 : rep === 'parc' ? Math.max(2, Math.min(48, +$('#fpn', m).value || 2)) : 1;
        const serie = n > 1 ? T.uid() : '', dia = +f.data.slice(8), ym = mesDe(f.data);
        const total = f.valor, cada = rep === 'parc' ? Math.floor((total / n) * 100) / 100 : total;
        for (let i = 0; i < n; i++) {
          fin().push({ ...f, valor: rep === 'parc' && i === n - 1 ? Math.round((total - cada * (n - 1)) * 100) / 100 : cada, id: i ? T.uid() : f.id, serie, data: i ? diaNoMes(somaMes(ym, i), dia) : f.data, pago: i ? false : f.pago, pagoEm: i ? '' : f.pagoEm, parc: rep === 'parc' ? `${i + 1}/${n}` : '' });
        }
        if (n > 1) T.toast(rep === 'mes' ? 'Lançado nos próximos 12 meses' : `${n} parcelas de ${T.brl(cada)}`);
        T.ganhar('lancamento');
      }
      T.salvar(); T.som('pop'); T.fecharModal(); T.render();
    };
    $('#fok', m).onclick = ok; $('#fv', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    if ($('#fdel', m)) {
      $('#fdel', m).onclick = async () => {
        let alvo = [f];
        if (f.serie) {
          const futuros = fin().filter((x) => x.serie === f.serie && x.data >= f.data);
          if (futuros.length > 1 && await T.confirmar(`Apagar também os próximos ${futuros.length - 1} lançamentos desta série?`, 'Apagar todos os próximos')) alvo = futuros;
        }
        T.fecharModal();
        alvo.forEach((x) => T.paraLixeira('fin', x, true));
        T.som('lixo'); T.render();
        T.toast(`${alvo.length > 1 ? `${alvo.length} lançamentos foram` : 'Lançamento foi'} para a lixeira`, () => { alvo.forEach((x) => T.restaurar(x.id, true)); });
      };
    }
  };

  // calculadora de preço: valor da hora e do projeto
  T.calcPreco = () => {
    const c = { pro: 3000, custos: 500, imp: 6, res: 10, h: 6, d: 5, f: 4, horas: 10, ...(T.db.config.calc || {}) };
    const m = T.modal(`${T.cabecalho(`${Icones.svg('raio', 18)} Quanto cobrar`)}<div class="modal-corpo">
      <div class="grade2"><label class="campo">Quanto quer ganhar por mês (R$)<input type="text" inputmode="decimal" data-k="pro" value="${c.pro}"></label>
        <label class="campo">Custos fixos do trabalho (R$/mês) ${T.dica('Ferramentas, internet, luz, equipamento dividido por mês, contador…')}<input type="text" inputmode="decimal" data-k="custos" value="${c.custos}"></label></div>
      <div class="grade3"><label class="campo">Horas por dia<input type="number" data-k="h" value="${c.h}" min="1" max="16"></label><label class="campo">Dias por semana<input type="number" data-k="d" value="${c.d}" min="1" max="7"></label><label class="campo">Semanas de folga por ano<input type="number" data-k="f" value="${c.f}" min="0" max="20"></label></div>
      <div class="grade2"><label class="campo">Impostos e taxas (%) ${T.dica('Depende do seu regime. Confira com seu contador.')}<input type="number" data-k="imp" value="${c.imp}" min="0" max="60"></label><label class="campo">Reserva para imprevistos (%)<input type="number" data-k="res" value="${c.res}" min="0" max="100"></label></div>
      <div class="calc-res" id="cr"></div>
      <div class="grade2"><label class="campo">Horas estimadas de um projeto<input type="number" data-k="horas" value="${c.horas}" min="1"></label><div class="calc-proj" id="cp"></div></div>
      <small class="suave">Conte tudo: reuniões, criação, ajustes, mensagens e entrega.</small></div>`, { classe: 'pequeno' });
    const calc = () => {
      $$('[data-k]', m).forEach((i) => { c[i.dataset.k] = i.type === 'number' ? +i.value || 0 : T.lerValor(i.value); });
      T.db.config.calc = c; T.salvar();
      const horasMes = (c.h * c.d * Math.max(1, 52 - c.f)) / 12;
      const hora = (((c.pro + c.custos) / Math.max(1, horasMes)) / Math.max(0.05, 1 - c.imp / 100)) * (1 + c.res / 100);
      $('#cr', m).innerHTML = `<div><small>Você trabalha</small><b>${Math.round(horasMes)} h/mês</b></div><div><small>Sua hora vale</small><b class="pos">${T.brl(hora)}</b></div><div><small>Dia de trabalho</small><b>${T.brl(hora * c.h)}</b></div>`;
      $('#cp', m).innerHTML = `<small>Preço do projeto</small><b class="pos">${T.brl(hora * c.horas)}</b>`;
    };
    m.oninput = calc; calc();
  };

  function csv() {
    const L = fin().filter((f) => mesDe(f.data) === mes && naFrente(f)).sort((a, b) => a.data.localeCompare(b.data));
    const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const linhas = [['Data', 'Frente', 'Tipo', 'Descrição', 'Categoria', 'Cliente', 'Forma', 'Valor', 'Situação', 'Pago em', 'Parcela', 'Observação'].map(q).join(';')];
    L.forEach((f) => linhas.push([f.data.split('-').reverse().join('/'), f.frente ? T.FIN_NOME_FRENTE[f.frente] : '', f.tipo === 'entrada' ? 'Entrada' : 'Saída', f.desc, f.cat, f.cliente && T.cliente(f.cliente) ? T.cliente(f.cliente).nome : '', f.forma,
      (f.tipo === 'entrada' ? f.valor : -f.valor).toFixed(2).replace('.', ','), f.pago ? (f.tipo === 'entrada' ? 'Recebido' : 'Pago') : 'Pendente', f.pagoEm ? f.pagoEm.split('-').reverse().join('/') : '', f.parc, f.obs].map(q).join(';')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`﻿${linhas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }));
    a.download = `backpack-financeiro-${mes}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    T.toast('Planilha baixada');
  }

  T.finAchar = (id) => fin().find((x) => x.id === id);

  T.finDoCliente = (c) => {
    const L = fin().filter((f) => f.cliente === c.id);
    const rec = L.filter((f) => f.tipo === 'entrada' && f.pago).reduce((s, f) => s + f.valor, 0);
    const aRec = L.filter((f) => f.tipo === 'entrada' && !f.pago).reduce((s, f) => s + f.valor, 0);
    const prox = L.filter((f) => !f.pago).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 4);
    return `<div class="campo"><span>${Icones.svg('dinheiro', 14)} Financeiro do cliente</span>
      <div class="fin-mini"><div class="pos">${T.brl(rec)}<small>já recebido</small></div><div>${T.brl(aRec)}<small>a receber</small></div></div>
      ${prox.map((f) => `<div class="fin-linha mini ${f.data < T.hoje() ? 'atrasada' : ''}" data-f="${f.id}" title="Marcar como recebido ou apagar"><span class="fin-d">${f.data.slice(8)}/${f.data.slice(5, 7)}</span><span class="fin-x"><b>${esc(f.desc || 'Entrada')}</b></span><span class="fin-v ${f.tipo === 'entrada' ? 'pos' : 'neg'}">${T.brl(f.valor)}</span></div>`).join('')}
      <button class="btn sec pequeno" id="cFin">${Icones.svg('mais', 13)} Lançar recebimento</button></div>`;
  };
})();
