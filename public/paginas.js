// Backpack — páginas: Ferramentas, Conquistas, Lixeira e Configurações.
(function () {
  const { esc, $, $$ } = T;

  // ---------- Ferramentas ----------
  // Lista curta de ferramentas conhecidas, com o site oficial. Sem preços: eles mudam; confira no site.
  const GRUPOS = [
    { id: 'ia', nome: 'Assistentes de IA', icone: 'ia', cor: '#a46bff' },
    { id: 'criacao', nome: 'Imagem e design', icone: 'imagem', cor: '#ff5a7a' },
    { id: 'video', nome: 'Vídeo e áudio', icone: 'midia', cor: '#4f8cff' },
    { id: 'org', nome: 'Organização e notas', icone: 'instrucao', cor: '#2fbf8f' },
  ];
  const FERRAMENTAS = [
    { g: 'ia', n: 'Claude', p: 'Assistente de IA da Anthropic para escrever, analisar e programar.', u: 'https://claude.ai' },
    { g: 'ia', n: 'ChatGPT', p: 'Assistente de IA da OpenAI.', u: 'https://chatgpt.com' },
    { g: 'ia', n: 'Gemini', p: 'Assistente de IA do Google.', u: 'https://gemini.google.com' },
    { g: 'ia', n: 'NotebookLM', p: 'Do Google: conversa com os seus próprios documentos e gera resumos.', u: 'https://notebooklm.google.com' },
    { g: 'ia', n: 'Perplexity', p: 'Busca com IA que mostra as fontes.', u: 'https://www.perplexity.ai' },
    { g: 'ia', n: 'Ollama', p: 'Roda modelos de IA abertos no seu próprio computador.', u: 'https://ollama.com', aberto: true },
    { g: 'criacao', n: 'Figma', p: 'Design de interfaces e protótipos, colaborativo.', u: 'https://www.figma.com' },
    { g: 'criacao', n: 'Penpot', p: 'Design e protótipos, alternativa de código aberto ao Figma.', u: 'https://penpot.app', aberto: true },
    { g: 'criacao', n: 'Canva', p: 'Peças rápidas para redes sociais e apresentações.', u: 'https://www.canva.com' },
    { g: 'criacao', n: 'Adobe Firefly', p: 'Geração e edição de imagem com IA da Adobe.', u: 'https://firefly.adobe.com' },
    { g: 'criacao', n: 'Midjourney', p: 'Geração de imagens artísticas com IA.', u: 'https://www.midjourney.com' },
    { g: 'criacao', n: 'Blender', p: '3D, animação e render.', u: 'https://www.blender.org', aberto: true },
    { g: 'criacao', n: 'Krita', p: 'Pintura digital e ilustração.', u: 'https://krita.org', aberto: true },
    { g: 'criacao', n: 'GIMP', p: 'Edição de imagem.', u: 'https://www.gimp.org', aberto: true },
    { g: 'criacao', n: 'Inkscape', p: 'Desenho vetorial.', u: 'https://inkscape.org', aberto: true },
    { g: 'video', n: 'DaVinci Resolve', p: 'Edição, cor e áudio de vídeo; tem versão gratuita.', u: 'https://www.blackmagicdesign.com/products/davinciresolve' },
    { g: 'video', n: 'OBS Studio', p: 'Gravação de tela e transmissão ao vivo.', u: 'https://obsproject.com', aberto: true },
    { g: 'video', n: 'HandBrake', p: 'Converte e comprime vídeos.', u: 'https://handbrake.fr', aberto: true },
    { g: 'video', n: 'Audacity', p: 'Gravação e edição de áudio.', u: 'https://www.audacityteam.org', aberto: true },
    { g: 'video', n: 'Runway', p: 'Geração e edição de vídeo com IA.', u: 'https://runwayml.com' },
    { g: 'video', n: 'ElevenLabs', p: 'Vozes e narração com IA.', u: 'https://elevenlabs.io' },
    { g: 'org', n: 'Obsidian', p: 'Notas em Markdown ligadas entre si (segundo cérebro).', u: 'https://obsidian.md' },
    { g: 'org', n: 'Logseq', p: 'Notas em tópicos e diário, ligadas entre si.', u: 'https://logseq.com', aberto: true },
    { g: 'org', n: 'AppFlowy', p: 'Espaço de trabalho no estilo Notion, de código aberto.', u: 'https://appflowy.io', aberto: true },
    { g: 'org', n: 'Excalidraw', p: 'Quadro branco com desenho à mão.', u: 'https://excalidraw.com', aberto: true },
    { g: 'org', n: 'Zotero', p: 'Organiza referências, PDFs e citações.', u: 'https://www.zotero.org', aberto: true },
    { g: 'org', n: 'Raycast', p: 'Lançador para Mac: atalhos, comandos e extensões.', u: 'https://www.raycast.com' },
    { g: 'org', n: 'Visual Studio Code', p: 'Editor de código.', u: 'https://code.visualstudio.com' },
  ];
  GRUPOS.push({ id: 'outras', nome: 'Outras', icone: 'ferramentas', cor: '#8b8e96' });
  let filtroGrupo = '', buscaF = '';
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return u; } };
  // lista = as ferramentas que a pessoa cadastrou (primeiro) + a lista que vem com o app
  const todas = () => [
    ...(T.db.ferramentas || []).map((f) => ({ g: f.grupo, n: f.nome, p: f.descricao, u: f.url, minha: f.id })),
    ...FERRAMENTAS,
  ];

  function editarFerramenta(f) {
    const nova = !f;
    f = f || { nome: '', url: '', descricao: '', grupo: filtroGrupo && filtroGrupo !== 'aberto' && filtroGrupo !== 'minhas' ? filtroGrupo : 'ia' };
    const m = T.modal(`${T.cabecalho(`${Icones.svg('ferramentas', 20)} ${nova ? 'Nova ferramenta' : 'Editar ferramenta'}`)}<div class="modal-corpo">
      <label class="campo">Nome<input type="text" id="nfNome" value="${esc(f.nome)}" maxlength="120" placeholder="Ex: Photopea"></label>
      <label class="campo">Site<input type="text" id="nfUrl" value="${esc(f.url)}" placeholder="Ex: photopea.com"></label>
      <label class="campo">Para que serve (opcional)<textarea id="nfDesc" rows="2" maxlength="500" placeholder="Uma frase curta">${esc(f.descricao)}</textarea></label>
      <label class="campo">Grupo<select id="nfGrupo">${GRUPOS.map((g) => `<option value="${g.id}" ${g.id === f.grupo ? 'selected' : ''}>${g.nome}</option>`).join('')}</select></label>
      <div class="linha ${nova ? 'fim' : 'entre'}">${nova ? '' : `<button class="btn perigo" id="nfRm">${Icones.svg('lixeira', 15)} Remover</button>`}
        <span class="linha"><button class="btn sec" data-fechar>Cancelar</button><button class="btn" id="nfOk">${nova ? `${Icones.svg('mais', 15)} Adicionar` : 'Salvar'}</button></span></div></div>`, { classe: 'pequeno' });
    $('#nfNome', m).focus();
    const salvar = () => {
      const nome = $('#nfNome', m).value.trim();
      let url = $('#nfUrl', m).value.trim();
      if (!nome) return T.toast('Dê um nome para a ferramenta.');
      if (url && !/^[a-z]+:\/\//i.test(url)) url = `https://${url}`;
      if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(url)) return T.toast('Coloque o site, por exemplo: photopea.com');
      const dados = { nome, url, descricao: $('#nfDesc', m).value.trim(), grupo: $('#nfGrupo', m).value };
      T.db.ferramentas = T.db.ferramentas || [];
      if (nova) T.db.ferramentas.unshift({ id: T.uid(), ...dados, criadoEm: T.agora() });
      else Object.assign(f, dados);
      T.salvar(); T.som('pop'); T.fecharModal();
      filtroGrupo = ''; buscaF = '';
      T.render(); T.toast(nova ? `${nome} adicionada às ferramentas` : 'Ferramenta salva');
    };
    $('#nfOk', m).onclick = salvar;
    m.onkeydown = (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') salvar(); };
    if (!nova) $('#nfRm', m).onclick = () => { T.fecharModal(); removerFerramenta(f.id); };
  }

  function removerFerramenta(id) {
    const i = T.db.ferramentas.findIndex((x) => x.id === id); if (i < 0) return;
    const [f] = T.db.ferramentas.splice(i, 1);
    T.salvar(); T.som('lixo'); T.render();
    T.toast(`${f.nome} removida das ferramentas`, () => { T.db.ferramentas.splice(i, 0, f); T.salvar(); T.som('desfazer'); T.render(); });
  }

  T.paginas.ferramentas = () => {
    const v = $('#vista'), L0 = todas(), minhas = (T.db.ferramentas || []).length;
    const conta = (fn) => L0.filter(fn).length;
    v.innerHTML = `<div class="pagina-cab"><div><h1>Ferramentas ${T.botaoTutorial('ferramentas')}</h1><p>Seus atalhos para ferramentas. Clique em <b>Guardar</b> para virar um link na sua Biblioteca.</p></div>
        <button class="btn" id="fNova">${Icones.svg('mais', 15)} Nova ferramenta</button></div>
      <div class="chips-tipo" id="fGrupos"><button class="chip ${!filtroGrupo ? 'on' : ''}" data-g="">${Icones.svg('tudo', 14)} Todas <b>${L0.length}</b></button>
        ${minhas ? `<button class="chip ${filtroGrupo === 'minhas' ? 'on' : ''}" data-g="minhas">${Icones.svg('estrela', 14)} Minhas <b>${minhas}</b></button>` : ''}
        ${GRUPOS.map((g) => { const n = conta((f) => f.g === g.id); return n || g.id !== 'outras' ? `<button class="chip ${filtroGrupo === g.id ? 'on' : ''}" data-g="${g.id}" style="--c:${g.cor}">${Icones.svg(g.icone, 14)} ${g.nome} <b>${n}</b></button>` : ''; }).join('')}
        <button class="chip ${filtroGrupo === 'aberto' ? 'on' : ''}" data-g="aberto">Código aberto <b>${conta((f) => f.aberto)}</b></button></div>
      <div class="filtros vidro-cartao"><label class="campo-busca">${Icones.svg('busca', 15)}<input id="fBusca" type="text" placeholder="Buscar ferramenta…" value="${esc(buscaF)}"></label></div>
      <div id="fLista"></div><p class="suave pequeno-txt">Os sites e planos mudam com frequência: confira as condições no site oficial antes de assinar.</p>`;
    const desenhar = () => {
      const q = T.norm(buscaF);
      const L = todas().filter((f) => (!filtroGrupo || (filtroGrupo === 'aberto' ? f.aberto : filtroGrupo === 'minhas' ? f.minha : f.g === filtroGrupo))
        && (!q || T.norm(`${f.n} ${f.p} ${f.u}`).includes(q)));
      const guardado = (u) => T.db.itens.some((i) => i.tipo === 'link' && i.texto.trim() === u);
      const novo = `<button class="cartao cartao-novo" id="fNovaCartao">${Icones.svg('mais', 26)}<b>Nova ferramenta</b><small>Guarde um site que você usa sempre</small></button>`;
      $('#fLista').innerHTML = L.length || !q ? `<div class="grade-cartoes">${L.map((f) => {
        const g = GRUPOS.find((x) => x.id === f.g) || GRUPOS[GRUPOS.length - 1];
        return `<article class="cartao ferramenta" style="--c:${g.cor}" ${f.minha ? `data-minha="${f.minha}"` : ''}><header class="cartao-topo"><span class="cartao-tipo">${g.nome}</span>
            <span class="cartao-cantos">${f.minha ? `<button class="btn-fav" data-editar="${f.minha}" title="Editar">${Icones.svg('editar', 15)}</button>` : ''}<i class="ico-tipo" style="--c:${g.cor}">${Icones.svg(g.icone, 15)}</i></span></header>
          <div class="cartao-titulo">${esc(f.n)}</div>${f.p ? `<div class="cartao-texto">${esc(f.p)}</div>` : ''}
          <footer class="cartao-rodape"><div class="cartao-tags">${f.minha ? '<span class="tag" style="--c:#ff7e00">sua</span>' : ''}${f.aberto ? '<span class="tag">código aberto</span>' : ''}<span class="tag">${esc(host(f.u))}</span></div>
          <div class="cartao-acoes"><a class="pilula" href="${esc(f.u)}" target="_blank" rel="noopener">${Icones.svg('abrir', 12)} Abrir</a>
          ${guardado(f.u) ? `<span class="pilula ok">${Icones.svg('check', 12)} Guardado</span>` : `<button class="pilula baixar" data-guardar="${esc(f.u)}">${Icones.svg('mais', 12)} Guardar</button>`}</div></footer></article>`;
      }).join('')}${q ? '' : novo}</div>` : T.vazio('ferramentas', 'Nenhuma ferramenta encontrada', 'Use o botão “Nova ferramenta” para adicionar.');
    };
    desenhar();
    $('#fNova').onclick = () => editarFerramenta();
    $('#fGrupos').onclick = (e) => { const b = e.target.closest('[data-g]'); if (!b) return; filtroGrupo = b.dataset.g; T.som('clique'); T.render(); };
    $('#fBusca').oninput = (e) => { buscaF = e.target.value; desenhar(); };
    $('#fLista').onclick = (e) => {
      if (e.target.closest('#fNovaCartao')) return editarFerramenta();
      const ed = e.target.closest('[data-editar]');
      if (ed) return editarFerramenta(T.db.ferramentas.find((x) => x.id === ed.dataset.editar));
      const b = e.target.closest('[data-guardar]'); if (!b) return;
      const f = todas().find((x) => x.u === b.dataset.guardar);
      T.criarItem({ tipo: 'link', titulo: f.n, descricao: f.p, texto: f.u, tags: ['ferramenta', ...(f.aberto ? ['codigo-aberto'] : [])] });
      T.toast(`${f.n} guardado na Biblioteca`); desenhar();
    };
    $('#fLista').oncontextmenu = (e) => {
      const c = e.target.closest('[data-minha]'); if (!c) return;
      const f = T.db.ferramentas.find((x) => x.id === c.dataset.minha);
      T.menu(e, [
        { icone: 'abrir', t: 'Abrir site', fn: () => window.open(f.url, '_blank', 'noopener') },
        { icone: 'editar', t: 'Editar', fn: () => editarFerramenta(f) },
        '-',
        { icone: 'lixeira', t: 'Remover', perigo: true, fn: () => removerFerramenta(f.id) },
      ]);
    };
  };

  // ---------- Conquistas ----------
  T.paginas.conquistas = () => {
    const j = T.db.jogo, n = T.nivelDe(j.xp), v = $('#vista'), meta = T.db.config.metaDiaria;
    const dias = Array.from({ length: 7 }, (_, i) => { const k = T.somarDias(T.hoje(), i - 6); return [k, (j.log[k] || { xp: 0 }).xp]; });
    const max = Math.max(meta, ...dias.map((d) => d[1]), 1);
    const de = T.xpDoNivel(n), ate = T.xpDoNivel(n + 1);
    v.innerHTML = `<div class="pagina-cab"><div><h1>Conquistas ${T.botaoTutorial('conquistas')}</h1><p>${T.db.config.jogo ? 'Pontos por guardar itens, concluir tarefas, copiar prompts e focar.' : 'Os pontos estão desligados nas Configurações; seus números ficam guardados.'}</p></div></div>
      <div class="kpis">
        <article class="kpi"><header><span>Nível</span><i class="kpi-ico" style="--c:var(--roxo)">${Icones.svg('raio', 15)}</i></header><strong>${n}</strong><small>${esc(T.nomeNivel(n))} · ${j.xp - de}/${ate - de} XP</small><div class="progresso"><i style="width:${Math.round(((j.xp - de) / (ate - de)) * 100)}%"></i></div></article>
        <article class="kpi"><header><span>XP total</span><i class="kpi-ico" style="--c:var(--accent)">${Icones.svg('estrela', 15)}</i></header><strong>${j.xp}</strong><small>desde o começo</small></article>
        <article class="kpi"><header><span>Sequência</span><i class="kpi-ico" style="--c:var(--vermelho)">${Icones.svg('fogo', 15)}</i></header><strong>${T.sequenciaViva()}</strong><small>dias seguidos</small></article>
        <article class="kpi"><header><span>Feitos</span><i class="kpi-ico" style="--c:var(--verde)">${Icones.svg('tarefas', 15)}</i></header><strong>${j.contadores.tarefa || 0}</strong><small>tarefas · ${j.contadores.item || 0} itens · ${j.contadores.foco || 0} focos</small></article>
      </div>
      <section class="painel vidro-cartao"><h3>${Icones.svg('raio', 16)} XP dos últimos 7 dias ${T.dica('A linha tracejada é a sua meta do dia.')}</h3>
        <div class="grafico-xp"><div class="linha-meta" style="bottom:${(meta / max) * 100}%"></div>
        ${dias.map(([k, x]) => `<div class="barra-dia"><div style="height:${Math.max(3, (x / max) * 100)}%" title="${x} XP"></div><small>${k.slice(8)}/${k.slice(5, 7)}</small></div>`).join('')}</div></section>
      <div class="secao-titulo"><h2>Conquistas · ${Object.keys(j.conquistas).length}/${T.CONQUISTAS.length}</h2></div>
      <div class="grade-conquistas">${T.CONQUISTAS.map((a) => `<div class="conquista vidro-cartao ${j.conquistas[a.id] ? 'on' : ''}"><i>${Icones.svg(a.icone, 22)}</i><div><b>${a.n}</b><small>${a.d}${j.conquistas[a.id] ? ` · ${T.fmtData(j.conquistas[a.id])}` : ''}</small></div></div>`).join('')}</div>`;
  };

  // ---------- Lixeira ----------
  // um painel por tipo; cada linha tem Restaurar e um X que apaga só aquela coisa de vez
  const GRUPOS_LIXO = [['item', 'Itens', 'biblioteca'], ['tarefa', 'Tarefas', 'tarefas'], ['cliente', 'Clientes', 'pessoas'], ['fin', 'Lançamentos', 'dinheiro']];
  const linhaLixo = (e) => {
    const d = e.dados;
    const titulo = e.tipo === 'item' ? d.titulo || 'Sem título' : e.tipo === 'tarefa' ? d.texto : e.tipo === 'cliente' ? d.nome || 'Sem nome' : `${d.desc || (d.tipo === 'entrada' ? 'Entrada' : 'Saída')} · ${T.brl(d.valor)}`;
    const icone = e.tipo === 'item' ? d.tipo : e.tipo === 'tarefa' ? 'tarefas' : e.tipo === 'cliente' ? 'pessoas' : 'dinheiro';
    const cor = e.tipo === 'item' ? T.tipo(d.tipo).cor : '#8b8e96';
    return `<div class="lixo-linha"><i class="ico-tipo" style="--c:${cor}">${Icones.svg(icone, 14)}</i><div><b>${esc(titulo)}</b><small class="suave">apagado em ${new Date(e.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
      <button class="btn sec pequeno" data-r="${d.id}">${Icones.svg('desfazer', 13)} Restaurar</button><button class="btn-x" data-x="${d.id}" title="Apagar de vez">${Icones.svg('x', 14)}</button></div>`;
  };
  T.paginas.lixeira = () => {
    const v = $('#vista'), L = T.db.lixeira;
    v.innerHTML = `<div class="pagina-cab"><div><h1>Lixeira ${T.botaoTutorial('lixeira')}</h1><p>O que você apaga fica aqui para dar para voltar atrás.</p></div>${L.length ? `<button class="btn perigo" id="esvaziar">${Icones.svg('lixeira', 15)} Esvaziar</button>` : ''}</div>
      ${L.length ? `<div class="lixo-grade">${GRUPOS_LIXO.map(([tipo, nome, ic]) => { const G = L.filter((e) => e.tipo === tipo); return G.length ? `<section class="painel vidro-cartao"><h3>${Icones.svg(ic, 16)} ${nome} <span class="conta">${G.length}</span></h3>${G.map(linhaLixo).join('')}</section>` : ''; }).join('')}</div>` : T.vazio('lixeira', 'Lixeira vazia', 'O que você apagar aparece aqui.')}`;
    v.onclick = async (e) => {
      const r = e.target.closest('[data-r]'); if (r) return T.restaurar(r.dataset.r);
      const x = e.target.closest('[data-x]');
      if (x && await T.confirmar('Apagar de vez? Não dá para desfazer.', 'Apagar de vez')) return T.apagarDeVez(x.dataset.x);
      if (e.target.closest('#esvaziar') && await T.confirmar('Apagar de vez tudo da lixeira? Não dá para desfazer. Os arquivos anexados continuam na pasta data/anexos.', 'Esvaziar')) {
        T.db.lixeira = []; T.salvar(); T.som('lixo'); T.render();
      }
    };
  };

  // ---------- Configurações ----------
  T.paginas.config = () => {
    const c = T.db.config, v = $('#vista');
    v.innerHTML = `<div class="pagina-cab"><div><h1>Configurações ${T.botaoTutorial('config')}</h1><p>Tudo fica salvo neste ${T.pc}.</p></div></div><div class="cfg-wrap"><nav class="cfg-menu vidro-cartao" id="cfgMenu"></nav><div class="config">
      <section class="cfg vidro-cartao"><h3>${Icones.svg('sol', 18)} Aparência</h3>
        <div class="cfg-linha"><span>Seu nome ${T.dica('Aparece na saudação do Início. Na primeira vez vem do nome da conta do ${T.pc}.')}</span><input type="text" id="cfgNome" value="${esc(c.nome || '')}" maxlength="40" placeholder="Como quer ser chamado"></div>
        <div class="cfg-linha"><span>Vidro</span><div class="seg" id="cTema">${[['claro', 'Claro'], ['escuro', 'Escuro'], ['auto', 'Igual ao sistema']].map(([k, n]) => `<button data-t="${k}" class="${c.tema === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
        <div class="cfg-linha"><span>Tamanho das letras</span><div class="seg" id="cFonte">${[[0.9, 'A−'], [1, 'Normal'], [1.1, 'A+'], [1.25, 'A++']].map(([x, n]) => `<button data-f="${x}" class="${(+c.fonte || 1) === x ? 'on' : ''}">${n}</button>`).join('')}</div></div>
        <div class="cfg-linha"><span>Modo compacto ${T.dica('Deixa tudo mais apertado: cabe mais coisa na tela.')}</span>${T.chave('cCompacto', c.compacto)}</div></section>
      ${T.secaoFundo()}
      <section class="cfg vidro-cartao"><h3>${Icones.svg('raio', 18)} Diversão</h3>
        <div class="cfg-linha"><span>Pontos e níveis ${T.dica('Desligando, somem o XP, a meta, a sequência e o subir de nível. Suas conquistas ficam guardadas.')}</span>${T.chave('cJogo', c.jogo)}</div>
        <div class="cfg-linha"><span>Sons ${T.dica('Sons curtinhos feitos no próprio navegador.')}</span>${T.chave('cSons', c.sons)}</div>
        <div class="cfg-linha"><span>Confete</span>${T.chave('cConfete', c.confete)}</div>
        <div class="cfg-linha"><span>Meta do dia (XP)</span><input type="number" id="cMeta" min="10" max="500" step="10" value="${c.metaDiaria}"></div></section>
      <section class="cfg vidro-cartao"><h3>${Icones.svg('tudo', 18)} Categorias</h3><div id="cCats"></div><button class="btn sec pequeno" id="cCatNova">${Icones.svg('mais', 14)} Nova categoria</button></section>
      ${T.secaoCelular()}
      ${T.secaoIntegracoes()}
      ${T.secaoIa()}
      ${T.secaoConexoes()}
      <section class="cfg vidro-cartao"><h3>${Icones.svg('nuvem', 18)} Google Drive</h3>
        <div class="cfg-linha"><span>Copiar para o Drive ${T.dica('Precisa do app “Google Drive para computador”. Cada item vira um arquivo .md numa pasta por tipo, com os anexos junto, dentro da pasta Backpack do seu Drive.')}</span>${T.chave('cDrive', c.drive.ligado)}</div>
        <div class="linha"><input type="text" id="cPasta" value="${esc(c.drive.pasta)}" placeholder="Ex: ~/Library/CloudStorage/GoogleDrive-…/Meu Drive"><button class="btn sec" id="cProcurar">${Icones.svg('busca', 14)} Procurar</button><button class="btn" id="cSinc">${Icones.svg('nuvem', 14)} Sincronizar agora</button></div>
        <small id="cDriveMsg" class="suave"></small></section>
      ${T.secaoDados()}
      ${T.secaoVersao()}
      ${T.secaoAjuda()}
      <section class="cfg vidro-cartao"><h3>${Icones.svg('comando', 18)} Atalhos</h3><div class="atalhos">
        <kbd>${T.mod}K</kbd><span>Buscar em tudo ou dar um comando (ou <kbd>/</kbd>)</span><kbd>N</kbd><span>Novo item</span><kbd>H</kbd><span>Início</span><kbd>B</kbd><span>Biblioteca</span>
        <kbd>T</kbd><span>Tarefas</span><kbd>C</kbd><span>Calendário</span><kbd>R</kbd><span>Rotina</span><kbd>M</kbd><span>Mapa de conexões</span><kbd>F</kbd><span>Começar ou parar o foco</span>
        <kbd>V</kbd><span>Criar por voz</span><kbd>${T.mod}[ ${T.mod}]</kbd><span>Voltar e avançar</span>
        <kbd>Esc</kbd><span>Fechar janela</span><kbd>Clique direito</kbd><span>Menu do cartão</span></div></section>
      <section class="cfg vidro-cartao"><h3>${Icones.svg('desligar', 18)} Servidor</h3><div class="linha"><button class="btn perigo" id="cDesligar">${Icones.svg('desligar', 15)} Desligar o Backpack</button>
        ${T.dica('Desliga o servidor até você entrar no ${T.pc} de novo ou abrir o instalador do Backpack.')}</div></section></div></div>`;
    // menu das seções, montado a partir dos títulos
    const secs = $$('.config > .cfg');
    secs.forEach((x, i) => { if (!x.id) x.id = `sec-${i}`; });
    $('#cfgMenu').innerHTML = secs.map((x) => `<a data-sec="${x.id}">${x.querySelector('h3').innerHTML.replace(/<span class="dica-i[\s\S]*$/, '')}</a>`).join('');
    $('#cfgMenu').onclick = (e) => { const a = e.target.closest('[data-sec]'); if (a) document.getElementById(a.dataset.sec).scrollIntoView({ behavior: 'smooth', block: 'start' }); };

    const muda = (k, val) => { c[k] = val; T.salvar(); T.aplicarConfig(); };
    $('#cTema').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; muda('tema', b.dataset.t); T.som('clique'); T.render(); };
    $('#cFonte').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; muda('fonte', +b.dataset.f); T.som('clique'); T.render(); };
    $('#cCompacto').onchange = (e) => { muda('compacto', e.target.checked); T.som('clique'); };
    $('#cJogo').onchange = (e) => { muda('jogo', e.target.checked); T.hud(); T.som('clique'); };
    $('#cSons').onchange = (e) => { muda('sons', e.target.checked); T.som('moeda'); };
    $('#cConfete').onchange = (e) => { muda('confete', e.target.checked); T.confete(null, null, 30); };
    $('#cfgNome').onchange = (e) => { c.nome = e.target.value.trim(); T.salvar(); T.toast(c.nome ? `Pronto, ${c.nome}!` : 'Nome apagado'); };
    $('#cMeta').onchange = (e) => { muda('metaDiaria', Math.max(10, Math.min(500, +e.target.value || 50))); T.hud(); };

    T.ligarSecaoFundo();
    T.ligarSecaoIntegracoes();
    T.ligarSecaoIa();
    T.ligarSecaoVersao();
    T.ligarSecaoCelular();
    T.ligarSecaoConexoes();
    T.ligarSecaoDados();
    T.ligarSecaoAjuda();

    function desenharCats() {
      $('#cCats').innerHTML = T.db.categorias.map((x) => `<div class="cat-linha" data-id="${x.id}"><input type="text" class="ic" value="${esc(x.icone)}" maxlength="4" title="Emoji"><input type="text" class="nm" value="${esc(x.nome)}" maxlength="80"><input type="color" value="${x.cor}" title="Cor"><button class="btn-x" title="Apagar categoria">${Icones.svg('x', 14)}</button></div>`).join('') || '<small class="suave">Nenhuma categoria ainda.</small>';
    }
    desenharCats();
    $('#cCats').oninput = (e) => {
      const row = e.target.closest('.cat-linha'); if (!row) return;
      const x = T.cat(row.dataset.id);
      if (e.target.classList.contains('ic')) x.icone = e.target.value; else if (e.target.classList.contains('nm')) x.nome = e.target.value; else if (e.target.type === 'color') x.cor = e.target.value;
      T.salvar();
    };
    $('#cCats').onclick = async (e) => {
      const b = e.target.closest('.btn-x'); if (!b) return;
      const id = b.closest('.cat-linha').dataset.id;
      if (await T.confirmar('Apagar esta categoria? Os itens dela ficam sem categoria.', 'Apagar')) {
        T.db.categorias = T.db.categorias.filter((x) => x.id !== id); T.db.itens.forEach((i) => { if (i.categoria === id) i.categoria = ''; }); T.salvar();
      }
      T.render();
    };
    $('#cCatNova').onclick = () => { T.db.categorias.push({ id: T.uid(), nome: 'Nova categoria', icone: '📁', cor: '#ff7e00' }); T.salvar(); T.som('pop'); desenharCats(); const r = $$('.cat-linha .nm'); r[r.length - 1].select(); };

    const msg = (t, ruim) => { const el = $('#cDriveMsg'); el.textContent = t; el.className = ruim ? 'vermelho' : 'verde'; };
    $('#cDrive').onchange = (e) => { c.drive.ligado = e.target.checked; T.salvar(); T.som('clique'); if (e.target.checked && !c.drive.pasta) $('#cProcurar').click(); };
    $('#cPasta').oninput = (e) => { c.drive.pasta = e.target.value.trim(); T.salvar(); };
    $('#cProcurar').onclick = async () => {
      try {
        const r = await T.api('/api/drive/encontrar');
        if (!r.pastas.length) return msg('Não achei o Google Drive. Instale o app “Google Drive para computador” ou digite a pasta.', true);
        c.drive.pasta = r.pastas[0]; $('#cPasta').value = r.pastas[0]; T.salvar(); msg(`Achei: ${r.pastas.join('  |  ')}`); T.som('moeda');
      } catch (e) { msg(e.message, true); }
    };
    $('#cSinc').onclick = async () => {
      try {
        msg('Sincronizando…'); T.salvar(true);
        await new Promise((r) => setTimeout(r, 400));
        const r = await T.api('/api/drive/sincronizar', { method: 'POST' });
        msg(`Pronto: ${r.itens} itens · ${r.escritos} arquivos atualizados · ${r.removidos} removidos.`); T.som('feito');
      } catch (e) { msg(e.message, true); T.som('erro'); }
    };
    $('#cDesligar').onclick = async () => {
      if (!(await T.confirmar(`Desligar o servidor do Backpack? Ele volta quando você entrar no ${T.pc} de novo ou abrir o instalador.`, 'Desligar'))) return;
      try { await T.api('/api/desligar', { method: 'POST' }); } catch (_) {}
      document.body.innerHTML = '<div class="desligado"><div class="vidro">Backpack desligado. Pode fechar esta janela.</div></div>';
    };
  };
})();
