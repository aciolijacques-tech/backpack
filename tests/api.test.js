// Backpack — testes da API. Rodar: node --test tests/
// Cada teste sobe um servidor com uma pasta de dados temporária (nunca toca em data/).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
let porta = 4600 + Math.floor(Math.random() * 300);

async function subir(prepararDados, envExtra = {}) {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'backpack-teste-'));
  if (prepararDados) prepararDados(dados);
  const p = porta++;
  const ch = cp.spawn(process.execPath, ['server.js'], {
    cwd: ROOT, stdio: 'ignore',
    env: { ...process.env, BACKPACK_DATA: dados, BACKPACK_PORTA: String(p), BACKPACK_SEM_AVISO: '1', BACKPACK_SEM_ATUALIZACAO: '1', ...envExtra },
  });
  const base = `http://127.0.0.1:${p}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/api/ping`)).ok) break; } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const api = (caminho, opt = {}) => fetch(base + caminho, { ...opt, headers: { 'X-Backpack': '1', 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  return { base, api, dados, parar: () => ch.kill() };
}

test('primeira abertura cria dados de exemplo e revisão', async () => {
  const s = await subir();
  try {
    const db = await (await fetch(`${s.base}/api/db`)).json();
    assert.equal(db.versao, 2);
    assert.ok(db.itens.length >= 3, 'tem itens de exemplo');
    assert.ok(db.tarefas.length >= 1, 'tem tarefas de exemplo');
    assert.equal(typeof db.rev, 'number');
  } finally { s.parar(); }
});

test('escrita sem o cabeçalho do app, de outra origem ou outro host é recusada', async () => {
  const s = await subir();
  try {
    const db = await (await fetch(`${s.base}/api/db`)).json();
    const r1 = await fetch(`${s.base}/api/db`, { method: 'PUT', body: JSON.stringify(db) });
    assert.equal(r1.status, 403, 'sem X-Backpack');
    const r2 = await s.api('/api/db', { method: 'PUT', body: JSON.stringify(db), headers: { Origin: 'https://site-malicioso.com' } });
    assert.equal(r2.status, 403, 'origem de fora');
    const status = await new Promise((ok) => require('http').get(`${s.base}/api/ping`, { headers: { Host: 'atacante.com' } }, (r) => { r.resume(); ok(r.statusCode); }));
    assert.equal(status, 403, 'host de fora (DNS rebinding)');
  } finally { s.parar(); }
});

test('salvar exige a revisão atual e limpa dados inválidos', async () => {
  const s = await subir();
  try {
    const db = await (await fetch(`${s.base}/api/db`)).json();
    db.itens.push({ id: 'x1', tipo: 'tipo-falso', titulo: 'Teste', tags: ['a', 'a', ''], data: 'ontem' });
    const ok = await s.api('/api/db', { method: 'PUT', body: JSON.stringify(db) });
    assert.equal(ok.status, 200);
    const { rev } = await ok.json();
    assert.equal(rev, db.rev + 1);
    const velho = await s.api('/api/db', { method: 'PUT', body: JSON.stringify(db) });
    assert.equal(velho.status, 409, 'revisão velha é recusada');
    const novo = await (await fetch(`${s.base}/api/db`)).json();
    const it = novo.itens.find((i) => i.id === 'x1');
    assert.equal(it.tipo, 'nota');
    assert.deepEqual(it.tags, ['a']);
    assert.equal(it.data, '');
  } finally { s.parar(); }
});

test('migra o formato v1 sem perder nada (apagados vão para a lixeira)', async () => {
  const s = await subir((dir) => {
    fs.mkdirSync(path.join(dir, 'anexos'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'anexos', 'eb265f36-0dd2-47c8-b7c5-396e65f87213-Guia.pdf'), '%PDF-1.4 x');
    fs.writeFileSync(path.join(dir, 'db.json'), JSON.stringify({ itens: [
      { id: 'a', tipo: 'pdf', titulo: 'Guia', texto: 'Definição', tags: ['ia'], data: '2026-11-16',
        anexo: { nome: 'Guia.pdf', caminho: '/api/anexos/eb265f36-0dd2-47c8-b7c5-396e65f87213-Guia.pdf' }, criadoEm: '2026-11-16T10:00:00.000Z', apagadoEm: null },
      { id: 'b', tipo: 'nota', titulo: 'Apagado', tags: [], apagadoEm: '2026-11-16T11:00:00.000Z' },
    ] }));
  });
  try {
    const db = await (await fetch(`${s.base}/api/db`)).json();
    assert.equal(db.versao, 2);
    const proprios = db.itens.filter((i) => !/^(kit-|modelos-)/.test(i.id)); // os pacotes de exemplos/ entram junto
    assert.equal(proprios.length, 1);
    const it = proprios[0];
    assert.equal(it.titulo, 'Guia');
    assert.equal(it.anexos.length, 1);
    assert.equal(it.anexos[0].tamanho, 10);
    assert.equal(db.lixeira.length, 1);
    assert.equal(db.lixeira[0].dados.titulo, 'Apagado');
    const r = await fetch(`${s.base}/api/anexos/${it.anexos[0].arquivo}?download=1`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-disposition'), /attachment; filename="Guia\.pdf"/);
  } finally { s.parar(); }
});

test('anexo: envia, baixa com o nome original, bloqueia caminho e HTML sempre baixa', async () => {
  const s = await subir();
  try {
    const r = await fetch(`${s.base}/api/anexos?nome=${encodeURIComponent('Segundo cérebro.pdf')}`, {
      method: 'POST', headers: { 'X-Backpack': '1', 'Content-Type': 'application/pdf' }, body: '%PDF-1.4 conteudo',
    });
    const a = await r.json();
    assert.equal(a.tamanho, 17);
    const d = await fetch(`${s.base}/api/anexos/${encodeURIComponent(a.arquivo)}?download=1`);
    assert.equal(await d.text(), '%PDF-1.4 conteudo');
    assert.match(d.headers.get('content-disposition'), /filename\*=UTF-8''Segundo%20c%C3%A9rebro\.pdf/);
    const ver = await fetch(`${s.base}/api/anexos/${encodeURIComponent(a.arquivo)}`);
    assert.equal(ver.headers.get('content-type'), 'application/pdf');
    assert.match(ver.headers.get('content-disposition'), /^inline/);
    assert.equal((await fetch(`${s.base}/api/anexos/..%2F..%2Fserver.js`)).status, 404);
    const h = await (await fetch(`${s.base}/api/anexos?nome=pagina.html`, { method: 'POST', headers: { 'X-Backpack': '1' }, body: '<script>alert(1)</script>' })).json();
    const hv = await fetch(`${s.base}/api/anexos/${h.arquivo}`);
    assert.equal(hv.headers.get('content-type'), 'application/octet-stream');
    assert.match(hv.headers.get('content-disposition'), /^attachment/);
  } finally { s.parar(); }
});

test('foco: inicia, informa e para', async () => {
  const s = await subir();
  try {
    const i = await (await s.api('/api/foco/iniciar', { method: 'POST', body: JSON.stringify({ min: 25 }) })).json();
    assert.equal(i.min, 25);
    assert.ok(i.fim > Date.now());
    assert.ok((await (await fetch(`${s.base}/api/foco`)).json()).fim > 0);
    await s.api('/api/foco/parar', { method: 'POST' });
    assert.equal((await (await fetch(`${s.base}/api/foco`)).json()).fim, 0);
  } finally { s.parar(); }
});

test('restaurar backup guarda uma cópia antes e aceita o arquivo baixado', async () => {
  const s = await subir();
  try {
    const bak = await (await fetch(`${s.base}/api/backup`)).text();
    const b = JSON.parse(bak);
    b.itens = b.itens.slice(0, 1);
    const r = await s.api('/api/restaurar', { method: 'POST', body: JSON.stringify(b) });
    assert.equal(r.status, 200);
    const db = await (await fetch(`${s.base}/api/db`)).json();
    assert.equal(db.itens.length, 1);
    assert.ok(fs.readdirSync(path.join(s.dados, 'backups')).some((f) => f.startsWith('antes-de-restaurar-')));
    const ruim = await s.api('/api/restaurar', { method: 'POST', body: '{"oi":1}' });
    assert.equal(ruim.status, 400);
  } finally { s.parar(); }
});

// programas falsos no lugar do Claude Code e do Codex (nunca usa a assinatura de verdade)
function iasFalsas({ claude, codex }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backpack-ias-'));
  const versao = (v) => `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "${v}"; exit 0; fi\ncat >/dev/null\n`;
  const escreve = (nome, corpo) => { const f = path.join(dir, nome); fs.writeFileSync(f, corpo); fs.chmodSync(f, 0o755); };
  if (claude === 'limite') escreve('claude', `${versao('9.9.9')}echo '{"is_error":true,"result":"Claude AI usage limit reached|1700000000"}'\nexit 1\n`);
  if (claude === 'login') escreve('claude', `${versao('9.9.9')}echo '{"is_error":true,"result":"Invalid API key · Please run /login"}'\nexit 1\n`);
  if (codex === 'ok') {
    escreve('codex', `${versao('codex-cli 1.0.0')}while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift;; -m) mod="$2"; shift;; esac; shift; done\necho "via codex $mod" > "$out"\n`);
  }
  return { BACKPACK_IA_PATH: `${dir}${path.delimiter}/usr/bin${path.delimiter}/bin` };
}
const pedirIa = (s) => s.api('/api/ia', { method: 'POST', body: JSON.stringify({ acao: 'livre', pedido: 'oi', texto: 'x' }) });
const mudarIa = async (s, ia) => {
  const db = await (await fetch(`${s.base}/api/db`)).json();
  db.config.ia = { ...db.config.ia, ...ia };
  assert.equal((await s.api('/api/db', { method: 'PUT', body: JSON.stringify(db) })).status, 200);
  return (await (await fetch(`${s.base}/api/db`)).json()).config.ia;
};

test('IA sem nada instalado responde com erro claro', async () => {
  const s = await subir(null, iasFalsas({}));
  try {
    const st = await (await fetch(`${s.base}/api/ia/status`)).json();
    assert.equal(typeof st.temChave, 'boolean');
    assert.equal(st.codex.ok, false);
    const r = await s.api('/api/ia', { method: 'POST', body: JSON.stringify({ acao: 'livre', pedido: '', texto: 'x', via: 'codex' }) });
    assert.equal(r.status, 502);
    assert.ok((await r.json()).erro);
  } finally { s.parar(); }
});

test('IA: só um motor ligado por vez ao gravar', { skip: process.platform === 'win32' }, async () => {
  const s = await subir(null, iasFalsas({}));
  try {
    assert.deepEqual((await mudarIa(s, { ligadas: {} })).ligadas, { claude: true, codex: false });
    assert.deepEqual((await mudarIa(s, { ligadas: { claude: true, codex: true }, modelo: 'gpt-6.2-sol' })).ligadas, { claude: false, codex: true });
    assert.deepEqual((await mudarIa(s, { ligadas: { claude: false, codex: false } })).ligadas, { claude: false, codex: false });
    // Claude desligado deixa o Codex ligado, e o modelo vira o GPT do mesmo nível
    const ia = await mudarIa(s, { ligadas: { claude: false }, modelo: 'claude-haiku-5-5' });
    assert.deepEqual(ia.ligadas, { claude: false, codex: true });
    assert.equal(ia.modelo, 'gpt-6-luna');
  } finally { s.parar(); }
});

test('IA: limite do Claude acaba e o Codex responde com o modelo do mesmo nível', { skip: process.platform === 'win32' }, async () => {
  const s = await subir(null, iasFalsas({ claude: 'limite', codex: 'ok' }));
  try {
    await mudarIa(s, { modelo: 'claude-opus-5-5', ligadas: { claude: true, codex: false } });
    const r = await pedirIa(s);
    const j = await r.json();
    assert.equal(r.status, 200, j.erro);
    assert.equal(j.texto, 'via codex gpt-6.2-astra');
    assert.match(j.aviso, /limite.*usei o Codex/);
  } finally { s.parar(); }
});

test('IA: erro que não é de limite não troca de motor', { skip: process.platform === 'win32' }, async () => {
  const s = await subir(null, iasFalsas({ claude: 'login', codex: 'ok' }));
  try {
    const r = await pedirIa(s);
    assert.equal(r.status, 502);
    assert.match((await r.json()).erro, /logado/);
  } finally { s.parar(); }
});

test('IA: com o Codex ligado usa o modelo GPT escolhido', { skip: process.platform === 'win32' }, async () => {
  const s = await subir(null, iasFalsas({ claude: 'limite', codex: 'ok' }));
  try {
    await mudarIa(s, { modelo: 'gpt-6-luna', ligadas: { claude: false, codex: true } });
    const j = await (await pedirIa(s)).json();
    assert.equal(j.texto, 'via codex gpt-6-luna');
    assert.equal(j.aviso, undefined);
  } finally { s.parar(); }
});

test('ferramentas próprias: guarda as válidas e descarta link que não é http(s)', async () => {
  const s = await subir();
  try {
    const db = await (await fetch(`${s.base}/api/db`)).json();
    db.ferramentas = [
      { nome: 'Photopea', url: 'https://www.photopea.com', descricao: 'Editor de imagem', grupo: 'criacao' },
      { nome: 'Perigosa', url: 'javascript:alert(1)', grupo: 'ia' },
      { nome: 'Sem grupo', url: 'https://exemplo.com', grupo: 'inventado' },
    ];
    assert.equal((await s.api('/api/db', { method: 'PUT', body: JSON.stringify(db) })).status, 200);
    const f = (await (await fetch(`${s.base}/api/db`)).json()).ferramentas;
    assert.deepEqual(f.map((x) => x.nome), ['Photopea', 'Sem grupo']);
    assert.equal(f[1].grupo, 'outras');
    assert.ok(f[0].id);
  } finally { s.parar(); }
});

// ---------- rotina, clientes, financeiro, backup, conexões e celular ----------
test('dados novos (clientes, financeiro, rotina, tarefa que repete) passam pela limpeza', async () => {
  const s = await subir();
  try {
    const db = await (await fetch(`${s.base}/api/db`)).json();
    db.clientes = [{ id: 'c1', nome: 'Ana', status: 'inventado', tags: ['x', 'x'] }];
    db.fin = [{ id: 'f1', tipo: 'entrada', valor: '-150.556', data: 'ontem' }];
    db.habitos = [{ id: 'h1', nome: 'Ler', freq: 'semana', dias: [1, 9], log: { '2026-11-17': 1, lixo: 3 } }];
    db.metas = [{ id: 'g1', nome: 'Meta', alvo: 0 }];
    db.tarefas.push({ id: 't9', texto: 'Repete', rep: 'semana', hora: '25h', cliente: 'c1' });
    db.lixeira.push({ tipo: 'cliente', dados: { id: 'c2', nome: 'Velho' }, em: new Date().toISOString() });
    const r = await s.api('/api/db', { method: 'PUT', body: JSON.stringify(db) });
    assert.equal(r.status, 200);
    const d = await (await fetch(`${s.base}/api/db`)).json();
    assert.equal(d.clientes[0].status, 'prospect');
    assert.deepEqual(d.clientes[0].tags, ['x']);
    assert.equal(d.fin[0].valor, 150.56);
    assert.match(d.fin[0].data, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(d.habitos[0].dias, [1]);
    assert.deepEqual(Object.keys(d.habitos[0].log), ['2026-11-17']);
    assert.ok(d.metas[0].alvo > 0);
    const t = d.tarefas.find((x) => x.id === 't9');
    assert.equal(t.rep, 'semana'); assert.equal(t.hora, ''); assert.equal(t.cliente, 'c1');
    assert.equal(d.lixeira.find((x) => x.dados.id === 'c2').tipo, 'cliente');
  } finally { s.parar(); }
});

test('backup com senha volta só com a senha certa', async () => {
  const s = await subir();
  try {
    const curta = await s.api('/api/backup/senha', { method: 'POST', body: JSON.stringify({ senha: '123' }) });
    assert.equal(curta.status, 400);
    const arq = await (await s.api('/api/backup/senha', { method: 'POST', body: JSON.stringify({ senha: 'segredo123' }) })).json();
    assert.equal(arq.formato, 'backpack-cripto');
    assert.ok(!JSON.stringify(arq).includes('Bem-vindo'), 'conteúdo não aparece em texto');
    const errada = await s.api('/api/restaurar', { method: 'POST', body: JSON.stringify({ ...arq, senha: 'errada' }) });
    assert.equal(errada.status, 400);
    const certa = await s.api('/api/restaurar', { method: 'POST', body: JSON.stringify({ ...arq, senha: 'segredo123' }) });
    assert.equal(certa.status, 200);
  } finally { s.parar(); }
});

test('exportar em Markdown gera um ZIP válido', async () => {
  const s = await subir();
  try {
    const r = await fetch(`${s.base}/api/exportar-md`);
    assert.equal(r.status, 200);
    const buf = Buffer.from(await r.arrayBuffer());
    assert.equal(buf.readUInt32LE(0), 0x04034b50, 'começa como ZIP');
    assert.ok(buf.includes(Buffer.from('LEIA-ME.md')) && buf.includes(Buffer.from('Tarefas.md')));
  } finally { s.parar(); }
});

test('conexões aceitam item só com código válido e não duplicam', async () => {
  const s = await subir();
  try {
    const corpo = { formato: 'backpack-entrada-1', app: 'Teste', itens: [{ id: 'a1', tipo: 'nota', titulo: 'Oi', etiquetas: ['x'], checklist: ['passo'] }] };
    const sem = await fetch(`${s.base}/api/entrada`, { method: 'POST', body: JSON.stringify(corpo) });
    assert.equal(sem.status, 401);
    const cx = await (await s.api('/api/conexoes', { method: 'POST', body: JSON.stringify({ nome: 'Teste' }) })).json();
    const manda = () => fetch(`${s.base}/api/entrada`, { method: 'POST', headers: { 'X-Backpack-Conexao': cx.codigo }, body: JSON.stringify(corpo) }).then((r) => r.json());
    const r1 = await manda(); const r2 = await manda();
    assert.equal(r1.criados, 1); assert.equal(r2.atualizados, 1);
    const db = await (await fetch(`${s.base}/api/db`)).json();
    const its = db.itens.filter((i) => i.origem && i.origem.app === 'Teste');
    assert.equal(its.length, 1); assert.equal(its[0].checklist.length, 1);
    await s.api('/api/conexoes/mudar', { method: 'POST', body: JSON.stringify({ id: cx.id, on: false }) });
    assert.equal((await fetch(`${s.base}/api/entrada`, { method: 'POST', headers: { 'X-Backpack-Conexao': cx.codigo }, body: JSON.stringify(corpo) })).status, 401, 'desligada');
  } finally { s.parar(); }
});

test('celular só por HTTPS com certificado deste Mac; sem código não entra', async () => {
  const https = require('https');
  const ip = Object.values(os.networkInterfaces()).flat().find((i) => i && (i.family === 'IPv4' || i.family === 4) && !i.internal && !i.address.startsWith('169.254.'));
  const s = await subir();
  try {
    let st = await (await s.api('/api/rede')).json();
    assert.equal(st.on, false);
    st = await (await s.api('/api/rede', { method: 'POST', body: JSON.stringify({ on: true }) })).json();
    assert.equal(st.on, true, st.erro); assert.match(st.pin, /^\d{6}$/);
    if (st.ips.length) assert.match(st.link, /^https:\/\//); // sem Wi-Fi não há link (a tela avisa)
    const portaTls = Number(new URL(s.base).port) + 1;
    const ca = fs.readFileSync(path.join(s.dados, 'tls', 'ca.crt'));
    // pedido HTTPS validando o certificado com a autoridade deste Mac (igual ao celular depois de confiar)
    const pedir = (host, caminho, opt = {}) => new Promise((ok, no) => {
      const r = https.request({ host, port: portaTls, path: caminho, method: opt.method || 'GET', ca, headers: opt.headers || {} }, (res) => {
        let corpo = ''; res.on('data', (c) => { corpo += c; }); res.on('end', () => ok({ status: res.statusCode, headers: res.headers, corpo }));
      });
      r.on('error', no); if (opt.body) r.write(opt.body); r.end();
    });
    // sem rede (só 127.0.0.1) o pedido vem do próprio Mac, que não precisa de código
    const alvo = ip ? ip.address : '127.0.0.1';
    assert.equal((await pedir(alvo, '/backpack-ca.crt')).status, 200, 'certificado público para instalar');
    if (ip) {
      assert.equal((await pedir(alvo, '/api/db')).status, 401, 'sem cookie não lê os dados');
      assert.equal((await pedir(alvo, '/')).status, 302);
    }
    const form = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const certo = await pedir(alvo, '/entrar', { method: 'POST', body: `pin=${st.pin}`, headers: form });
    assert.equal(certo.status, 302);
    assert.match(certo.headers['set-cookie'][0], /Secure/);
    const cookie = certo.headers['set-cookie'][0].split(';')[0];
    if (ip) {
      assert.equal((await pedir(alvo, '/api/db', { headers: { cookie } })).status, 200, 'com cookie lê');
      assert.equal((await pedir(alvo, '/api/desligar', { method: 'POST', headers: { cookie, 'X-Backpack': '1' } })).status, 403, 'desligar só no Mac');
      assert.equal((await pedir(alvo, '/api/conexoes', { headers: { cookie } })).status, 403, 'conexões só no Mac');
    }
    // a porta HTTP do Mac continua fechada para a rede
    if (ip) await assert.rejects(fetch(`http://${ip.address}:${new URL(s.base).port}/api/ping`), 'HTTP não aparece na rede');
    st = await (await s.api('/api/rede', { method: 'POST', body: JSON.stringify({ on: false }) })).json();
    assert.equal(st.on, false);
    await assert.rejects(pedir(alvo, '/entrar'), 'desligado fecha a porta HTTPS');
  } finally { s.parar(); }
});
