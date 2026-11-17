// Backpack — cópia para o Google Drive (app "Google Drive para computador" no Mac).
// Cada item vira um .md numa pasta por tipo, com os anexos junto. Só mexe no que ele mesmo criou.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DATA, ANEXOS, nomeSeguro } = require('./dados');

const MANIFESTO = path.join(DATA, 'drive-manifesto.json');
const PASTA_TIPO = { pdf: 'Estudo-PDF', prompt: 'Prompts', instrucao: 'Instrucoes', comando: 'Comandos', link: 'Links', nota: 'Notas' };
const STATUS = { ver: 'Para ver', andamento: 'Em andamento', feito: 'Concluído' };
const slug = (s) => String(s || 'sem-titulo').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'item';

function dentro(base, p) {
  const rel = path.relative(base, p);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function encontrar() {
  const out = [];
  const ok = (p) => { try { if (fs.statSync(p).isDirectory()) out.push(p); } catch (_) {} };
  const nuvem = path.join(os.homedir(), 'Library', 'CloudStorage');
  let contas = [];
  try { contas = fs.readdirSync(nuvem).filter((n) => n.startsWith('GoogleDrive')); } catch (_) {}
  for (const c of contas) for (const n of ['Meu Drive', 'My Drive']) ok(path.join(nuvem, c, n));
  for (const n of ['Google Drive', 'Meu Drive', 'My Drive']) ok(path.join(os.homedir(), n));
  return out;
}

function itemParaMd(it, db) {
  const cat = db.categorias.find((c) => c.id === it.categoria);
  const L = ['---', `titulo: ${JSON.stringify(it.titulo)}`, `tipo: ${it.tipo}`];
  if (cat) L.push(`categoria: ${JSON.stringify(cat.nome)}`);
  L.push(`status: ${STATUS[it.status] || it.status}`);
  if (it.tags.length) L.push(`etiquetas: [${it.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
  if (it.data) L.push(`data: ${it.data}`);
  if (it.fav) L.push('favorito: true');
  L.push(`criado: ${it.criadoEm}`, `id: ${it.id}`, '---', '', `# ${it.titulo || 'Sem título'}`, '');
  if (it.descricao) L.push(it.descricao, '');
  if (it.texto) L.push(it.tipo === 'comando' || it.tipo === 'prompt' ? `\`\`\`\n${it.texto}\n\`\`\`` : it.texto, '');
  if (it.checklist.length) { L.push('## Checklist'); it.checklist.forEach((c) => L.push(`- [${c.feito ? 'x' : ' '}] ${c.t}`)); L.push(''); }
  if (it.links.length) { L.push('## Links'); it.links.forEach((l) => L.push(`- [${l.rotulo || l.url}](${l.url})`)); L.push(''); }
  if (it.anexos.length) { L.push('## Anexos'); it.anexos.forEach((a) => L.push(`- [${a.nome}](anexos/${it.id}/${encodeURIComponent(nomeSeguro(a.nome))})`)); L.push(''); }
  return L.join('\n');
}

function sincronizar(db) {
  const cfg = db.config.drive || {};
  if (!cfg.pasta) throw new Error('Escolha a pasta do Drive.');
  if (!fs.existsSync(cfg.pasta)) throw new Error(`A pasta do Drive não existe: ${cfg.pasta}`);
  const base = path.join(cfg.pasta, 'Backpack');
  fs.mkdirSync(base, { recursive: true });
  let manifesto = {};
  try { manifesto = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8')); } catch (_) {}
  const proximo = {};
  let escritos = 0;
  for (const it of db.itens) {
    const dir = path.join(base, PASTA_TIPO[it.tipo] || 'Outros');
    fs.mkdirSync(dir, { recursive: true });
    const arq = path.join(dir, `${slug(it.titulo)}-${it.id}.md`);
    const md = itemParaMd(it, db);
    let igual = false;
    try { igual = fs.readFileSync(arq, 'utf8') === md; } catch (_) {}
    if (!igual) { fs.writeFileSync(arq, md); escritos++; }
    proximo[arq] = true;
    for (const a of it.anexos) {
      const src = path.join(ANEXOS, path.basename(a.arquivo));
      if (!fs.existsSync(src)) continue;
      const adir = path.join(dir, 'anexos', it.id);
      fs.mkdirSync(adir, { recursive: true });
      const dst = path.join(adir, nomeSeguro(a.nome));
      try {
        const s1 = fs.statSync(src);
        const s2 = fs.existsSync(dst) ? fs.statSync(dst) : null;
        if (!s2 || s2.size !== s1.size) { fs.copyFileSync(src, dst); escritos++; }
      } catch (_) {}
      proximo[dst] = true;
    }
  }
  // tira do Drive só o que o próprio Backpack criou e não existe mais no app
  let removidos = 0;
  for (const f of Object.keys(manifesto)) {
    if (!proximo[f] && dentro(base, f)) { try { fs.unlinkSync(f); removidos++; } catch (_) {} }
  }
  fs.writeFileSync(MANIFESTO, JSON.stringify(proximo));
  return { escritos, removidos, itens: db.itens.length, pasta: base };
}

module.exports = { encontrar, sincronizar, itemParaMd, slug, PASTA_TIPO };
