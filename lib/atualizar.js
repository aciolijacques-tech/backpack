// Backpack — atualização pelo GitHub: compara versao.json local com o do repositório,
// baixa o ZIP e copia por cima, sem tocar em data/ (itens, anexos, chaves) nem em .git/.
'use strict';
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { ROOT } = require('./dados');
const SIS = require('./sistema');

const REPO = 'aciolijacques-tech/backpack';
const RAMO = 'master';
const URL_VERSAO = `https://raw.githubusercontent.com/${REPO}/${RAMO}/versao.json`;
const URL_ZIP = `https://codeload.github.com/${REPO}/zip/refs/heads/${RAMO}`;

function baixar(url, destino, voltas = 0) {
  return new Promise((ok, no) => {
    const rq = https.get(url, { headers: { 'User-Agent': 'Backpack', 'Cache-Control': 'no-cache' }, timeout: 60000 }, (rs) => {
      if ([301, 302, 303, 307, 308].includes(rs.statusCode) && rs.headers.location && voltas < 5) {
        rs.resume(); return ok(baixar(new URL(rs.headers.location, url).href, destino, voltas + 1));
      }
      if (rs.statusCode !== 200) { rs.resume(); return no(new Error(`O GitHub respondeu ${rs.statusCode}.`)); }
      if (destino) { const f = fs.createWriteStream(destino); rs.pipe(f); f.on('finish', () => f.close(() => ok(destino))); f.on('error', no); }
      else { const p = []; rs.on('data', (c) => p.push(c)); rs.on('end', () => ok(Buffer.concat(p).toString('utf8'))); }
    });
    rq.on('timeout', () => rq.destroy(new Error('Demorou demais para falar com o GitHub.')));
    rq.on('error', (e) => no(new Error(e.code === 'ENOTFOUND' ? 'Sem internet.' : e.message)));
  });
}

const num = (v) => String(v || '0').split('.').map((x) => parseInt(x, 10) || 0);
function maior(a, b) {
  const x = num(a), y = num(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

function local() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'versao.json'), 'utf8')); } catch (_) { return { versao: '0.0.0', novidades: [] }; }
}

let cache = null;
async function checar(forcar) {
  if (cache && !forcar && Date.now() - cache.em < 6 * 3600e3) return cache.r;
  const loc = local();
  let rem;
  try { rem = JSON.parse(await baixar(`${URL_VERSAO}?t=${Date.now()}`)); } catch (e) { return { atual: loc.versao, erro: e.message }; }
  const r = { atual: loc.versao, nova: rem.versao, temNova: maior(rem.versao, loc.versao), novidades: rem.novidades || [], git: fs.existsSync(path.join(ROOT, '.git')) };
  cache = { em: Date.now(), r };
  return r;
}

// copia por cima; nunca apaga nada e pula data/ e .git/
function copiar(de, para) {
  for (const nome of fs.readdirSync(de)) {
    if (nome === 'data' || nome === '.git') continue;
    const a = path.join(de, nome), b = path.join(para, nome);
    if (fs.statSync(a).isDirectory()) { fs.mkdirSync(b, { recursive: true }); copiar(a, b); }
    else { fs.copyFileSync(a, b); fs.chmodSync(b, fs.statSync(a).mode); }
  }
}

async function aplicar() {
  if (fs.existsSync(path.join(ROOT, '.git'))) throw new Error('Esta pasta é um repositório Git (cópia de desenvolvimento). Atualize com "git pull".');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'backpack-atualizacao-'));
  const zip = path.join(tmp, 'backpack.zip');
  await baixar(URL_ZIP, zip);
  const dest = path.join(tmp, 'novo');
  fs.mkdirSync(dest);
  // Windows 10 e 11 já vêm com o tar.exe, que abre ZIP
  if (SIS.WIN) cp.execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', zip, '-C', dest], { timeout: 180000, windowsHide: true });
  else cp.execFileSync('/usr/bin/ditto', ['-x', '-k', zip, dest], { timeout: 180000 });
  const raiz = fs.readdirSync(dest).map((n) => path.join(dest, n)).find((p) => fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'server.js')));
  if (!raiz) throw new Error('O pacote baixado veio estranho (sem server.js). Nada foi trocado.');
  copiar(raiz, ROOT);
  cache = null;
  return local().versao;
}

// reabre o servidor: pelo serviço (launchd no Mac, servidor.cmd no Windows), sair com erro já faz ele religar;
// aberto pelo Abrir.command, sobe um processo novo antes de sair
function reiniciar() {
  if (SIS.SERVICO) { setTimeout(() => process.exit(75), 300); return; }
  const js = `setTimeout(()=>{require('child_process').spawn(process.execPath,['server.js'],{cwd:${JSON.stringify(ROOT)},detached:true,stdio:'ignore'}).unref()},1500)`;
  cp.spawn(process.execPath, ['-e', js], { cwd: ROOT, detached: true, stdio: 'ignore' }).unref();
  setTimeout(() => process.exit(0), 300);
}

// O app (Swift no Mac; atalhos e scripts no Windows) e o serviço só mudam rodando o instalador. Ele grava em
// data/app-instalado.txt a marca dos arquivos que montou; se os arquivos de agora forem outros
// (veio uma atualização que mexeu no app), o Backpack pede para reinstalar.
// Atenção: windows/instalar.ps1 calcula a mesma marca, com os mesmos arquivos nesta ordem.
const ARQS_APP = SIS.WIN
  ? [['windows', 'instalar.ps1'], ['windows', 'servidor.cmd'], ['windows', 'servidor.vbs'], ['windows', 'abrir.vbs']]
  : [['mac', 'Backpack.swift'], ['Instalar Backpack.app', 'Contents', 'MacOS', 'instalar']];
function marcaApp() {
  try {
    const b = ARQS_APP.map((a) => fs.readFileSync(path.join(ROOT, ...a)));
    return require('crypto').createHash('sha256').update(Buffer.concat(b)).digest('hex');
  } catch (_) { return ''; }
}
function appMac() {
  if (!(SIS.MAC || SIS.WIN) || !SIS.SERVICO) return 'ok'; // não foi instalado pelo instalador
  let feita = '';
  try { feita = fs.readFileSync(path.join(require('./dados').DATA, 'app-instalado.txt'), 'utf8').trim(); } catch (_) {}
  return feita && feita === marcaApp() ? 'ok' : 'reinstalar';
}
function reinstalar() {
  if (SIS.WIN) {
    cp.spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'windows', 'instalar.ps1')], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  cp.spawn('open', [path.join(ROOT, 'Instalar Backpack.app')], { detached: true, stdio: 'ignore' }).unref();
}

module.exports = { checar, aplicar, reiniciar, local, appMac, reinstalar, marcaApp };
