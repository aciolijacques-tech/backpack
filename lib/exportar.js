// Backpack — exportar tudo em Markdown (ZIP que abre como cofre do Obsidian) e backup com senha.
// O ZIP é montado aqui mesmo, sem biblioteca. Ideia e formato vindos do MyLoot (MIT, Prestes Design).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { ANEXOS, nomeSeguro } = require('./dados');
const { itemParaMd, slug, PASTA_TIPO } = require('./drive');

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }

function zip(arquivos) { // [{ nome, dados: Buffer }]
  const partes = [], central = [];
  let pos = 0;
  const d = new Date();
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const a of arquivos) {
    const nome = Buffer.from(a.nome.replace(/\\/g, '/'), 'utf8');
    const crc = crc32(a.dados);
    const comp = zlib.deflateRawSync(a.dados);
    const usa = comp.length < a.dados.length; // PDF e imagem já vêm comprimidos: vão como estão
    const corpo = usa ? comp : a.dados, metodo = usa ? 8 : 0;
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(metodo, 8);
    h.writeUInt16LE(hora, 10); h.writeUInt16LE(dia, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(corpo.length, 18);
    h.writeUInt32LE(a.dados.length, 22); h.writeUInt16LE(nome.length, 26);
    partes.push(h, nome, corpo);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(metodo, 10);
    c.writeUInt16LE(hora, 12); c.writeUInt16LE(dia, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(corpo.length, 20);
    c.writeUInt32LE(a.dados.length, 24); c.writeUInt16LE(nome.length, 28); c.writeUInt32LE(pos, 42);
    central.push(c, nome);
    pos += 30 + nome.length + corpo.length;
  }
  const cd = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(arquivos.length, 8); fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(cd.length, 12); fim.writeUInt32LE(pos, 16);
  return Buffer.concat([...partes, cd, fim]);
}

const REP = { dia: 'todo dia', uteis: 'dias úteis', semana: 'toda semana', mes: 'todo mês' };

function markdown(db, comAnexos = true) {
  const out = [];
  const md = (nome, txt) => out.push({ nome, dados: Buffer.from(txt, 'utf8') });
  const nomeCli = (id) => ((db.clientes || []).find((c) => c.id === id) || {}).nome || '';
  for (const it of db.itens) {
    const dir = PASTA_TIPO[it.tipo] || 'Outros';
    md(`${dir}/${slug(it.titulo)}-${it.id}.md`, itemParaMd(it, db));
    if (!comAnexos) continue;
    for (const a of it.anexos) {
      try { out.push({ nome: `${dir}/anexos/${it.id}/${nomeSeguro(a.nome)}`, dados: fs.readFileSync(path.join(ANEXOS, path.basename(a.arquivo))) }); } catch (_) {}
    }
  }
  for (const c of db.clientes || []) {
    const L = ['---', `nome: ${JSON.stringify(c.nome)}`, `status: ${c.status}`];
    for (const k of ['empresa', 'email', 'whats', 'insta', 'site', 'trello', 'pasta']) if (c[k]) L.push(`${k}: ${JSON.stringify(c[k])}`);
    L.push(`id: ${c.id}`, '---', '', `# ${c.nome || 'Cliente'}`, '');
    if (c.notas) L.push(c.notas, '');
    const its = db.itens.filter((i) => i.cliente === c.id);
    if (its.length) { L.push('## Itens'); its.forEach((i) => L.push(`- [[${slug(i.titulo)}-${i.id}|${i.titulo || 'Sem título'}]]`)); L.push(''); }
    const ts = db.tarefas.filter((t) => t.cliente === c.id);
    if (ts.length) { L.push('## Tarefas'); ts.forEach((t) => L.push(`- [${t.feita ? 'x' : ' '}] ${t.texto}${t.data ? ` 📅 ${t.data}` : ''}`)); L.push(''); }
    md(`Clientes/${slug(c.nome)}-${c.id}.md`, L.join('\n'));
  }
  const T = ['# Tarefas', ''];
  for (const t of [...db.tarefas].sort((a, b) => (a.data || '9').localeCompare(b.data || '9'))) {
    T.push(`- [${t.feita ? 'x' : ' '}] ${t.texto}${t.data ? ` 📅 ${t.data}` : ''}${t.hora ? ` ⏰ ${t.hora}` : ''}${t.rep ? ` 🔁 ${REP[t.rep]}` : ''}${t.cliente ? ` 👤 ${nomeCli(t.cliente)}` : ''}`);
  }
  md('Tarefas.md', `${T.join('\n')}\n`);
  if ((db.habitos || []).length || (db.metas || []).length) {
    const R = ['# Rotina', ''];
    if (db.habitos.length) { R.push('## Hábitos'); db.habitos.forEach((h) => R.push(`- ${h.em} ${h.nome} (${Object.keys(h.log).length} dias marcados)`)); R.push(''); }
    if (db.metas.length) { R.push('## Metas'); db.metas.forEach((g) => R.push(`- ${g.em} ${g.nome}: ${g.atual} de ${g.alvo}${g.un ? ` ${g.un}` : ''}${g.prazo ? ` até ${g.prazo}` : ''}`)); }
    md('Rotina.md', `${R.join('\n')}\n`);
  }
  if ((db.fin || []).length) { // CSV abre no Numbers, Excel e Google Planilhas
    const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const L = [['Data', 'Tipo', 'Descrição', 'Categoria', 'Cliente', 'Forma', 'Valor', 'Situação', 'Parcela'].map(q).join(';')];
    [...db.fin].sort((a, b) => a.data.localeCompare(b.data)).forEach((f) => L.push([f.data, f.tipo === 'entrada' ? 'Entrada' : 'Saída', f.desc, f.cat, nomeCli(f.cliente), f.forma,
      (f.tipo === 'entrada' ? f.valor : -f.valor).toFixed(2).replace('.', ','), f.pago ? 'Pago' : 'Pendente', f.parc].map(q).join(';')));
    out.push({ nome: 'Financeiro.csv', dados: Buffer.from(`﻿${L.join('\r\n')}`, 'utf8') });
  }
  md('LEIA-ME.md', `# Exportado do Backpack\n\nCada item é um arquivo .md, numa pasta por tipo, com os anexos ao lado.\nNo Obsidian: extraia este ZIP e use "Abrir pasta como cofre".\n\nExportado em ${new Date().toLocaleString('pt-BR')}.\n`);
  return zip(out);
}

// backup com senha: AES-256-GCM, chave derivada da senha pelo scrypt
function cifrar(texto, senha) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const chave = crypto.scryptSync(String(senha), salt, 32);
  const c = crypto.createCipheriv('aes-256-gcm', chave, iv);
  const dados = Buffer.concat([c.update(Buffer.from(texto, 'utf8')), c.final()]);
  return { formato: 'backpack-cripto', v: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), dados: dados.toString('base64') };
}
function decifrar(o, senha) {
  try {
    const chave = crypto.scryptSync(String(senha), Buffer.from(o.salt, 'base64'), 32);
    const d = crypto.createDecipheriv('aes-256-gcm', chave, Buffer.from(o.iv, 'base64'));
    d.setAuthTag(Buffer.from(o.tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(o.dados, 'base64')), d.final()]).toString('utf8');
  } catch (_) { throw Object.assign(new Error('Senha errada ou arquivo danificado.'), { code: 400 }); }
}

module.exports = { zip, markdown, cifrar, decifrar, crc32 };
