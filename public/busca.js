// Backpack — busca em tudo e comandos (Cmd+K ou /).
(function () {
  const { esc, $ } = T;

  T.abrirBusca = () => {
    const m = T.modal(`<div class="paleta"><div class="paleta-campo">${Icones.svg('busca', 18)}<input id="pq" type="text" placeholder="Buscar em tudo ou dar um comando…" autocomplete="off"><kbd>Esc</kbd></div><div class="paleta-res" id="pres"></div></div>`, { classe: 'paleta-modal' });
    const input = $('#pq', m), res = $('#pres', m);
    let lista = [], sel = 0;
    const destaque = (s, q) => {
      const t = esc(s); if (!q) return t;
      const i = T.norm(s).indexOf(q);
      return i < 0 ? t : `${esc(s.slice(0, i))}<mark>${esc(s.slice(i, i + q.length))}</mark>${esc(s.slice(i + q.length))}`;
    };
    const CMDS = [
      ['mais', 'Novo item', 'N', () => T.novoItemDialogo()],
      ['midia', 'Criar por voz', 'V', () => T.vozCriar()],
      ['alvo', 'Ir para Rotina', 'R', () => T.ir('rotina')],
      ['alvo', 'Novo hábito', '', () => { T.ir('rotina'); setTimeout(() => { const b = $('#hNovo'); if (b) b.click(); }, 50); }],
      ['pessoas', 'Ir para Clientes', '', () => T.ir('clientes')],
      ['pessoas', 'Novo cliente', '', () => { T.ir('clientes'); T.novoCliente(); }],
      ['dinheiro', 'Ir para Financeiro', '', () => T.ir('financeiro')],
      ['mais', 'Lançar entrada ou saída', '', () => { T.ir('financeiro'); T.finEditar({ tipo: 'saida' }); }],
      ['raio', 'Calcular preço (quanto cobrar)', '', () => T.calcPreco()],
      ['alerta', 'Reportar problema ou sugestão', '', () => T.reportar()],
      ['tarefas', 'Nova tarefa', '', () => { T.ir('tarefas'); setTimeout(() => { const i = $('#tNova'); if (i) i.focus(); }, 50); }],
      ['inicio', 'Ir para Início', 'H', () => T.ir('inicio')],
      ['biblioteca', 'Ir para Biblioteca', 'B', () => T.ir('biblioteca')],
      ['tarefas', 'Ir para Tarefas', 'T', () => T.ir('tarefas')],
      ['calendario', 'Ir para Calendário', 'C', () => T.ir('calendario')],
      ['mapa', 'Abrir o mapa de conexões', 'M', () => T.ir('mapa')],
      ['ferramentas', 'Ir para Ferramentas', '', () => T.ir('ferramentas')],
      ['trofeu', 'Ver Conquistas', '', () => T.ir('conquistas')],
      ['lixeira', 'Abrir a Lixeira', '', () => T.ir('lixeira')],
      ['engrenagem', 'Abrir Configurações', '', () => T.ir('config')],
      ['foco', 'Começar ou parar o foco', 'F', () => T.focoAlternar()],
      ['sol', 'Trocar vidro claro / escuro', '', () => { const c = T.db.config; c.tema = c.tema === 'escuro' ? 'claro' : 'escuro'; T.salvar(); T.aplicarConfig(); }],
      ['atualizar', 'Procurar atualização', '', () => T.checarAtualizacao(true)],
    ];
    function rodar() {
      const q = T.norm(input.value.trim());
      lista = CMDS.filter((c) => !q || T.norm(c[1]).includes(q)).map((c) => ({ tipo: 'cmd', c, nota: q ? 3 : 0 }));
      if (q) {
        T.db.itens.forEach((it) => {
          let onde = '';
          if (T.norm(it.titulo).includes(q)) onde = 'título';
          else if (T.norm(it.tags.join(' ')).includes(q)) onde = 'etiqueta';
          else if (T.norm(it.anexos.map((a) => a.nome).join(' ')).includes(q)) onde = 'anexo';
          else if (T.norm(`${it.descricao} ${it.texto} ${it.checklist.map((c) => c.t).join(' ')} ${it.links.map((l) => l.url + l.rotulo).join(' ')}`).includes(q)) onde = 'texto';
          if (onde) lista.push({ tipo: 'item', it, onde, nota: onde === 'título' ? 0 : 1 });
        });
        T.db.tarefas.forEach((t) => { if (T.norm(t.texto).includes(q)) lista.push({ tipo: 'tarefa', t, onde: 'tarefa', nota: 2 }); });
        (T.db.clientes || []).forEach((c) => { if (T.norm(`${c.nome} ${c.empresa} ${c.email} ${c.tags.join(' ')}`).includes(q)) lista.push({ tipo: 'cliente', c, nota: 1 }); });
        lista.sort((a, b) => a.nota - b.nota);
        lista = lista.slice(0, 40);
      }
      sel = 0; desenhar(q);
    }
    function desenhar(q) {
      if (!lista.length) { res.innerHTML = '<div class="paleta-vazio">Nada encontrado.</div>'; return; }
      res.innerHTML = (q ? '' : '<div class="paleta-sub">Comandos · digite para buscar em tudo</div>') + lista.map((r, i) => {
        const on = i === sel ? 'on' : '';
        if (r.tipo === 'cmd') return `<div class="paleta-r ${on}" data-i="${i}"><i>${Icones.svg(r.c[0], 16)}</i><span>${destaque(r.c[1], q)}</span>${r.c[2] ? `<kbd>${r.c[2]}</kbd>` : '<small>comando</small>'}</div>`;
        if (r.tipo === 'item') { const t = T.tipo(r.it.tipo); return `<div class="paleta-r ${on}" data-i="${i}"><i style="color:${t.cor}">${Icones.svg(r.it.tipo, 16)}</i><span>${destaque(r.it.titulo || 'Sem título', q)}</span><small>${r.onde}</small></div>`; }
        if (r.tipo === 'cliente') return `<div class="paleta-r ${on}" data-i="${i}"><i>${Icones.svg('pessoas', 16)}</i><span>${destaque(r.c.nome || 'Sem nome', q)}</span><small>cliente</small></div>`;
        return `<div class="paleta-r ${on}" data-i="${i}"><i>${Icones.svg(r.t.feita ? 'check' : 'tarefas', 16)}</i><span>${destaque(r.t.texto, q)}</span><small>tarefa</small></div>`;
      }).join('');
    }
    function ir(i) {
      const r = lista[i]; if (!r) return;
      T.fecharModal();
      if (r.tipo === 'cmd') r.c[3](); else if (r.tipo === 'item') T.abrirItem(r.it.id); else if (r.tipo === 'cliente') { T.ir('clientes'); T.abrirCliente(r.c.id); } else T.ir('tarefas');
    }
    input.oninput = rodar;
    input.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(lista.length - 1, sel + 1); desenhar(T.norm(input.value.trim())); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); desenhar(T.norm(input.value.trim())); e.preventDefault(); }
      else if (e.key === 'Enter') ir(sel);
      const on = $('.paleta-r.on', res); if (on) on.scrollIntoView({ block: 'nearest' });
    };
    res.onclick = (e) => { const r = e.target.closest('.paleta-r'); if (r) ir(+r.dataset.i); };
    rodar(); input.focus();
  };
})();
