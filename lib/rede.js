// Backpack — usar no celular: libera o app na rede Wi-Fi de casa, protegido por um código.
// Desligado por padrão (só o próprio Mac acessa, por HTTP em 127.0.0.1).
// Ligado, abre duas portas para a rede: 4324 (HTTP, abre em qualquer navegador sem instalar nada — é a
// do QR Code) e 4323 (HTTPS, para quem instalar o certificado e quiser usar o microfone no celular).
// O celular entra uma vez pelo QR Code (que leva um token) ou digitando o código de 6 números;
// depois fica um cookie por 1 ano.
// O certificado é feito aqui mesmo com o openssl do macOS: uma "autoridade" própria deste Mac
// (fica igual, para o celular confiar uma vez só) assina o certificado do servidor, que é refeito
// quando o endereço do Mac na rede muda. Modelo de acesso inspirado no MyLoot (MIT, Prestes Design).
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const cp = require('child_process');
const { DATA } = require('./dados');
const TLS = path.join(DATA, 'tls');

const ARQ = path.join(DATA, 'rede.json');
const cfg = { on: false, token: '', pin: '' };
try { Object.assign(cfg, JSON.parse(fs.readFileSync(ARQ, 'utf8'))); } catch (_) {}
const salvar = () => { const t = `${ARQ}.tmp`; fs.writeFileSync(t, JSON.stringify(cfg), { mode: 0o600 }); fs.renameSync(t, ARQ); };
const novoCodigo = () => { cfg.token = crypto.randomBytes(16).toString('hex'); cfg.pin = String(crypto.randomInt(0, 1e6)).padStart(6, '0'); salvar(); };

// IPs deste Mac na rede (os de casa primeiro)
function ips() {
  const L = [];
  for (const lista of Object.values(os.networkInterfaces())) for (const i of lista || []) {
    if ((i.family === 'IPv4' || i.family === 4) && !i.internal && !i.address.startsWith('169.254.')) L.push(i.address);
  }
  const casa = (a) => (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a) ? 0 : 1);
  return L.sort((a, b) => casa(a) - casa(b));
}

const doMac = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
// nome do host sem a porta, em minúsculas
function hostOk(host) {
  if (host === '127.0.0.1' || host === 'localhost') return true;
  if (!cfg.on) return false;
  return ips().includes(host) || host === `${os.hostname().toLowerCase().replace(/\.local$/, '')}.local` || /\.ts\.net$/i.test(host);
}
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// "backpack" vem do HTTPS (Secure) e "backpack_lan" do HTTP: nomes separados porque o navegador não
// deixa uma página HTTP sobrescrever um cookie Secure de mesmo nome
const cookies = (req) => [...(req.headers.cookie || '').matchAll(/(?:^|;\s*)backpack(?:_lan)?=([a-f0-9]{32})/g)].map((m) => m[1]);
const autorizado = (req) => doMac(req) || (cfg.on && !!cfg.token && cookies(req).some((c) => igual(c, cfg.token)));

// 8 erros seguidos travam esse aparelho por 15 minutos
const erros = new Map();
function tentar(req, pin) {
  const ip = req.socket.remoteAddress, e = erros.get(ip) || { n: 0, ate: 0 };
  if (e.ate > Date.now()) return 'travado';
  if (cfg.on && cfg.pin && igual(String(pin || '').replace(/\D/g, ''), cfg.pin)) { erros.delete(ip); return 'ok'; }
  e.n++; if (e.n >= 8) { e.n = 0; e.ate = Date.now() + 15 * 60e3; }
  erros.set(ip, e); return 'errado';
}
const setCookie = (seguro) => (seguro ? `backpack=${cfg.token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
  : `backpack_lan=${cfg.token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);

// ---------- certificado (HTTPS na rede de casa) ----------
const nomeLocal = () => `${os.hostname().toLowerCase().replace(/\.local$/, '')}.local`;
// O macOS já tem o openssl. O Windows não: usamos o que vem com o Git para Windows, se houver.
// Sem ele, o celular entra só pelo HTTP (sem o modo seguro, que o microfone pede).
const OPENSSL = process.platform !== 'win32' ? 'openssl'
  : [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')]
    .filter(Boolean).flatMap((b) => [path.join(b, 'Git', 'usr', 'bin', 'openssl.exe'), path.join(b, 'Git', 'mingw64', 'bin', 'openssl.exe')])
    .find((f) => fs.existsSync(f)) || 'openssl';
function openssl(args) {
  return cp.execFileSync(OPENSSL, args, { cwd: TLS, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, windowsHide: true });
}
function configOpenssl(ips) {
  const alt = [...ips.map((ip, i) => `IP.${i + 1} = ${ip}`), 'IP.99 = 127.0.0.1', `DNS.1 = ${nomeLocal()}`, 'DNS.2 = localhost'].join('\n');
  return `[req]\ndistinguished_name = dn\nprompt = no\n[dn]\nCN = Backpack\n[v3_ca]\nbasicConstraints = critical, CA:TRUE\nkeyUsage = critical, keyCertSign, cRLSign\nsubjectKeyIdentifier = hash\n[v3_srv]\nbasicConstraints = CA:FALSE\nkeyUsage = critical, digitalSignature, keyEncipherment\nextendedKeyUsage = serverAuth\nsubjectAltName = @alt\n[alt]\n${alt}\n`;
}
// devolve { key, cert, ca } para o servidor HTTPS; refaz o do servidor se o IP mudou ou está vencendo
function certificado() {
  fs.mkdirSync(TLS, { recursive: true, mode: 0o700 });
  const L = ips();
  const arq = (n) => path.join(TLS, n);
  fs.writeFileSync(arq('openssl.cnf'), configOpenssl(L));
  if (!fs.existsSync(arq('ca.key')) || !fs.existsSync(arq('ca.crt'))) {
    openssl(['req', '-x509', '-new', '-nodes', '-newkey', 'rsa:2048', '-sha256', '-days', '3650', '-keyout', 'ca.key', '-out', 'ca.crt',
      '-config', 'openssl.cnf', '-extensions', 'v3_ca', '-subj', `/CN=Backpack (${os.hostname().replace(/\.local$/, '')})/O=Backpack`]);
    try { fs.unlinkSync(arq('srv.crt')); } catch (_) {}
  }
  let refazer = !fs.existsSync(arq('srv.crt')) || !fs.existsSync(arq('srv.key'));
  if (!refazer) {
    try {
      const x = new crypto.X509Certificate(fs.readFileSync(arq('srv.crt')));
      const cobre = L.every((ip) => x.checkIP(ip));
      refazer = !cobre || new Date(x.validTo).getTime() - Date.now() < 30 * 864e5;
    } catch (_) { refazer = true; }
  }
  if (refazer) {
    openssl(['req', '-new', '-nodes', '-newkey', 'rsa:2048', '-sha256', '-keyout', 'srv.key', '-out', 'srv.csr', '-config', 'openssl.cnf', '-subj', `/CN=${nomeLocal()}`]);
    openssl(['x509', '-req', '-sha256', '-in', 'srv.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial', '-CAserial', 'ca.srl',
      '-out', 'srv.crt', '-days', '397', '-extfile', 'openssl.cnf', '-extensions', 'v3_srv']);
  }
  for (const n of ['ca.key', 'srv.key']) { try { fs.chmodSync(arq(n), 0o600); } catch (_) {} }
  return { key: fs.readFileSync(arq('srv.key')), cert: fs.readFileSync(arq('srv.crt')), ca: fs.readFileSync(arq('ca.crt')) };
}
const caPem = () => { try { return fs.readFileSync(path.join(TLS, 'ca.crt')); } catch (_) { return null; } };

const paginaEntrar = (msg) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Entrar no Backpack</title>
<link rel="icon" href="/icon-192.png"><meta name="theme-color" content="#1d1b1a">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(160deg,#cfc6bc,#8a7f75);font:16px -apple-system,system-ui,sans-serif;padding:20px;color:#1d1b1a}
.c{width:min(360px,100%);background:rgba(250,247,243,.72);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.6);border-radius:22px;padding:26px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.18)}
img{width:64px;border-radius:16px}h1{font-size:20px;margin:12px 0 4px}p{color:#5b544e;margin:0 0 18px;font-size:14px}
input{width:100%;box-sizing:border-box;font:700 28px ui-monospace,monospace;letter-spacing:8px;text-align:center;padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,.15);background:#fff}
button{margin-top:14px;width:100%;padding:13px;border:0;border-radius:14px;background:#ff7e00;color:#fff;font:600 16px -apple-system,system-ui;cursor:pointer}
.m{color:#d62f45;font-weight:600;margin-top:12px;min-height:1em}</style></head><body>
<form class="c" method="post" action="/entrar"><img src="/icon-192.png" alt=""><h1>Entrar no Backpack</h1>
<p>Digite o código de 6 números que aparece no computador, em Configurações → Usar no celular.</p>
<input name="pin" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required autofocus placeholder="000000">
<button>Entrar</button><div class="m">${msg || ''}</div>
</form></body></html>`;

const paginaCertificado = () => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Certificado do Backpack</title>
<style>body{margin:0;background:linear-gradient(160deg,#cfc6bc,#8a7f75);font:15px/1.5 -apple-system,system-ui,sans-serif;padding:20px;color:#1d1b1a}
.c{max-width:460px;margin:auto;background:rgba(250,247,243,.85);border-radius:22px;padding:22px}h1{font-size:19px;margin:0 0 10px}ol{padding-left:20px}
a.b{display:block;text-align:center;margin:16px 0;padding:13px;border-radius:14px;background:#ff7e00;color:#fff;font-weight:600;text-decoration:none}small{color:#5b544e}</style></head><body><div class="c">
<h1>Confiar no Backpack deste Mac</h1><p>Assim o celular reconhece a conexão criptografada e o aviso de “conexão não privada” some. Faz uma vez só.</p>
<a class="b" href="/backpack-ca.crt">Baixar certificado</a>
<p><b>iPhone</b></p><ol><li>Toque em “Baixar certificado” e em Permitir.</li><li>Ajustes → Geral → VPN e Gerenciamento de Dispositivos → Backpack → Instalar.</li>
<li>Ajustes → Geral → Sobre → Ajustes de Confiança de Certificados → ligue “Backpack”.</li></ol>
<p><b>Android</b></p><ol><li>Baixe o certificado.</li><li>Configurações → Segurança → Criptografia e credenciais → Instalar certificado → Certificado de CA.</li></ol>
<small>O certificado só vale para o Backpack deste Mac. Para remover depois, apague o perfil “Backpack” nos Ajustes.</small>
<p><a href="/entrar">Voltar para entrar</a></p></div></body></html>`;

module.exports = {
  cfg, ips, doMac, hostOk, autorizado, tentar, setCookie, paginaEntrar, paginaCertificado, certificado, caPem,
  tokenOk: (t) => cfg.on && !!cfg.token && igual(t, cfg.token),
  ligar(on) { cfg.on = !!on; if (cfg.on && !cfg.token) novoCodigo(); else salvar(); },
  trocar() { novoCodigo(); },
  status(porta, portaTls, erro) {
    const L = ips();
    // QR/link principal é HTTP (decisão 0011): entra em qualquer navegador, sem instalar nada e sem
    // depender de certificado — é o que funciona de cara no Windows (openssl pode não existir aí).
    // A porta HTTPS continua disponível para quem quiser instalar o certificado (criptografia e microfone).
    return { on: cfg.on, pin: cfg.on ? cfg.pin : '', ips: L, porta, portaTls, erro: erro || '', link: cfg.on && L[0] ? `http://${L[0]}:${porta}/entrar?c=${cfg.token}` : '' };
  },
};
