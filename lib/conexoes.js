// Backpack — conexões: outros programas do Mac mandam itens para o Backpack com um código próprio.
// Os códigos ficam em data/conexoes.json. A entrada só ACRESCENTA ou atualiza itens com a mesma origem
// (app + id); nunca lê nem regrava o resto. Formato inspirado no do MyLoot (MIT).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA, normItem, uid } = require('./dados');

const FORMATO = 'backpack-entrada-1';
const TIPOS = ['pdf', 'prompt', 'instrucao', 'comando', 'link', 'nota', 'skill'];
const ARQ = path.join(DATA, 'conexoes.json');
const txt = (v, max) => String(v == null ? '' : v).slice(0, max);

const ler = () => { try { const j = JSON.parse(fs.readFileSync(ARQ, 'utf8')); return Array.isArray(j) ? j : []; } catch (_) { return []; } };
const gravar = (L) => { const tmp = `${ARQ}.tmp`; fs.writeFileSync(tmp, JSON.stringify(L, null, 1), { mode: 0o600 }); fs.renameSync(tmp, ARQ); };

const listar = () => ler();
function criar(nome) {
  const L = ler();
  const c = { id: crypto.randomBytes(4).toString('hex'), nome: txt(nome, 40).trim() || 'App conectado', codigo: `bp_${crypto.randomBytes(16).toString('hex')}`, on: true, criado: Date.now(), ultimoUso: 0, recebidos: 0 };
  L.push(c); gravar(L);
  return c;
}
function mudar(id, o) { const L = ler(); const c = L.find((x) => x.id === id); if (!c) return null; if ('on' in o) c.on = !!o.on; if (o.nome) c.nome = txt(o.nome, 40).trim() || c.nome; gravar(L); return c; }
function apagar(id) { gravar(ler().filter((x) => x.id !== id)); }
// tempo constante: a resposta não dá pista do código
function achar(codigo) {
  const a = Buffer.from(String(codigo || ''));
  if (a.length < 10) return null;
  return ler().find((c) => { const b = Buffer.from(c.codigo); return c.on && a.length === b.length && crypto.timingSafeEqual(a, b); }) || null;
}
function usou(id, n) { const L = ler(); const c = L.find((x) => x.id === id); if (c) { c.ultimoUso = Date.now(); c.recebidos = (c.recebidos || 0) + n; gravar(L); } }

// junta os itens recebidos em db (muda no lugar) e devolve o resumo
function receber(db, cx, corpo) {
  if (!corpo || corpo.formato !== FORMATO) throw Object.assign(new Error(`Formato desconhecido. Use "${FORMATO}".`), { code: 400 });
  const itens = Array.isArray(corpo.itens) ? corpo.itens.slice(0, 200) : [];
  if (!itens.length) throw Object.assign(new Error('Nenhum item no pedido.'), { code: 400 });
  const app = txt(corpo.app || cx.nome, 40).trim() || cx.nome;
  const out = { ok: true, criados: 0, atualizados: 0, itens: [] };
  const agora = new Date().toISOString();
  for (const x of itens) {
    if (!x || typeof x !== 'object') continue;
    const oid = txt(x.id, 200).trim();
    const url = /^https?:\/\//i.test(x.url || '') ? txt(x.url, 2000) : '';
    const tipo = TIPOS.includes(x.tipo) ? x.tipo : x.tipo === 'estudo' ? 'pdf' : (url && !x.conteudo ? 'link' : 'nota');
    const nomeCli = txt(x.cliente, 80).trim().toLowerCase();
    const cli = nomeCli ? db.clientes.find((c) => c.nome.trim().toLowerCase() === nomeCli || c.empresa.trim().toLowerCase() === nomeCli) : null;
    let it = oid ? db.itens.find((i) => i.origem && i.origem.app === app && i.origem.id === oid) : null;
    const novo = !it;
    if (novo) { it = normItem({ criadoEm: agora }); db.itens.push(it); }
    it.tipo = tipo;
    it.titulo = txt(x.titulo, 300).trim() || it.titulo || `Recebido de ${app}`;
    it.descricao = txt(x.descricao, 5000);
    it.texto = txt(x.conteudo, 200000) || (tipo === 'link' ? url : '');
    const tags = (Array.isArray(x.etiquetas) ? x.etiquetas : []).map((t) => txt(t, 60).trim().replace(/^#/, '')).filter(Boolean).slice(0, 30);
    it.tags = [...new Set([...it.tags, ...tags])];
    // checklist e links só acrescentam: não apaga o que a pessoa marcou ou escreveu
    for (const c of (Array.isArray(x.checklist) ? x.checklist : []).slice(0, 100)) {
      const t = txt(typeof c === 'string' ? c : c && c.t, 1000).trim();
      if (t && !it.checklist.some((k) => k.t === t)) it.checklist.push({ id: uid(), t, feito: false });
    }
    for (const l of (Array.isArray(x.links) ? x.links : []).slice(0, 20)) {
      if (l && /^https?:\/\//i.test(l.url || '') && !it.links.some((k) => k.url === l.url)) it.links.push({ id: uid(), url: txt(l.url, 2000), rotulo: txt(l.rotulo || l.label, 300) });
    }
    if (url && tipo !== 'link' && !it.links.some((k) => k.url === url)) it.links.unshift({ id: uid(), url, rotulo: txt(x.rotulo, 300) || app });
    if (/^\d{4}-\d\d-\d\d$/.test(x.data || '')) it.data = x.data;
    if (cli) it.cliente = cli.id;
    it.origem = { app, id: oid, url, em: agora };
    it.atualizadoEm = agora;
    Object.assign(it, normItem(it));
    out[novo ? 'criados' : 'atualizados']++;
    out.itens.push({ id: oid, item: it.id, novo });
  }
  if (!out.itens.length) throw Object.assign(new Error('Nenhum item válido no pedido.'), { code: 400 });
  return out;
}

module.exports = { FORMATO, listar, criar, mudar, apagar, achar, usou, receber };
