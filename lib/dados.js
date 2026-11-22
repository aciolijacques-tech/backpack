// Backpack — dados: leitura, migração, gravação atômica, revisão e backup diário.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DATA = process.env.BACKPACK_DATA || path.join(ROOT, 'data');
const DB = path.join(DATA, 'db.json');
const ANEXOS = path.join(DATA, 'anexos');
const BACKUPS = path.join(DATA, 'backups');
const VERSAO_DB = 2;
// modelos de IA: mesma posição = mesmo nível (caprichado, rápido, barato)
const MODELOS_IA = {
  claude: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  codex: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6-luna'],
};
for (const d of [DATA, ANEXOS, BACKUPS]) fs.mkdirSync(d, { recursive: true });

const TIPOS = ['pdf', 'prompt', 'instrucao', 'comando', 'link', 'nota', 'skill'];
const STATUS = ['ver', 'andamento', 'feito'];
const PRIOS = ['baixa', 'media', 'alta'];

// id curto, sem hífen (o hífen separa o id do nome original nos anexos)
const uid = () => crypto.randomBytes(5).toString('hex') + Date.now().toString(36).slice(-4);
const agora = () => new Date().toISOString();
const dataLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nomeSeguro = (n) => String(n || 'arquivo').replace(/[/\\:*?"<>|\x00-\x1f]/g, '_').replace(/\.\./g, '_').trim().slice(-150) || 'arquivo';

function padrao() {
  return {
    versao: VERSAO_DB,
    rev: 0,
    config: {
      tema: 'claro', fonte: 1, compacto: false,
      jogo: true, sons: true, confete: true, metaDiaria: 50,
      visao: 'grade', quadroPor: 'status',
      ia: { via: 'auto', modelo: 'claude-sonnet-5-5', ligadas: {}, configurada: false, ultima: '' },
      drive: { ligado: false, pasta: '' },
      fundo: { animado: true, segundos: 10, versao: 0 },
      atualizacaoPulada: '',
      calc: {}, tour: {}, tourOff: false, versaoVista: '', nome: '',
    },
    categorias: [], itens: [], tarefas: [], lixeira: [], pacotes: [], ferramentas: [],
    clientes: [], fin: [], habitos: [], metas: [], tags: [],
    jogo: { xp: 0, log: {}, sequencia: { ultimo: '', dias: 0 }, conquistas: {}, contadores: {}, diasMeta: 0 },
  };
}

// ---------- normalização (vale para migração e para o que chega do navegador) ----------
const str = (v, max = 20000) => (v == null ? '' : String(v)).slice(0, max);
const arr = (v) => (Array.isArray(v) ? v : []);
const isoOu = (v, def) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : typeof v === 'number' ? new Date(v).toISOString() : def);
const dataOu = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

function normItem(it) {
  const t = agora();
  return {
    id: str(it.id, 64) || uid(),
    tipo: TIPOS.includes(it.tipo) ? it.tipo : 'nota',
    titulo: str(it.titulo, 300),
    descricao: str(it.descricao, 5000),
    texto: str(it.texto, 200000),
    checklist: arr(it.checklist).slice(0, 500).map((c) => ({ id: str(c.id, 64) || uid(), t: str(c.t, 1000), feito: !!c.feito })),
    links: arr(it.links).slice(0, 200).map((l) => ({ id: str(l.id, 64) || uid(), url: str(l.url, 2000), rotulo: str(l.rotulo, 300) })),
    anexos: arr(it.anexos).slice(0, 200).map((a) => ({
      id: str(a.id, 64) || uid(), nome: str(a.nome, 300), arquivo: path.basename(str(a.arquivo, 400)),
      tamanho: Number(a.tamanho) || 0, mime: str(a.mime, 120),
    })).filter((a) => a.arquivo),
    categoria: str(it.categoria, 64),
    status: STATUS.includes(it.status) ? it.status : 'ver',
    tags: [...new Set(arr(it.tags).map((x) => str(x, 60).trim()).filter(Boolean))].slice(0, 50),
    data: dataOu(it.data),
    fav: !!it.fav,
    enviado: it.enviado && typeof it.enviado === 'object' ? it.enviado : {},
    cliente: str(it.cliente, 64),
    modelo: !!it.modelo,
    origem: it.origem && typeof it.origem === 'object' ? { app: str(it.origem.app, 80), id: str(it.origem.id, 200), url: str(it.origem.url, 2000), em: str(it.origem.em, 40) } : null,
    rascunho: typeof it.rascunho === 'string' ? it.rascunho.slice(0, 400000) : '',
    voz: it.voz === 'pendente' ? 'pendente' : '',
    criadoEm: isoOu(it.criadoEm, t),
    atualizadoEm: isoOu(it.atualizadoEm, t),
  };
}

function normTarefa(x) {
  return {
    id: str(x.id, 64) || uid(),
    texto: str(x.texto, 1000),
    data: dataOu(x.data),
    prio: PRIOS.includes(x.prio) ? x.prio : 'media',
    feita: !!x.feita,
    feitaEm: x.feitaEm ? isoOu(x.feitaEm, null) : null,
    xp: !!x.xp,
    hora: /^\d{2}:\d{2}$/.test(x.hora || '') ? x.hora : '',
    rep: REPS.includes(x.rep) ? x.rep : '',
    cliente: str(x.cliente, 64),
    criadoEm: isoOu(x.criadoEm, agora()),
  };
}

const REPS = ['dia', 'uteis', 'semana', 'mes'];
const STATUS_CLI = ['prospect', 'ativo', 'pausado', 'encerrado'];
function normCliente(c) {
  const t = agora();
  return {
    id: str(c.id, 64) || uid(),
    nome: str(c.nome, 200), empresa: str(c.empresa, 200),
    status: STATUS_CLI.includes(c.status) ? c.status : 'prospect',
    email: str(c.email, 300), whats: str(c.whats, 60), insta: str(c.insta, 200), site: str(c.site, 2000),
    trello: str(c.trello, 2000), pasta: str(c.pasta, 2000), notas: str(c.notas, 50000),
    tags: [...new Set(arr(c.tags).map((x) => str(x, 60).trim()).filter(Boolean))].slice(0, 50),
    rascunho: typeof c.rascunho === 'string' ? c.rascunho.slice(0, 100000) : '',
    criadoEm: isoOu(c.criadoEm, t), atualizadoEm: isoOu(c.atualizadoEm, t),
  };
}
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
// Casa x Empresa: só um palpite para quem já tinha lançamentos antes dessa separação existir — nunca
// roda de novo depois que a pessoa escolhe (ou já tinha escolhido) uma frente para aquele lançamento.
const FRENTE_SAIDA_EMPRESA = new Set(['Ferramentas e assinaturas', 'Impostos e taxas', 'Anúncios e marketing', 'Equipamentos', 'Pró-labore / salário', 'Equipe e freelas']);
const FRENTE_SAIDA_CASA = new Set(['Casa e contas', 'Alimentação', 'Transporte']);
const FRENTE_ENTRADA_EMPRESA = new Set(['Serviço / cliente', 'Venda de produto', 'Comissão / parceria']);
function adivinharFrente(tipo, cat) {
  if (tipo === 'saida') { if (FRENTE_SAIDA_EMPRESA.has(cat)) return 'empresa'; if (FRENTE_SAIDA_CASA.has(cat)) return 'casa'; }
  else if (FRENTE_ENTRADA_EMPRESA.has(cat)) return 'empresa';
  return ''; // ambíguo (ex.: "Rendimento", "Outros") — fica "a classificar" até a pessoa decidir
}
function normFin(f) {
  const tipo = f.tipo === 'entrada' ? 'entrada' : 'saida';
  const cat = str(f.cat, 80);
  return {
    id: str(f.id, 64) || uid(),
    tipo,
    desc: str(f.desc, 300), valor: Math.abs(num(f.valor)),
    data: dataOu(f.data) || dataLocal(), pago: !!f.pago, pagoEm: dataOu(f.pagoEm),
    cat, frente: ['casa', 'empresa'].includes(f.frente) ? f.frente : adivinharFrente(tipo, cat),
    cliente: str(f.cliente, 64), forma: str(f.forma, 40),
    serie: str(f.serie, 64), parc: str(f.parc, 20), obs: str(f.obs, 2000),
    criadoEm: isoOu(f.criadoEm, agora()),
  };
}
function normHabito(h) {
  const log = {};
  if (h.log && typeof h.log === 'object') for (const [k, v] of Object.entries(h.log)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number(v) > 0) log[k] = Math.min(9999, Number(v));
  return {
    id: str(h.id, 64) || uid(), nome: str(h.nome, 200), em: str(h.em, 8) || '🎯',
    freq: ['dia', 'semana', 'vezes'].includes(h.freq) ? h.freq : 'dia',
    dias: [...new Set(arr(h.dias).map(Number).filter((d) => d >= 0 && d <= 6))],
    vezes: Math.max(1, Math.min(7, Number(h.vezes) || 3)),
    alvo: Math.max(1, Math.min(9999, Number(h.alvo) || 1)), un: str(h.un, 30),
    hora: /^\d{2}:\d{2}$/.test(h.hora || '') ? h.hora : '',
    criado: dataOu(h.criado) || dataLocal(), log,
  };
}
function normMeta(g) {
  return {
    id: str(g.id, 64) || uid(), nome: str(g.nome, 200), em: str(g.em, 8) || '🏆',
    alvo: Math.max(0.01, num(g.alvo) || 1), atual: num(g.atual), un: str(g.un, 30), prazo: dataOu(g.prazo),
    hist: arr(g.hist).slice(-500).map((x) => ({ d: dataOu(x.d) || dataLocal(), v: num(x.v) })),
    feitoEm: dataOu(g.feitoEm),
    criadoEm: isoOu(g.criadoEm, agora()),
  };
}
const NORM_LIXO = { item: normItem, tarefa: normTarefa, cliente: normCliente, fin: normFin };

const GRUPOS_FERRAMENTA = ['ia', 'criacao', 'video', 'org', 'outras'];
function normFerramenta(f) {
  const url = str(f.url, 2000).trim();
  return {
    id: str(f.id, 64) || uid(),
    nome: str(f.nome, 120).trim() || 'Ferramenta',
    descricao: str(f.descricao, 500),
    url: /^https?:\/\/[^\s]+$/i.test(url) ? url : '',
    grupo: GRUPOS_FERRAMENTA.includes(f.grupo) ? f.grupo : 'outras',
    criadoEm: isoOu(f.criadoEm, agora()),
  };
}

function normCategoria(c) {
  return { id: str(c.id, 64) || uid(), nome: str(c.nome, 80) || 'Categoria', icone: str(c.icone, 8) || '📁', cor: /^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor : '#ff7e00' };
}

// v1 (Biblioteca simples) → v2. Nada é perdido: itens apagados vão para a lixeira.
function deV1(raw) {
  const d = padrao();
  for (const v of arr(raw.itens)) {
    const anexos = [];
    if (v.anexo && v.anexo.caminho) {
      const arquivo = path.basename(decodeURIComponent(String(v.anexo.caminho).split('?')[0]));
      let tamanho = 0;
      try { tamanho = fs.statSync(path.join(ANEXOS, arquivo)).size; } catch (_) {}
      anexos.push({ id: uid(), nome: v.anexo.nome || arquivo, arquivo, tamanho, mime: '' });
    }
    const it = normItem({ ...v, anexos, descricao: '', status: 'ver' });
    if (v.apagadoEm) d.lixeira.push({ tipo: 'item', dados: it, em: isoOu(v.apagadoEm, agora()) });
    else d.itens.push(it);
  }
  return d;
}

function migrar(raw) {
  if (!raw || typeof raw !== 'object') return padrao();
  if (!raw.versao && Array.isArray(raw.itens)) return deV1(raw);
  const d = padrao();
  const out = { ...d, ...raw };
  out.versao = VERSAO_DB;
  out.rev = Number(raw.rev) || 0;
  out.config = { ...d.config, ...(raw.config || {}) };
  out.config.ia = { ...d.config.ia, ...((raw.config || {}).ia || {}) };
  { // um motor de IA ligado por vez, e o modelo é do motor ligado; ver docs/specs/ia-motores.md
    const ia = out.config.ia, l = ia.ligadas || {};
    let claude = l.claude !== false, codex = l.codex !== false;
    if (claude && codex) {
      if (ia.via === 'api') claude = codex = false;
      else { codex = ia.via === 'codex' || MODELOS_IA.codex.includes(ia.modelo); claude = !codex; }
    }
    ia.ligadas = { claude, codex };
    ia.via = 'auto';
    const nivel = [MODELOS_IA.claude, MODELOS_IA.codex].map((L) => L.indexOf(ia.modelo)).find((i) => i >= 0) ?? 1;
    ia.modelo = MODELOS_IA[codex ? 'codex' : 'claude'][nivel];
  }
  out.config.drive = { ...d.config.drive, ...((raw.config || {}).drive || {}) };
  out.config.fundo = { ...d.config.fundo, ...((raw.config || {}).fundo || {}) };
  out.config.fundo.segundos = [6, 10, 20, 30].includes(+out.config.fundo.segundos) ? +out.config.fundo.segundos : 10;
  out.config.metaDiaria = Math.max(10, Math.min(500, Number(out.config.metaDiaria) || 50));
  out.categorias = arr(raw.categorias).slice(0, 200).map(normCategoria);
  out.itens = arr(raw.itens).map(normItem);
  out.tarefas = arr(raw.tarefas).map(normTarefa);
  out.lixeira = arr(raw.lixeira).slice(0, 2000).filter((e) => e && e.dados).map((e) => {
    const tipo = NORM_LIXO[e.tipo] ? e.tipo : 'item';
    return { tipo, dados: NORM_LIXO[tipo](e.dados), em: isoOu(e.em, agora()) };
  });
  out.clientes = arr(raw.clientes).slice(0, 5000).map(normCliente);
  out.fin = arr(raw.fin).slice(0, 50000).map(normFin);
  out.habitos = arr(raw.habitos).slice(0, 500).map(normHabito);
  out.metas = arr(raw.metas).slice(0, 500).map(normMeta);
  // registro de etiquetas conhecidas: cresce sozinho (qualquer etiqueta nova digitada entra aqui) e nunca encolhe sozinho
  { const conhecidas = new Set(arr(raw.tags).map((x) => str(x, 60).trim()).filter(Boolean));
    out.itens.forEach((i) => i.tags.forEach((t) => conhecidas.add(t)));
    out.clientes.forEach((c) => c.tags.forEach((t) => conhecidas.add(t)));
    out.tags = [...conhecidas].slice(0, 1000).sort((a, b) => a.localeCompare(b, 'pt')); }
  out.config.nome = str(out.config.nome, 40).trim();
  out.config.calc = out.config.calc && typeof out.config.calc === 'object' ? out.config.calc : {};
  out.config.tour = out.config.tour && typeof out.config.tour === 'object' ? out.config.tour : {};
  out.pacotes = arr(raw.pacotes).map(String);
  out.ferramentas = arr(raw.ferramentas).slice(0, 500).map(normFerramenta).filter((f) => f.url);
  const j = raw.jogo || {};
  out.jogo = {
    ...d.jogo, ...j,
    xp: Math.max(0, Number(j.xp) || 0),
    log: j.log && typeof j.log === 'object' ? j.log : {},
    sequencia: { ...d.jogo.sequencia, ...(j.sequencia || {}) },
    conquistas: j.conquistas && typeof j.conquistas === 'object' ? j.conquistas : {},
    contadores: j.contadores && typeof j.contadores === 'object' ? j.contadores : {},
    diasMeta: Number(j.diasMeta) || 0,
  };
  return out;
}

// ---------- disco ----------
function ler() {
  if (!fs.existsSync(DB)) return { db: semente(), novo: true };
  let raw;
  try { raw = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) {
    // arquivo corrompido: guarda uma cópia e recomeça do último backup bom
    const ruim = path.join(BACKUPS, `corrompido-${Date.now()}.json`);
    try { fs.copyFileSync(DB, ruim); } catch (_) {}
    const ultimo = listarBackups()[0];
    if (ultimo) { try { return { db: migrar(JSON.parse(fs.readFileSync(path.join(BACKUPS, ultimo), 'utf8'))), novo: false }; } catch (_) {} }
    return { db: padrao(), novo: false };
  }
  return { db: migrar(raw), novo: !raw.versao };
}

function gravar(db) {
  const tmp = `${DB}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1), 'utf8');
  fs.renameSync(tmp, DB);
}

function listarBackups() {
  try { return fs.readdirSync(BACKUPS).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse(); } catch (_) { return []; }
}

function backupDiario() {
  if (!fs.existsSync(DB)) return;
  const alvo = path.join(BACKUPS, `db-${dataLocal()}.json`);
  if (fs.existsSync(alvo)) return;
  fs.copyFileSync(DB, alvo);
  const lista = listarBackups();
  const antigos = path.join(BACKUPS, '_antigos');
  // guarda as 20 mais novas; as outras vão para _antigos (nada é apagado)
  for (const f of lista.slice(20)) {
    fs.mkdirSync(antigos, { recursive: true });
    fs.renameSync(path.join(BACKUPS, f), path.join(antigos, f));
  }
}

// ---------- conteúdo da primeira abertura ----------
function semente() {
  const d = padrao();
  const t = agora();
  const dia = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return dataLocal(x); };
  d.categorias = [
    { id: 'c-ia', nome: 'Inteligência Artificial', icone: '🤖', cor: '#a46bff' },
    { id: 'c-trabalho', nome: 'Trabalho', icone: '💼', cor: '#4f8cff' },
    { id: 'c-estudo', nome: 'Estudos', icone: '🎓', cor: '#2fbf8f' },
  ];
  const mk = (o) => normItem({ criadoEm: t, atualizadoEm: t, ...o });
  d.itens = [
    mk({ tipo: 'nota', titulo: 'Bem-vindo ao Backpack', fav: true, categoria: 'c-trabalho', tags: ['comece-aqui'],
      descricao: 'Seu inventário pessoal: guarde e ache rápido.',
      texto: 'Dicas rápidas:\n• Cmd+K busca em tudo e roda comandos\n• Arraste um arquivo para a janela e ele vira um item\n• Clique com o botão direito num cartão para ver o menu\n• Concluir tarefas e guardar itens dá XP' }),
    mk({ tipo: 'prompt', titulo: 'Resumir texto em 5 tópicos', categoria: 'c-ia', status: 'feito', tags: ['resumo'],
      descricao: 'Prompt curto para resumir qualquer texto.',
      texto: 'Resuma o texto abaixo em 5 tópicos curtos, em português simples, destacando o que é mais importante:\n\n[COLE O TEXTO AQUI]' }),
    mk({ tipo: 'comando', titulo: 'Ver quem está usando uma porta (Mac)', categoria: 'c-trabalho', tags: ['terminal', 'mac'],
      descricao: 'Descobre qual programa está ocupando a porta.', texto: 'lsof -i :4322' }),
    mk({ tipo: 'instrucao', titulo: 'Checklist de entrega', categoria: 'c-trabalho', status: 'andamento', tags: ['entrega'],
      checklist: [{ t: 'Revisar textos', feito: true }, { t: 'Exportar nos formatos certos', feito: false }, { t: 'Enviar e confirmar recebimento', feito: false }] }),
    mk({ tipo: 'link', titulo: 'Documentação do Node.js', categoria: 'c-estudo', tags: ['docs'], texto: 'https://nodejs.org/docs/latest/api/' }),
  ];
  d.tarefas = [
    normTarefa({ texto: 'Explorar o Backpack', data: dia(0), prio: 'media' }),
    normTarefa({ texto: 'Guardar meu primeiro PDF', data: dia(1), prio: 'baixa' }),
  ];
  return d;
}

// ---------- pacotes de conteúdo (pasta exemplos/): entram uma vez só ----------
function aplicarPacotes(db) {
  const dir = path.join(ROOT, 'exemplos');
  let mudou = false;
  let arquivos = [];
  try { arquivos = fs.readdirSync(dir).filter((f) => f.endsWith('.json')); } catch (_) { return false; }
  for (const f of arquivos) {
    let p;
    try { p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) { continue; }
    if (!p.id || db.pacotes.includes(p.id)) continue;
    if (p.categoria && !db.categorias.find((c) => c.id === p.categoria.id)) db.categorias.push(normCategoria(p.categoria));
    arr(p.itens).forEach((v, i) => {
      const anexos = [];
      for (const a of arr(v.arquivos)) {
        const src = path.join(dir, path.basename(p.pasta || ''), path.basename(a));
        if (!fs.existsSync(src)) continue;
        const arquivo = `${uid()}-${nomeSeguro(a)}`;
        try { fs.copyFileSync(src, path.join(ANEXOS, arquivo)); anexos.push({ nome: a, arquivo, tamanho: fs.statSync(src).size }); } catch (_) {}
      }
      db.itens.push(normItem({ ...v, id: `${p.id}-${i}`, anexos, categoria: p.categoria ? p.categoria.id : '' }));
    });
    db.pacotes.push(p.id);
    mudou = true;
  }
  return mudou;
}

module.exports = {
  normItem, normTarefa, normCliente, normFin,
  ROOT, DATA, DB, ANEXOS, BACKUPS, TIPOS, MODELOS_IA, uid, nomeSeguro, dataLocal,
  padrao, migrar, ler, gravar, backupDiario, listarBackups, aplicarPacotes,
};
