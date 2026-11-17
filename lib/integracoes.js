// Backpack — enviar itens para o Notion e o Trello. As chaves ficam em data/segredos.json
// (fora do db.json, do backup, do Drive e do GitHub).
'use strict';
const https = require('https');

function req(method, host, caminho, headers, body) {
  const data = body == null ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  const h = { Accept: 'application/json', ...headers };
  if (data) { h['Content-Type'] = h['Content-Type'] || 'application/json'; h['Content-Length'] = data.length; }
  return new Promise((ok, no) => {
    const rq = https.request({ hostname: host, path: caminho, method, headers: h, timeout: 30000 }, (rs) => {
      const partes = [];
      rs.on('data', (c) => partes.push(c));
      rs.on('end', () => {
        const txt = Buffer.concat(partes).toString('utf8');
        let j = null; try { j = JSON.parse(txt); } catch (_) {}
        ok({ st: rs.statusCode, j, txt });
      });
    });
    rq.on('timeout', () => rq.destroy(new Error('Demorou demais. Tente de novo.')));
    rq.on('error', (e) => no(new Error(e.code === 'ENOTFOUND' ? 'Sem internet.' : e.message)));
    rq.end(data || undefined);
  });
}

const TIPOS = { pdf: '📚 Estudo / PDF', prompt: '✨ Prompt', instrucao: '📜 Instrução', comando: '⌨️ Comando', link: '🔗 Link', nota: '📝 Nota' };
const urlDoItem = (it) => {
  const t = String(it.texto || '').trim();
  return it.tipo === 'link' && /^https?:\/\//i.test(t) ? t.split(/\s/)[0] : '';
};

// ---------------- Notion ----------------
const nh = (tok) => ({ Authorization: `Bearer ${tok}`, 'Notion-Version': '2022-06-28' });
const nErro = (r) => {
  if (r.st === 401) return new Error('O Notion não aceitou o segredo da integração. Confira e cole de novo.');
  if (r.st === 404) return new Error('Página não encontrada. No Notion, conecte a integração à página (••• → Conexões).');
  if (r.st === 429) return new Error('O Notion pediu uma pausa. Tente de novo daqui a pouco.');
  return new Error((r.j && r.j.message) || `Erro ${r.st} no Notion.`);
};
const tituloPagina = (p) => {
  for (const k in p.properties || {}) if (p.properties[k].type === 'title') return (p.properties[k].title || []).map((t) => t.plain_text).join('') || 'Sem título';
  return 'Sem título';
};

async function notionPaginas(tok) {
  if (!tok) throw new Error('Cole o segredo da integração do Notion.');
  const r = await req('POST', 'api.notion.com', '/v1/search', nh(tok), { filter: { property: 'object', value: 'page' }, page_size: 100 });
  if (r.st !== 200) throw nErro(r);
  return r.j.results.filter((p) => !p.archived && p.parent && p.parent.type !== 'database_id')
    .map((p) => ({ id: p.id, nome: (p.icon && p.icon.emoji ? `${p.icon.emoji} ` : '') + tituloPagina(p) }));
}

const rt = (s) => [{ type: 'text', text: { content: s } }];
function blocos(it) {
  const B = [];
  const para = (s) => { for (let i = 0; i < s.length; i += 1900) B.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: rt(s.slice(i, i + 1900)) } }); };
  B.push({ object: 'block', type: 'callout', callout: { icon: { emoji: '🧰' }, rich_text: rt(`${TIPOS[it.tipo] || 'Item'} · enviado do Backpack${(it.tags || []).length ? ` · #${it.tags.join(' #')}` : ''}`) } });
  if (it.descricao) para(it.descricao);
  const url = urlDoItem(it);
  if (url) B.push({ object: 'block', type: 'bookmark', bookmark: { url } });
  const txt = String(it.texto || '');
  if (txt.trim() && !url) {
    if (it.tipo === 'comando' || it.tipo === 'prompt') {
      for (let i = 0; i < txt.length; i += 1900) B.push({ object: 'block', type: 'code', code: { language: it.tipo === 'comando' ? 'shell' : 'plain text', rich_text: rt(txt.slice(i, i + 1900)) } });
    } else txt.split(/\n{2,}/).forEach((p) => p.trim() && para(p.trim()));
  }
  (it.checklist || []).forEach((c) => B.push({ object: 'block', type: 'to_do', to_do: { checked: !!c.feito, rich_text: rt(String(c.t || '').slice(0, 1900)) } }));
  (it.links || []).forEach((l) => /^https?:\/\//i.test(l.url) && B.push({ object: 'block', type: 'bookmark', bookmark: { url: l.url } }));
  if ((it.anexos || []).length) para(`📎 Anexos no Backpack: ${it.anexos.map((a) => a.nome).join(', ')}`);
  return B.slice(0, 100);
}

async function notionEnviar(cfg, it) {
  const body = { parent: { page_id: cfg.alvo }, icon: { emoji: (TIPOS[it.tipo] || '📝').split(' ')[0] },
    properties: { title: { title: rt((it.titulo || 'Sem título').slice(0, 1900)) } }, children: blocos(it) };
  const r = await req('POST', 'api.notion.com', '/v1/pages', nh(cfg.token), body);
  if (r.st !== 200) throw nErro(r);
  return { url: r.j.url };
}

// ---------------- Trello ----------------
const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const tErro = (r) => {
  if (r.st === 401) return new Error('O Trello não aceitou a chave ou o token. Confira e cole de novo.');
  if (r.st === 404) return new Error('Lista não encontrada no Trello. Escolha a lista de novo nas Configurações.');
  if (r.st === 429) return new Error('O Trello pediu uma pausa. Tente de novo daqui a pouco.');
  return new Error((r.j && r.j.message) || r.txt.slice(0, 200) || `Erro ${r.st} no Trello.`);
};

async function trelloListas(key, token) {
  if (!key || !token) throw new Error('Cole a chave e o token do Trello.');
  const r = await req('GET', 'api.trello.com', `/1/members/me/boards?${q({ filter: 'open', fields: 'name', lists: 'open', list_fields: 'name', key, token })}`, {});
  if (r.st !== 200) throw tErro(r);
  const out = [];
  r.j.forEach((b) => (b.lists || []).forEach((l) => out.push({ id: l.id, nome: `${b.name} → ${l.name}` })));
  return out;
}

async function trelloEnviar(cfg, it) {
  const L = [`${TIPOS[it.tipo] || 'Item'} · enviado do Backpack`];
  if ((it.tags || []).length) L.push(`#${it.tags.join(' #')}`);
  if (it.descricao) L.push('', it.descricao);
  const txt = String(it.texto || '');
  if (txt.trim()) L.push('', it.tipo === 'comando' || it.tipo === 'prompt' ? `\`\`\`\n${txt}\n\`\`\`` : txt);
  (it.links || []).forEach((l) => L.push(l.url));
  if ((it.anexos || []).length) L.push('', `📎 Anexos no Backpack: ${it.anexos.map((a) => a.nome).join(', ')}`);
  const params = { idList: cfg.alvo, name: (it.titulo || 'Sem título').slice(0, 16384), desc: L.join('\n').slice(0, 16000), pos: 'top', key: cfg.key, token: cfg.token };
  const url = urlDoItem(it);
  if (url) params.urlSource = url;
  const r = await req('POST', 'api.trello.com', `/1/cards?${q(params)}`, {});
  if (r.st !== 200) throw tErro(r);
  const passos = (it.checklist || []).filter((c) => c.t);
  if (passos.length) {
    const c = await req('POST', 'api.trello.com', `/1/checklists?${q({ idCard: r.j.id, name: 'Checklist', key: cfg.key, token: cfg.token })}`, {});
    if (c.st === 200) for (const x of passos) await req('POST', 'api.trello.com', `/1/checklists/${c.j.id}/checkItems?${q({ name: String(x.t).slice(0, 16384), checked: !!x.feito, key: cfg.key, token: cfg.token })}`, {});
  }
  return { url: r.j.shortUrl || r.j.url };
}

module.exports = { notionPaginas, notionEnviar, trelloListas, trelloEnviar };
