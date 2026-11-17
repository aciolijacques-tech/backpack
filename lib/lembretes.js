// Backpack — lembretes no horário: tarefas com hora, hábitos do dia ainda não marcados e contas que
// vencem hoje (uma vez por dia, a partir das 9h). Usa o aviso do macOS; roda no servidor, então
// funciona com a janela fechada. O que já foi avisado fica em data/avisos.json.
'use strict';
const fs = require('fs');
const path = require('path');
const { DATA, dataLocal } = require('./dados');
const { avisar } = require('./foco');

const ARQ = path.join(DATA, 'avisos.json');
let feitos = {};
try { feitos = JSON.parse(fs.readFileSync(ARQ, 'utf8')) || {}; } catch (_) {}
const gravar = () => { try { fs.writeFileSync(ARQ, JSON.stringify(feitos)); } catch (_) {} };

// hábito vale hoje? (frequência "semana" só nos dias escolhidos)
const valeHoje = (h, d) => h.freq !== 'semana' || !h.dias.length || h.dias.includes(d.getDay());
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function conferir(db, agora = new Date()) {
  const hoje = dataLocal(agora);
  const hm = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  let mudou = false;
  const marca = (k) => { feitos[k] = hoje; mudou = true; };
  for (const t of db.tarefas) {
    if (t.feita || !t.hora || t.data !== hoje || t.hora > hm) continue;
    const k = `t:${t.id}:${t.data}:${t.hora}`;
    if (feitos[k]) continue;
    marca(k);
    avisar(`Tarefa · ${t.hora}`, t.texto);
  }
  for (const h of db.habitos || []) {
    if (!h.hora || h.hora > hm || !valeHoje(h, agora) || (h.log[hoje] || 0) >= h.alvo || h.criado > hoje) continue;
    const k = `h:${h.id}:${hoje}`;
    if (feitos[k]) continue;
    marca(k);
    avisar(`Rotina · ${h.hora}`, `${h.em} ${h.nome}: ainda não marcado hoje.`);
  }
  if (agora.getHours() >= 9 && !feitos[`fin:${hoje}`]) {
    const vence = (db.fin || []).filter((f) => !f.pago && f.data === hoje);
    if (vence.length) {
      const sai = vence.filter((f) => f.tipo === 'saida').reduce((s, f) => s + f.valor, 0);
      const entra = vence.filter((f) => f.tipo === 'entrada').reduce((s, f) => s + f.valor, 0);
      avisar('Financeiro · vence hoje', `${vence.length} lançamento${vence.length > 1 ? 's' : ''}${sai ? ` · pagar ${brl(sai)}` : ''}${entra ? ` · receber ${brl(entra)}` : ''}`);
    }
    marca(`fin:${hoje}`);
  }
  if (mudou) {
    // limpa marcas com mais de 3 dias
    const limite = dataLocal(new Date(agora.getTime() - 3 * 864e5));
    for (const [k, d] of Object.entries(feitos)) if (d < limite) delete feitos[k];
    gravar();
  }
}

module.exports = { conferir };
