// Backpack — gamificação: XP com limite por dia, níveis, meta diária, sequência, missões e conquistas.
(function () {
  const NIVEIS = ['Iniciante', 'Curioso', 'Colecionador', 'Organizador', 'Curador', 'Pesquisador', 'Arquivista',
    'Bibliotecário', 'Estrategista', 'Mestre do Acervo', 'Guardião do Conhecimento', 'Lenda do Backpack'];
  T.nivelDe = (xp) => Math.floor(Math.sqrt(xp / 40)) + 1;
  T.xpDoNivel = (n) => 40 * (n - 1) * (n - 1);
  T.nomeNivel = (n) => NIVEIS[Math.min(n - 1, NIVEIS.length - 1)];

  // quanto cada ação vale e o teto por dia (para não virar "farm")
  const REGRAS = { item: { xp: 10, teto: 100 }, tarefa: { xp: 15, teto: 150 }, check: { xp: 2, teto: 20 }, copia: { xp: 3, teto: 15 },
    anexo: { xp: 5, teto: 25 }, foco: { xp: 20, teto: 80 }, bonus: { xp: 25, teto: 25 },
    habito: { xp: 5, teto: 40 }, meta: { xp: 25, teto: 50 }, cliente: { xp: 5, teto: 25 }, lancamento: { xp: 2, teto: 10 } };

  T.CONQUISTAS = [
    { id: 'primeiro', icone: 'nota', n: 'Primeiro item', d: 'Crie seu primeiro item', t: (j) => (j.contadores.item || 0) >= 1 },
    { id: 'itens10', icone: 'biblioteca', n: 'Acervo começando', d: 'Crie 10 itens', t: (j) => (j.contadores.item || 0) >= 10 },
    { id: 'itens50', icone: 'tudo', n: 'Biblioteca de verdade', d: 'Crie 50 itens', t: (j) => (j.contadores.item || 0) >= 50 },
    { id: 'tarefa1', icone: 'tarefas', n: 'Missão cumprida', d: 'Conclua 1 tarefa', t: (j) => (j.contadores.tarefa || 0) >= 1 },
    { id: 'tarefa10', icone: 'check', n: 'Em ritmo', d: 'Conclua 10 tarefas', t: (j) => (j.contadores.tarefa || 0) >= 10 },
    { id: 'tarefa50', icone: 'trofeu', n: 'Máquina de entregas', d: 'Conclua 50 tarefas', t: (j) => (j.contadores.tarefa || 0) >= 50 },
    { id: 'seq3', icone: 'fogo', n: 'Pegando fogo', d: '3 dias seguidos', t: (j) => j.sequencia.dias >= 3 },
    { id: 'seq7', icone: 'fogo', n: 'Imparável', d: '7 dias seguidos', t: (j) => j.sequencia.dias >= 7 },
    { id: 'copia10', icone: 'prompt', n: 'Mago dos prompts', d: 'Copie 10 prompts', t: (j) => (j.contadores.copia || 0) >= 10 },
    { id: 'check25', icone: 'instrucao', n: 'Mestre da lista', d: 'Marque 25 passos de checklist', t: (j) => (j.contadores.check || 0) >= 25 },
    { id: 'foco5', icone: 'foco', n: 'Foco total', d: 'Complete 5 focos', t: (j) => (j.contadores.foco || 0) >= 5 },
    { id: 'meta', icone: 'alvo', n: 'Meta batida', d: 'Bata a meta do dia', t: (j) => j.diasMeta >= 1 },
    { id: 'nivel5', icone: 'raio', n: 'Nível 5', d: 'Chegue ao nível 5', t: (j) => T.nivelDe(j.xp) >= 5 },
    { id: 'anexo', icone: 'clipe', n: 'Colecionador de arquivos', d: 'Anexe um arquivo', t: (j) => (j.contadores.anexo || 0) >= 1 },
    { id: 'hab1', icone: 'atualizar', n: 'Primeiro hábito', d: 'Marque um hábito como feito', t: (j) => (j.contadores.habito || 0) >= 1 },
    { id: 'hab7', icone: 'fogo', n: 'Hábito firme', d: '7 dias seguidos num hábito', t: () => (T.rotinaMaiorSeq ? T.rotinaMaiorSeq() : 0) >= 7 },
    { id: 'meta1', icone: 'trofeu', n: 'Meta alcançada', d: 'Chegue a 100% numa meta', t: (j) => (j.contadores.meta || 0) >= 1 },
    { id: 'cliente1', icone: 'pessoas', n: 'Primeiro cliente', d: 'Cadastre um cliente', t: (j) => (j.contadores.cliente || 0) >= 1 },
    { id: 'fin10', icone: 'dinheiro', n: 'Contas em dia', d: 'Faça 10 lançamentos no Financeiro', t: (j) => (j.contadores.lancamento || 0) >= 10 },
  ];

  T.registroDoDia = () => {
    const j = T.db.jogo, k = T.hoje();
    return j.log[k] || (j.log[k] = { xp: 0, por: {}, n: {} });
  };

  T.missoes = () => {
    const n = T.registroDoDia().n || {};
    return [
      { icone: 'tarefas', t: 'Concluir 2 tarefas', v: n.tarefa || 0, max: 2 },
      { icone: 'nota', t: 'Guardar 1 item novo', v: n.item || 0, max: 1 },
      { icone: 'foco', t: 'Fazer 1 foco', v: n.foco || 0, max: 1 },
    ];
  };

  function conferirMissoes() {
    const log = T.registroDoDia();
    if (log.bonus || !T.db.config.jogo) return;
    if (T.missoes().every((q) => q.v >= q.max)) {
      log.bonus = true;
      setTimeout(() => { T.ganhar('bonus'); T.som('conquista'); T.chuva(); T.toast('Missões do dia completas! Bônus de XP.'); }, 900);
    }
  }

  function marcarSequencia() {
    const s = T.db.jogo.sequencia, h = T.hoje();
    if (s.ultimo === h) return;
    s.dias = s.ultimo === T.somarDias(h, -1) ? s.dias + 1 : 1;
    s.ultimo = h;
  }

  // concede XP; devolve quanto deu de fato (0 se bateu o teto do dia ou o jogo está desligado)
  T.ganhar = (tipo, onde) => {
    const j = T.db.jogo;
    j.contadores[tipo] = (j.contadores[tipo] || 0) + 1;
    const log = T.registroDoDia();
    log.n = log.n || {}; log.n[tipo] = (log.n[tipo] || 0) + 1;
    if (tipo !== 'bonus') conferirMissoes();
    let deu = 0;
    if (T.db.config.jogo) {
      const r = REGRAS[tipo];
      const usado = (log.por || (log.por = {}))[tipo] || 0;
      deu = Math.max(0, Math.min(r.xp, r.teto - usado));
      if (deu > 0) {
        const antes = T.nivelDe(j.xp), metaAntes = log.xp >= T.db.config.metaDiaria;
        j.xp += deu; log.xp += deu; log.por[tipo] = usado + deu;
        marcarSequencia();
        T.flutuar(`+${deu} XP`, onde ? onde.x : innerWidth - 160, onde ? onde.y : 70);
        T.som(tipo === 'tarefa' ? 'feito' : tipo === 'check' || tipo === 'habito' ? 'check' : tipo === 'copia' ? 'copia' : 'moeda');
        const depois = T.nivelDe(j.xp);
        if (depois > antes) setTimeout(() => subiuNivel(depois), 250);
        if (!metaAntes && log.xp >= T.db.config.metaDiaria) {
          j.diasMeta++;
          setTimeout(() => { T.som('meta'); T.confete(null, null, 70); T.toast('Meta do dia batida!'); }, 400);
        }
      }
    }
    conferirConquistas();
    T.hud();
    T.salvar();
    return deu;
  };

  function conferirConquistas() {
    const j = T.db.jogo;
    T.CONQUISTAS.forEach((a) => {
      if (!j.conquistas[a.id] && a.t(j)) {
        j.conquistas[a.id] = T.hoje();
        if (T.db.config.jogo) setTimeout(() => { T.som('conquista'); T.confete(null, null, 40, 7); T.toast(`Conquista: ${a.n}`); }, 700);
      }
    });
  }

  function subiuNivel(n) {
    const el = document.getElementById('nivel-novo');
    el.innerHTML = `<div class="nivel-caixa vidro"><small>Subiu de nível</small><div class="nivel-num">${n}</div><b>${T.esc(T.nomeNivel(n))}</b></div>`;
    el.hidden = false;
    T.som('nivel'); T.confete(innerWidth / 2, innerHeight / 2, 140, 13); setTimeout(T.chuva, 300);
    const fechar = () => { el.hidden = true; el.onclick = null; };
    el.onclick = fechar; setTimeout(fechar, 3600);
  }

  T.sequenciaViva = () => {
    const s = T.db.jogo.sequencia, h = T.hoje();
    return s.ultimo === h || s.ultimo === T.somarDias(h, -1) ? s.dias : 0;
  };

  // barra de nível, sequência e meta no topo
  T.hud = () => {
    if (!T.db) return;
    document.body.classList.toggle('sem-jogo', !T.db.config.jogo);
    const j = T.db.jogo, n = T.nivelDe(j.xp);
    const de = T.xpDoNivel(n), ate = T.xpDoNivel(n + 1), pct = Math.round(((j.xp - de) / (ate - de)) * 100);
    const dia = (j.log[T.hoje()] || { xp: 0 }).xp, meta = T.db.config.metaDiaria || 50;
    const el = T.$('#hud'); if (!el) return;
    el.innerHTML = `
      <span class="hud-nivel" title="Nível ${n} · ${T.esc(T.nomeNivel(n))} · ${j.xp - de} / ${ate - de} XP"><b>${n}</b><i style="--p:${pct}%"></i></span>
      <span class="hud-seq" title="Dias seguidos usando o Backpack">${Icones.svg('fogo', 15)}<b>${T.sequenciaViva()}</b></span>
      <span class="hud-meta" title="Meta de hoje: ${dia} / ${meta} XP" style="--p:${Math.min(100, Math.round((dia / meta) * 100))}"></span>`;
  };
})();
