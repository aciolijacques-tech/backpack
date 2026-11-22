// Backpack — IA. Usa o Claude Code ou o Codex já instalados e logados no computador (a assinatura da
// pessoa, sem chave), ou uma chave da API do Claude guardada em data/segredos.json.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const cp = require('child_process');
const { DATA, MODELOS_IA } = require('./dados');

const SEGREDOS = path.join(DATA, 'segredos.json');
const { claude: CLAUDE, codex: GPT } = MODELOS_IA;
const MODELOS = [...CLAUDE, ...GPT];
// modelo do motor pedido, no mesmo nível do modelo escolhido
function modeloPara(motor, m) {
  const i = [CLAUDE, GPT].map((L) => L.indexOf(m)).find((x) => x >= 0) ?? 1;
  return (motor === 'codex' ? GPT : CLAUDE)[i];
}
const ACABOU = /usage limit|limit reached|hit your (usage )?limit|rate.?limit|quota|credit balance|too many requests|\b429\b/i;
const erroLimite = (msg) => Object.assign(new Error(msg), { limite: true });
const lerSegredos = () => { try { return JSON.parse(fs.readFileSync(SEGREDOS, 'utf8')); } catch (_) { return {}; } };
function gravarSegredos(s) {
  const tmp = `${SEGREDOS}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s), { mode: 0o600 });
  fs.renameSync(tmp, SEGREDOS);
}

// apps abertos pelo launchd/Finder não herdam o PATH do Terminal; no Windows, o npm instala em %APPDATA%\\npm
const WIN = process.platform === 'win32';
const PATH_EXTRA = WIN
  ? [path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'npm'), path.join(os.homedir(), '.local', 'bin')]
  : ['/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local/bin'),
    path.join(os.homedir(), '.claude/local'), path.join(os.homedir(), '.npm-global/bin')];
// BACKPACK_IA_PATH: os testes trocam o Claude Code e o Codex por programas falsos
const ENV = { ...process.env, PATH: process.env.BACKPACK_IA_PATH || [...PATH_EXTRA, process.env.PATH || process.env.Path || ''].join(path.delimiter) };

// No Windows, "claude" e "codex" costumam ser atalhos .cmd do npm, que o Node não roda sem shell (e com
// shell as aspas do texto quebram). Então achamos o .exe, ou o script .js que o .cmd chama, e rodamos direto.
function comando(nome) {
  if (!WIN) return { bin: nome, pre: [] };
  for (const dir of ENV.PATH.split(';').filter(Boolean)) {
    const exe = path.join(dir, `${nome}.exe`);
    if (fs.existsSync(exe)) return { bin: exe, pre: [] };
    const cmd = path.join(dir, `${nome}.cmd`);
    if (fs.existsSync(cmd)) {
      const m = /%~?dp0%?\\([^"%\r\n]+?\.(?:js|mjs|cjs))/i.exec(fs.readFileSync(cmd, 'utf8'));
      if (m && fs.existsSync(path.join(dir, m[1]))) return { bin: process.execPath, pre: [path.join(dir, m[1])] };
    }
  }
  return { bin: nome, pre: [] };
}

const ACOES = {
  melhorar: 'Melhore o texto: mais claro, direto e bem escrito, mantendo o sentido, o idioma e o tamanho aproximado.',
  corrigir: 'Corrija ortografia, gramática e pontuação. Não mude o estilo nem o conteúdo.',
  resumir: 'Resuma o texto em poucos tópicos curtos, no mesmo idioma.',
  encurtar: 'Deixe o texto mais curto, cortando o que sobra e mantendo o essencial.',
  prompt: 'O texto é um prompt para uma IA. Reescreva-o para ficar mais claro e eficaz: diga o objetivo, o contexto, o formato da resposta e as restrições. Mantenha os marcadores entre colchetes.',
  checklist: 'Transforme o texto em uma lista de passos práticos, um por linha, sem numeração nem marcadores.',
  titulo: 'Sugira um título curto (até 8 palavras) para o texto. Responda só com o título.',
};
const SISTEMA = 'Você é o assistente de escrita de um app pessoal de notas chamado Backpack. Responda só com o texto final, pronto para colar: sem introdução, sem explicação, sem aspas em volta e sem cercas de código. Use o idioma do texto (por padrão, português do Brasil).';

const cache = {};
function detectar(nome, forcar) {
  if (cache[nome] && !forcar) return cache[nome];
  try {
    const c = comando(nome);
    const out = cp.execFileSync(c.bin, [...c.pre, '--version'], { encoding: 'utf8', timeout: 15000, env: ENV, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    cache[nome] = { ok: !!out.trim(), versao: (out.match(/\d+\.\d+[\d.]*/) || [''])[0] };
  } catch (_) { cache[nome] = { ok: false }; }
  return cache[nome];
}

// pasta vazia como diretório de trabalho: a IA não enxerga nenhum projeto
const pastaVazia = (n) => { const d = path.join(os.tmpdir(), `backpack-${n}`); fs.mkdirSync(d, { recursive: true }); return d; };

function rodar(bin, args, entrada, cwd) {
  return new Promise((ok) => {
    const c = comando(bin);
    const ch = cp.spawn(c.bin, [...c.pre, ...args], { cwd, env: ENV, windowsHide: true });
    const out = [], err = [];
    const t = setTimeout(() => ch.kill(), 240000);
    ch.stdout.on('data', (c) => out.push(c));
    ch.stderr.on('data', (c) => err.push(c));
    ch.on('error', (e) => { clearTimeout(t); ok({ code: -1, out: '', err: e.message }); });
    ch.on('close', (code) => { clearTimeout(t); ok({ code, out: Buffer.concat(out).toString('utf8').trim(), err: Buffer.concat(err).toString('utf8').trim() }); });
    ch.stdin.end(entrada);
  });
}

async function viaClaudeCode(modelo, usuario) {
  const dir = pastaVazia('claude');
  const base = ['-p', '--output-format', 'json', '--model', modelo, '--system-prompt', SISTEMA];
  // sem ferramentas, sem MCP e sem sessão salva; versões antigas do CLI podem não ter essas opções
  let r = await rodar('claude', [...base, '--tools', '', '--no-session-persistence', '--strict-mcp-config'], usuario, dir);
  if (r.code !== 0 && /unknown option|unrecognized/i.test(r.err)) r = await rodar('claude', [...base, '--disallowedTools', 'Bash,Edit,Write,WebFetch'], usuario, dir);
  let j = null;
  try { j = JSON.parse(r.out.slice(r.out.indexOf('{'))); } catch (_) {}
  if (j && !j.is_error && j.result) return { texto: String(j.result).trim(), via: 'claude', modelo };
  const msg = (j && j.result) || r.err || r.out || `código ${r.code}`;
  if (r.code === -1) throw new Error('Não achei o Claude Code neste computador.');
  if (ACABOU.test(msg)) throw erroLimite('O Claude Code chegou ao limite de uso da assinatura.');
  if (/log ?in|auth/i.test(msg)) throw new Error('O Claude Code não está logado. Abra o Terminal (no Windows, o PowerShell), rode "claude" e faça o login.');
  throw new Error(`O Claude Code respondeu com erro: ${String(msg).slice(0, 300)}`);
}

async function viaCodex(modelo, usuario) {
  const dir = pastaVazia('codex');
  const saida = path.join(dir, 'resposta.txt');
  try { fs.writeFileSync(saida, ''); } catch (_) {}
  const r = await rodar('codex', ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never', '-m', modelo, '-C', dir, '-o', saida, '-'], `${SISTEMA}\n\n${usuario}`, dir);
  let txt = '';
  try { txt = fs.readFileSync(saida, 'utf8').trim(); } catch (_) {}
  if (r.code === 0 && txt) return { texto: txt, via: 'codex', modelo };
  if (r.code === -1) throw new Error('Não achei o Codex neste computador.');
  if (ACABOU.test(`${r.err}\n${r.out}`)) throw erroLimite('O Codex chegou ao limite de uso da assinatura.');
  if (/log ?in|auth|unauthorized/i.test(r.err)) throw new Error('O Codex não está logado. Abra o Terminal, rode "codex" e faça o login.');
  throw new Error(`O Codex respondeu com erro: ${(r.err.split('\n').slice(-3).join(' ') || `código ${r.code}`).slice(0, 300)}`);
}

function viaApi(chave, modelo, usuario) {
  const corpo = Buffer.from(JSON.stringify({ model: modelo, max_tokens: 8000, system: SISTEMA, messages: [{ role: 'user', content: usuario }] }));
  return new Promise((ok, no) => {
    const rq = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST', timeout: 180000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': corpo.length, 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
    }, (rs) => {
      const partes = [];
      rs.on('data', (c) => partes.push(c));
      rs.on('end', () => {
        let j = {};
        try { j = JSON.parse(Buffer.concat(partes).toString('utf8')); } catch (_) {}
        const st = rs.statusCode;
        if (st === 401) return no(new Error('A chave da API não foi aceita. Confira nas Configurações.'));
        if (st === 429) return no(erroLimite('Muitos pedidos ou sem crédito na conta. Tente de novo daqui a pouco.'));
        if (st >= 500) return no(new Error('O Claude está sobrecarregado agora. Tente de novo em instantes.'));
        if (st !== 200) return no(new Error((j.error && j.error.message) || `Erro ${st} na API.`));
        const texto = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
        if (!texto) return no(new Error('A resposta veio vazia.'));
        ok({ texto, via: 'api', modelo: j.model, cortado: j.stop_reason === 'max_tokens' });
      });
    });
    rq.on('timeout', () => rq.destroy(new Error('Demorou demais. Tente de novo.')));
    rq.on('error', (e) => no(new Error(e.code === 'ENOTFOUND' ? 'Sem internet.' : e.message)));
    rq.end(corpo);
  });
}

function status(forcar) {
  return { temChave: !!lerSegredos().anthropicKey, modelos: MODELOS, claude: detectar('claude', forcar), codex: detectar('codex', forcar) };
}

function guardarChave(chave) {
  const s = lerSegredos();
  const k = String(chave || '').trim();
  if (k) s.anthropicKey = k; else delete s.anthropicKey;
  gravarSegredos(s);
  return { temChave: !!k };
}

const NOMES = { claude: 'o Claude Code', codex: 'o Codex', api: 'a chave da API do Claude' };
const OUTRO = { claude: 'codex', codex: 'claude' };

// cfg = config.ia do db; pedido = { acao, pedido, texto, via }
// Um motor ligado por vez. Se ele não estiver instalado, ou se o limite de uso acabar, tenta o outro
// motor e depois a chave da API, sempre com o modelo do mesmo nível.
async function pedir(cfg, b) {
  const chave = lerSegredos().anthropicKey;
  const ligadas = cfg.ligadas || {};
  const ligado = ['claude', 'codex', 'api'].includes(b.via) ? b.via : ['claude', 'codex'].find((n) => ligadas[n] !== false);
  const fila = (ligado && ligado !== 'api' ? [ligado, OUTRO[ligado], 'api'] : ['api'])
    .filter((n) => (n === 'api' ? !!chave : detectar(n).ok));
  if (!fila.length) {
    if (!ligado) throw new Error('A IA está desligada. Ligue o Claude Code ou o Codex nas Configurações.');
    throw new Error('Nenhuma IA encontrada. Instale o Claude Code ou o Codex, ou coloque uma chave da API do Claude nas Configurações.');
  }
  const texto = String(b.texto || '').slice(0, 100000);
  const inst = b.acao === 'livre' ? String(b.pedido || '').trim().slice(0, 2000) : ACOES[b.acao];
  if (!inst) throw new Error('Escreva o que você quer que a IA faça.');
  const escolhido = MODELOS.includes(cfg.modelo) ? cfg.modelo : CLAUDE[1];
  const usuario = texto.trim() ? `Pedido: ${inst}\n\n<texto>\n${texto}\n</texto>` : `Pedido: ${inst}`;
  let limite = null;
  for (const motor of fila) {
    const modelo = modeloPara(motor, escolhido);
    try {
      const r = motor === 'claude' ? await viaClaudeCode(modelo, usuario)
        : motor === 'codex' ? await viaCodex(modelo, usuario) : await viaApi(chave, modelo, usuario);
      if (limite) r.aviso = `${limite.message} Desta vez usei ${NOMES[motor]}.`;
      return r;
    } catch (e) {
      if (limite && !e.limite) throw new Error(`${limite.message} Tentei ${NOMES[motor]}, mas: ${e.message}`);
      if (!e.limite) throw e;
      limite = limite || e;
    }
  }
  throw new Error(fila.length > 1 ? `${limite.message} Os outros motores também estão sem limite agora.` : limite.message);
}

module.exports = { status, guardarChave, pedir, lerSegredos, gravarSegredos, MODELOS };
