// Backpack — servidor local (só módulos nativos do Node). Escuta só em 127.0.0.1.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const D = require('./lib/dados');
const FOCO = require('./lib/foco');
const IA = require('./lib/ia');
const INT = require('./lib/integracoes');
const DRIVE = require('./lib/drive');
const UPD = require('./lib/atualizar');
const EXP = require('./lib/exportar');
const CNX = require('./lib/conexoes');
const REDE = require('./lib/rede');
const LEMB = require('./lib/lembretes');

const PORTA = Number(process.env.BACKPACK_PORTA) || 4322;
const PORTA_TLS = PORTA + 1; // celular: só HTTPS, só com "Usar no celular" ligado
const PUBLIC = path.join(D.ROOT, 'public');
const MAX_JSON = 30 * 1024 * 1024;
const MAX_ANEXO = 1024 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
// anexos que podem abrir dentro do app; o resto sempre baixa (evita HTML/script rodando na origem do app)
const MIME_ANEXO = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.markdown': 'text/plain; charset=utf-8',
  '.csv': 'text/plain; charset=utf-8', '.json': 'text/plain; charset=utf-8', '.log': 'text/plain; charset=utf-8',
};
// A voz (Whisper) baixa a biblioteca e o modelo uma vez do jsDelivr e do Hugging Face; o áudio não sai do Mac.
const FORA_VOZ = 'https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co';
const CSP = `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'`;
const CSP_VOZ = `default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; connect-src 'self' blob: data: ${FORA_VOZ}; worker-src 'self' blob:`;
// rotas que só o próprio Mac usa (nunca o celular)
const SO_MAC = ['/api/desligar', '/api/reinstalar', '/api/abrir', '/api/abrir-pasta', '/api/mostrar', '/api/atualizacao/aplicar', '/api/rede', '/api/ia/chave', '/api/int/salvar', '/api/restaurar', '/api/drive/', '/api/aviso-teste', '/api/conexoes', '/api/ambientes/'];
const soMac = (p, m) => SO_MAC.some((x) => (x.endsWith('/') ? p.startsWith(x) : p === x || p.startsWith(`${x}/`))) && !(p.startsWith('/api/ambientes/') && m === 'GET');

// ---------- utilitários ----------
function enviar(res, code, corpo, tipo) {
  const dados = Buffer.from(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
  res.writeHead(code, { 'Content-Type': tipo || 'application/json; charset=utf-8', 'Content-Length': dados.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(dados);
}

function lerCorpo(req, max = MAX_JSON) {
  return new Promise((ok, no) => {
    const partes = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > max) { no(Object.assign(new Error('Grande demais.'), { code: 413 })); req.destroy(); return; }
      partes.push(c);
    });
    req.on('end', () => ok(Buffer.concat(partes).toString('utf8')));
    req.on('error', no);
  });
}
async function lerJson(req) {
  const txt = await lerCorpo(req);
  if (!txt) return {};
  try { return JSON.parse(txt); } catch (_) { throw Object.assign(new Error('JSON inválido.'), { code: 400 }); }
}

const arquivoAnexo = (nome) => {
  const full = path.join(D.ANEXOS, path.basename(String(nome || '')));
  return full.startsWith(D.ANEXOS + path.sep) && fs.existsSync(full) ? full : null;
};
// nome original: tira o prefixo "<id>-" (anexos antigos usam UUID com hífens)
const nomeOriginal = (base) => {
  const m = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i.exec(base);
  if (m) return m[1];
  const i = base.indexOf('-');
  return i > 0 ? base.slice(i + 1) : base;
};

function servirArquivo(res, full, extras = {}) {
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return enviar(res, 404, { erro: 'não encontrado' });
    res.writeHead(200, { 'Content-Length': st.size, 'X-Content-Type-Options': 'nosniff', ...extras });
    fs.createReadStream(full).pipe(res);
  });
}

function servirAnexo(res, u, nome) {
  const full = arquivoAnexo(decodeURIComponent(nome));
  if (!full) return enviar(res, 404, { erro: 'não encontrado' });
  const base = path.basename(full);
  const original = D.nomeSeguro(u.searchParams.get('nome') || nomeOriginal(base));
  const ext = path.extname(base).toLowerCase();
  const tipo = MIME_ANEXO[ext];
  const baixar = u.searchParams.get('download') === '1' || !tipo;
  const ascii = original.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  const extras = {
    'Content-Type': tipo || 'application/octet-stream',
    'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(original)}`,
  };
  if (ext === '.svg') extras['Content-Security-Policy'] = 'sandbox; default-src \'none\'; style-src \'unsafe-inline\'';
  servirArquivo(res, full, extras);
}

// ---------- estado em memória (o arquivo é a fonte; a revisão evita uma janela apagar a outra) ----------
let { db } = D.ler();
if (D.aplicarPacotes(db) || !fs.existsSync(D.DB)) D.gravar(db);
D.backupDiario();

// ---------- rotas da API ----------
async function api(req, res, u, p) {
  const m = req.method;
  if (p === '/api/ping') return enviar(res, 200, { ok: true, app: 'backpack', versao: UPD.local().versao, remoto: !REDE.doMac(req) });
  if (p === '/api/rev' && m === 'GET') return enviar(res, 200, { rev: db.rev });
  // primeiro nome de quem usa o Mac (nome completo da conta do macOS; senão, o nome de usuário)
  if (p === '/api/usuario' && m === 'GET') {
    let nome = '';
    if (process.platform === 'darwin') { try { nome = cp.execFileSync('id', ['-F'], { timeout: 3000 }).toString().trim(); } catch (_) {} }
    if (!nome) { try { nome = require('os').userInfo().username; } catch (_) {} }
    const primeiro = String(nome).split(/[\s._-]+/)[0] || '';
    return enviar(res, 200, { nome: primeiro ? primeiro.charAt(0).toUpperCase() + primeiro.slice(1) : '' });
  }

  // dados
  if (p === '/api/db' && m === 'GET') return enviar(res, 200, db);
  if (p === '/api/db' && m === 'PUT') {
    const novo = await lerJson(req);
    if (Number(novo.rev) !== db.rev) return enviar(res, 409, { erro: 'Os dados mudaram em outra janela.', rev: db.rev });
    const limpo = D.migrar(novo);
    limpo.rev = db.rev + 1;
    D.gravar(limpo);
    db = limpo;
    D.backupDiario();
    return enviar(res, 200, { ok: true, rev: db.rev });
  }
  if (p === '/api/backup' && m === 'GET') {
    res.setHeader('Content-Disposition', `attachment; filename="backpack-backup-${D.dataLocal()}.json"`);
    return enviar(res, 200, JSON.stringify(db, null, 1));
  }
  if (p === '/api/backup/senha' && m === 'POST') {
    const { senha } = await lerJson(req);
    if (!senha || String(senha).length < 6) return enviar(res, 400, { erro: 'Use uma senha com pelo menos 6 caracteres.' });
    res.setHeader('Content-Disposition', `attachment; filename="backpack-backup-${D.dataLocal()}.backpack"`);
    return enviar(res, 200, JSON.stringify(EXP.cifrar(JSON.stringify(db), senha)));
  }
  if (p === '/api/exportar-md' && m === 'GET') {
    const buf = EXP.markdown(db, u.searchParams.get('anexos') !== '0');
    res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': buf.length, 'Content-Disposition': `attachment; filename="backpack-markdown-${D.dataLocal()}.zip"`, 'Cache-Control': 'no-store' });
    return res.end(buf);
  }
  if (p === '/api/restaurar' && m === 'POST') {
    let b = await lerJson(req);
    if (b && b.formato === 'backpack-cripto') {
      try { b = JSON.parse(EXP.decifrar(b, b.senha || '')); } catch (e) { return enviar(res, 400, { erro: e.message }); }
    }
    if (!b || (!Array.isArray(b.itens) && !Array.isArray(b.items))) return enviar(res, 400, { erro: 'Esse arquivo não parece um backup do Backpack.' });
    if (fs.existsSync(D.DB)) fs.copyFileSync(D.DB, path.join(D.BACKUPS, `antes-de-restaurar-${Date.now()}.json`));
    const limpo = D.migrar(b);
    limpo.rev = db.rev + 1;
    D.gravar(limpo);
    db = limpo;
    return enviar(res, 200, { ok: true, rev: db.rev });
  }

  // anexos
  if (p === '/api/anexos' && m === 'POST') {
    const nome = D.nomeSeguro(u.searchParams.get('nome'));
    const arquivo = `${D.uid()}-${nome}`;
    const destino = path.join(D.ANEXOS, arquivo);
    await new Promise((ok, no) => {
      let total = 0;
      const ws = fs.createWriteStream(destino);
      req.on('data', (c) => { total += c.length; if (total > MAX_ANEXO) { req.destroy(); ws.destroy(); no(Object.assign(new Error('Arquivo maior que 1 GB.'), { code: 413 })); } });
      req.pipe(ws);
      ws.on('finish', ok); ws.on('error', no); req.on('error', no);
    }).catch((e) => { try { fs.unlinkSync(destino); } catch (_) {} throw e; });
    return enviar(res, 200, { arquivo, nome, tamanho: fs.statSync(destino).size, mime: String(req.headers['content-type'] || '').slice(0, 120) });
  }
  const mAnexo = /^\/api\/anexos\/(.+)$/.exec(p);
  if (mAnexo && m === 'GET') return servirAnexo(res, u, mAnexo[1]);
  if ((p === '/api/abrir' || p === '/api/mostrar') && m === 'POST') {
    const full = arquivoAnexo((await lerJson(req)).arquivo);
    if (!full) return enviar(res, 404, { erro: 'Arquivo não encontrado.' });
    if (process.platform !== 'darwin') return enviar(res, 400, { erro: 'Abrir no programa só funciona no macOS.' });
    cp.spawn('open', p === '/api/abrir' ? [full] : ['-R', full], { detached: true, stdio: 'ignore' }).unref();
    return enviar(res, 200, { ok: true });
  }

  // pasta do cliente no Finder (link de nuvem abre no navegador pelo app)
  if (p === '/api/abrir-pasta' && m === 'POST') {
    let pasta = String((await lerJson(req)).pasta || '').trim();
    if (pasta.startsWith('~')) pasta = path.join(require('os').homedir(), pasta.slice(1));
    let ok = false; try { ok = path.isAbsolute(pasta) && fs.statSync(pasta).isDirectory(); } catch (_) {}
    if (!ok) return enviar(res, 404, { erro: 'Não achei essa pasta neste Mac.' });
    if (process.platform !== 'darwin') return enviar(res, 400, { erro: 'Abrir pasta só funciona no macOS.' });
    cp.spawn('open', [pasta], { detached: true, stdio: 'ignore' }).unref();
    return enviar(res, 200, { ok: true });
  }

  // ambientes do fundo: casa, escritório e aula. Foto da pessoa fica em data/ambientes (sobrevive à atualização)
  const mAmb = /^\/api\/ambientes\/(casa|escritorio|aula)$/.exec(p);
  if (mAmb) {
    const dir = path.join(D.DATA, 'ambientes');
    const propria = ['.jpg', '.png', '.webp'].map((e) => path.join(dir, mAmb[1] + e)).find((f) => fs.existsSync(f));
    if (m === 'GET') {
      const arq = propria || path.join(PUBLIC, 'ambientes', `${mAmb[1]}.jpg`);
      return servirArquivo(res, arq, { 'Content-Type': MIME[path.extname(arq)] || 'image/jpeg', 'Cache-Control': 'no-cache' });
    }
    if (m === 'POST') {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[String(req.headers['content-type'] || '').split(';')[0]];
      if (!ext) return enviar(res, 400, { erro: 'Use uma imagem JPG, PNG ou WEBP.' });
      const dados = await new Promise((ok, no) => {
        const partes = []; let total = 0;
        req.on('data', (c) => { total += c.length; if (total > 20 * 1024 * 1024) { req.destroy(); no(Object.assign(new Error('Imagem maior que 20 MB.'), { code: 413 })); } else partes.push(c); });
        req.on('end', () => ok(Buffer.concat(partes))); req.on('error', no);
      });
      fs.mkdirSync(dir, { recursive: true });
      for (const e of ['.jpg', '.png', '.webp']) { try { fs.unlinkSync(path.join(dir, mAmb[1] + e)); } catch (_) {} }
      fs.writeFileSync(path.join(dir, mAmb[1] + ext), dados);
      return enviar(res, 200, { ok: true });
    }
    if (m === 'DELETE') {
      for (const e of ['.jpg', '.png', '.webp']) { try { fs.unlinkSync(path.join(dir, mAmb[1] + e)); } catch (_) {} }
      return enviar(res, 200, { ok: true });
    }
  }

  // foco
  if (p === '/api/foco' && m === 'GET') return enviar(res, 200, FOCO.estado());
  if (p === '/api/foco/iniciar' && m === 'POST') return enviar(res, 200, FOCO.iniciar((await lerJson(req)).min));
  if (p === '/api/foco/parar' && m === 'POST') { FOCO.parar(); return enviar(res, 200, { ok: true }); }
  if (p === '/api/foco/resgatar' && m === 'POST') return enviar(res, 200, { n: FOCO.resgatar() });
  if (p === '/api/aviso-teste' && m === 'POST') { FOCO.avisar('Backpack', 'É assim que o aviso do foco aparece.'); return enviar(res, 200, { ok: true }); }

  // IA
  if (p === '/api/ia/status' && m === 'GET') return enviar(res, 200, IA.status(u.searchParams.get('checar') === '1'));
  if (p === '/api/ia/chave' && m === 'POST') return enviar(res, 200, IA.guardarChave((await lerJson(req)).chave));
  if (p === '/api/ia' && m === 'POST') {
    try { return enviar(res, 200, await IA.pedir(db.config.ia, await lerJson(req))); } catch (e) { return enviar(res, 502, { erro: e.message }); }
  }

  // integrações
  if (p === '/api/int/status' && m === 'GET') {
    const x = IA.lerSegredos(), n = x.notion || {}, t = x.trello || {};
    return enviar(res, 200, {
      notion: { ok: !!(n.token && n.alvo), temToken: !!n.token, alvoNome: n.alvoNome || '' },
      trello: { ok: !!(t.key && t.token && t.alvo), temChave: !!(t.key && t.token), alvoNome: t.alvoNome || '' },
    });
  }
  if (p.startsWith('/api/int/') && m === 'POST') {
    const b = await lerJson(req);
    const x = IA.lerSegredos();
    try {
      if (p === '/api/int/notion/paginas') return enviar(res, 200, { paginas: await INT.notionPaginas(b.token || (x.notion || {}).token || '') });
      if (p === '/api/int/trello/listas') { const o = x.trello || {}; return enviar(res, 200, { listas: await INT.trelloListas(b.key || o.key || '', b.token || o.token || '') }); }
      if (p === '/api/int/salvar') {
        for (const k of ['notion', 'trello']) {
          if (!(k in b)) continue;
          if (b[k] === null) { delete x[k]; continue; }
          const novo = { ...(x[k] || {}) };
          for (const [kk, v] of Object.entries(b[k] || {})) if (v) novo[kk] = String(v).slice(0, 2000);
          x[k] = novo;
        }
        IA.gravarSegredos(x);
        return enviar(res, 200, { ok: true });
      }
      const mi = /^\/api\/int\/(notion|trello)\/enviar$/.exec(p);
      if (mi && b.cliente) {
        // cliente vira um cartão com contatos, anotações e as tarefas abertas
        const c = db.clientes.find((x) => x.id === b.cliente);
        if (!c) return enviar(res, 404, { erro: 'Cliente não encontrado.' });
        const cfg = x[mi[1]] || {};
        if (!cfg.alvo) return enviar(res, 400, { erro: 'Conecte nas Configurações primeiro.' });
        const contatos = [['Empresa', c.empresa], ['WhatsApp', c.whats], ['E-mail', c.email], ['Instagram', c.insta], ['Site', c.site], ['Pasta', c.pasta]].filter((k) => k[1]).map((k) => `${k[0]}: ${k[1]}`).join('\n');
        const it = D.normItem({
          tipo: 'nota', titulo: c.nome || 'Cliente', descricao: contatos, texto: c.notas, tags: c.tags,
          checklist: db.tarefas.filter((t) => t.cliente === c.id && !t.feita).map((t) => ({ t: `${t.texto}${t.data ? ` (${t.data})` : ''}` })),
          links: [c.site, c.trello].filter((u) => /^https?:\/\//i.test(u || '')).map((url) => ({ url })),
        });
        return enviar(res, 200, mi[1] === 'notion' ? await INT.notionEnviar(cfg, it) : await INT.trelloEnviar(cfg, it));
      }
      if (mi) {
        const it = db.itens.find((i) => i.id === b.id);
        if (!it) return enviar(res, 404, { erro: 'Item não encontrado.' });
        const cfg = x[mi[1]] || {};
        if (!cfg.alvo) return enviar(res, 400, { erro: 'Conecte nas Configurações primeiro.' });
        return enviar(res, 200, mi[1] === 'notion' ? await INT.notionEnviar(cfg, it) : await INT.trelloEnviar(cfg, it));
      }
    } catch (e) { return enviar(res, 502, { erro: e.message }); }
  }

  // Google Drive
  if (p === '/api/drive/encontrar' && m === 'GET') return enviar(res, 200, { pastas: DRIVE.encontrar() });
  if (p === '/api/drive/sincronizar' && m === 'POST') {
    try { return enviar(res, 200, DRIVE.sincronizar(db)); } catch (e) { return enviar(res, 400, { erro: e.message }); }
  }

  // versão e atualização
  if (p === '/api/versao' && m === 'GET') return enviar(res, 200, { ...UPD.local(), appMac: UPD.appMac() });
  if (p === '/api/reinstalar' && m === 'POST') {
    if (process.platform !== 'darwin') return enviar(res, 400, { erro: 'Só no macOS.' });
    UPD.reinstalar(); return enviar(res, 200, { ok: true });
  }
  if (p === '/api/atualizacao' && m === 'GET') return enviar(res, 200, await UPD.checar(u.searchParams.get('forcar') === '1'));
  if (p === '/api/atualizacao/aplicar' && m === 'POST') {
    try { const v = await UPD.aplicar(); enviar(res, 200, { ok: true, versao: v }); UPD.reiniciar(); return undefined; }
    catch (e) { return enviar(res, 500, { erro: e.message }); }
  }

  // conexões: códigos para outros programas do Mac mandarem itens
  if (p === '/api/conexoes' && m === 'GET') return enviar(res, 200, { formato: CNX.FORMATO, porta: PORTA, conexoes: CNX.listar() });
  if (p === '/api/conexoes' && m === 'POST') return enviar(res, 200, CNX.criar((await lerJson(req)).nome));
  if (p === '/api/conexoes/mudar' && m === 'POST') { const b = await lerJson(req); return enviar(res, 200, CNX.mudar(b.id, b) || { erro: 'não achei' }); }
  if (p === '/api/conexoes/apagar' && m === 'POST') { CNX.apagar((await lerJson(req)).id); return enviar(res, 200, { ok: true }); }

  // usar no celular
  if (p === '/api/rede' && m === 'GET') return enviar(res, 200, REDE.status(PORTA_TLS, erroRede));
  if (p === '/api/rede' && m === 'POST') {
    REDE.ligar((await lerJson(req)).on);
    await ouvirCelular();
    if (erroRede) REDE.ligar(false);
    return enviar(res, erroRede ? 500 : 200, erroRede ? { erro: erroRede } : REDE.status(PORTA_TLS));
  }
  if (p === '/api/rede/trocar' && m === 'POST') { REDE.trocar(); return enviar(res, 200, REDE.status(PORTA_TLS)); }

  if (p === '/api/desligar' && m === 'POST') {
    enviar(res, 200, { ok: true });
    setTimeout(() => process.exit(0), 250);
    return undefined;
  }
  return enviar(res, 404, { erro: 'rota não encontrada' });
}

// ---------- servidor ----------
// Host aceito: 127.0.0.1/localhost na porta do app (HTTP) e, com o celular ligado, os endereços deste
// Mac na porta HTTPS. Isso bloqueia "DNS rebinding" (site de fora apontando um nome para 127.0.0.1).
function hostValido(h, tls) {
  const m = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/.exec(String(h || '').toLowerCase());
  if (!m) return false;
  const nome = m[1].replace(/^\[|\]$/g, '');
  if (tls) return Number(m[2] || 443) === PORTA_TLS && REDE.cfg.on && REDE.hostOk(nome);
  return Number(m[2] || 80) === PORTA && (nome === '127.0.0.1' || nome === 'localhost');
}
const origemValida = (o, tls) => !o || (String(o).startsWith(tls ? 'https://' : 'http://') && hostValido(String(o).replace(/^https?:\/\//, ''), tls));

// entrada de outros programas: cabeçalho X-Backpack-Conexao com o código; só do próprio Mac
async function entrada(req, res, p) {
  const origem = req.headers.origin;
  const cors = origem ? { 'Access-Control-Allow-Origin': origem, Vary: 'Origin' } : {};
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, X-Backpack-Conexao', 'Access-Control-Max-Age': '600' });
    return res.end();
  }
  const cx = CNX.achar(req.headers['x-backpack-conexao']);
  if (!cx) return enviar(res, 401, { erro: 'Código de conexão inválido ou desligado.' });
  for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
  if (p === '/api/entrada/ping' && req.method === 'GET') return enviar(res, 200, { ok: true, app: 'backpack', versao: UPD.local().versao, formato: CNX.FORMATO });
  if (p === '/api/entrada' && req.method === 'POST') {
    const txt = await lerCorpo(req, 8 * 1024 * 1024);
    let corpo; try { corpo = JSON.parse(txt || '{}'); } catch (_) { return enviar(res, 400, { erro: 'JSON inválido.' }); }
    const r = CNX.receber(db, cx, corpo);
    db.rev += 1; D.gravar(db);
    CNX.usou(cx.id, r.itens.length);
    return enviar(res, 200, r);
  }
  return enviar(res, 404, { erro: 'rota não encontrada' });
}

async function app(req, res) {
  try {
    const tls = !!req.socket.encrypted;
    if (!hostValido(req.headers.host, tls)) return enviar(res, 403, { erro: 'host' });
    const u = new URL(req.url, 'http://x');
    const p = u.pathname;
    const doMac = REDE.doMac(req);

    if (p === '/api/entrada' || p === '/api/entrada/ping') {
      if (!doMac) return enviar(res, 403, { erro: 'Só programas deste Mac.' });
      return await entrada(req, res, p);
    }

    // certificado deste Mac (público): o celular instala uma vez para confiar no HTTPS
    if (p === '/backpack-ca.crt') {
      const pem = REDE.caPem();
      if (!pem) return enviar(res, 404, { erro: 'Ligue “Usar no celular” primeiro.' });
      res.writeHead(200, { 'Content-Type': 'application/x-x509-ca-cert', 'Content-Disposition': 'attachment; filename="Backpack.crt"', 'Content-Length': pem.length });
      return res.end(pem);
    }
    if (p === '/certificado') return enviar(res, 200, REDE.paginaCertificado(), 'text/html; charset=utf-8');
    // celular: entra pelo QR (token) ou pelo código de 6 números
    if (p === '/entrar') {
      if (req.method === 'POST') {
        const pin = new URLSearchParams(await lerCorpo(req, 4096)).get('pin');
        const r = REDE.tentar(req, pin);
        if (r === 'ok') { res.writeHead(302, { 'Set-Cookie': REDE.setCookie(), Location: '/' }); return res.end(); }
        return enviar(res, 401, REDE.paginaEntrar(r === 'travado' ? 'Muitas tentativas. Espere 15 minutos.' : 'Código errado.'), 'text/html; charset=utf-8');
      }
      if (REDE.tokenOk(u.searchParams.get('c') || '')) { res.writeHead(302, { 'Set-Cookie': REDE.setCookie(), Location: '/' }); return res.end(); }
      return enviar(res, 200, REDE.paginaEntrar(), 'text/html; charset=utf-8');
    }
    if (!REDE.autorizado(req)) {
      if (p.startsWith('/api/')) return enviar(res, 401, { erro: 'Entre pelo código do celular.' });
      if (/\.(png|ico)$/.test(p)) { /* ícones aparecem na tela de entrar */ } else { res.writeHead(302, { Location: '/entrar' }); return res.end(); }
    }

    if (p.startsWith('/api/')) {
      if (!doMac && soMac(p, req.method)) return enviar(res, 403, { erro: 'Isso só dá para fazer no Mac onde o Backpack está instalado.' });
      // escrita só com o cabeçalho do app: um site de fora não consegue mandar esse cabeçalho sem permissão (CORS)
      if (req.method !== 'GET' && (req.headers['x-backpack'] !== '1' || !origemValida(req.headers.origin, tls))) {
        return enviar(res, 403, { erro: 'Pedido recusado.' });
      }
      return await api(req, res, u, p);
    }

    const rel = p === '/' ? '/index.html' : decodeURIComponent(p);
    const full = path.normalize(path.join(PUBLIC, rel));
    if (!full.startsWith(PUBLIC + path.sep)) return enviar(res, 403, { erro: 'caminho' });
    const ext = path.extname(full).toLowerCase();
    const extras = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    if (ext === '.html') { extras['Content-Security-Policy'] = CSP; extras['X-Frame-Options'] = 'SAMEORIGIN'; }
    if (rel === '/voz-worker.js') extras['Content-Security-Policy'] = CSP_VOZ;
    return servirArquivo(res, full, extras);
  } catch (e) {
    return enviar(res, e.code === 413 ? 413 : e.code === 400 ? 400 : 500, { erro: String(e.message || e) });
  }
}

// O Mac usa sempre HTTP em 127.0.0.1 (nunca sai do computador). O celular usa uma segunda porta,
// só HTTPS, aberta para a rede apenas com "Usar no celular" ligado.
let server = null, primeira = true, avisouPortaOcupada = false, servCel = null, erroRede = '';
async function ouvirCelular() {
  erroRede = '';
  if (servCel) { const v = servCel; servCel = null; v.close(); if (v.closeAllConnections) v.closeAllConnections(); }
  if (!REDE.cfg.on) return;
  let tls;
  try { tls = REDE.certificado(); } catch (e) {
    erroRede = `Não consegui criar o certificado de segurança (${String(e.message || e).split('\n')[0]}).`;
    console.error(erroRede); return;
  }
  await new Promise((ok) => {
    const s = https.createServer({ key: tls.key, cert: tls.cert }, app);
    s.on('error', (e) => { erroRede = e.code === 'EADDRINUSE' ? `A porta ${PORTA_TLS} está ocupada por outro programa.` : String(e.message); ok(); });
    s.listen(PORTA_TLS, '0.0.0.0', () => { servCel = s; console.log(`Celular liberado: ${REDE.ips().map((i) => `https://${i}:${PORTA_TLS}`).join('  ')}`); ok(); });
  });
}
function ouvir() {
  const host = '127.0.0.1';
  const s = http.createServer(app);
  s.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && primeira) {
      // ligado pelo macOS (Instalar Backpack): espera a porta liberar em vez de cair e ser religado em loop
      if (process.env.BACKPACK_LAUNCHD) {
        if (!avisouPortaOcupada) { console.log(`Porta ${PORTA} ocupada (outro Backpack aberto?). Tentando de novo a cada 30 s.`); avisouPortaOcupada = true; }
        setTimeout(() => s.listen(PORTA, host), 30000);
        return;
      }
      console.log(`O Backpack já está aberto na porta ${PORTA}.`); process.exit(0);
    }
    if (e.code === 'EADDRINUSE') { setTimeout(() => s.listen(PORTA, host), 400); return; }
    console.error(e); process.exit(1);
  });
  s.on('listening', aoLigar);
  server = s;
  s.listen(PORTA, host);
}
// ---------- aviso de versão nova: confere o GitHub ao ligar e a cada 6 h ----------
// Avisa uma vez por versão com a notificação do macOS (funciona com a janela do app fechada).
const AVISADA = path.join(D.DATA, 'versao-avisada.json');
async function conferirVersao() {
  try {
    const r = await UPD.checar(true);
    if (!r.temNova) return;
    let ultima = '';
    try { ultima = JSON.parse(fs.readFileSync(AVISADA, 'utf8')).versao || ''; } catch (_) {}
    if (ultima === r.nova) return;
    FOCO.avisar(`Backpack ${r.nova} disponível`, 'Abra o Backpack para atualizar. Seus itens não são tocados.');
    fs.writeFileSync(AVISADA, JSON.stringify({ versao: r.nova, em: new Date().toISOString() }));
  } catch (_) {}
}

function aoLigar() {
  if (!primeira) return;
  primeira = false;
  ouvirCelular();
  // o IP do Mac pode mudar (outro Wi-Fi): confere a cada 10 min e refaz o certificado se precisar
  setInterval(() => { if (REDE.cfg.on && servCel) { try { const t = REDE.certificado(); servCel.setSecureContext({ key: t.key, cert: t.cert }); } catch (_) {} } }, 600000).unref();
  console.log(`Backpack rodando em http://127.0.0.1:${PORTA}`);
  if (!process.env.BACKPACK_SEM_ATUALIZACAO) {
    setTimeout(conferirVersao, 20000);
    setInterval(conferirVersao, 6 * 3600e3).unref();
  }
  if (!process.env.BACKPACK_SEM_AVISO) setInterval(() => { try { LEMB.conferir(db); } catch (_) {} }, 30000).unref();
}
ouvir();
