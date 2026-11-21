// Backpack — modo foco. O relógio mora no servidor: fechar a janela não para o foco,
// e o sistema (macOS ou Windows) avisa quando acaba.
'use strict';
const fs = require('fs');
const path = require('path');
const { DATA } = require('./dados');

const ARQ = path.join(DATA, 'foco.json');
let foco = { fim: 0, min: 25, pendentes: 0 };
let timer = null;
try { foco = { ...foco, ...JSON.parse(fs.readFileSync(ARQ, 'utf8')) }; } catch (_) {}
const salvar = () => { try { fs.writeFileSync(ARQ, JSON.stringify(foco)); } catch (_) {} };

// aviso nativo do sistema (macOS ou Windows), ver lib/sistema.js
const { avisar } = require('./sistema');

function armar() {
  clearTimeout(timer);
  if (!foco.fim) return;
  const falta = foco.fim - Date.now();
  const acabou = (comAviso) => {
    foco.fim = 0; foco.pendentes = (foco.pendentes || 0) + 1; salvar();
    if (comAviso) avisar('⏱ Foco concluído', `Você ficou ${foco.min} minutos focado. Abra o Backpack para pegar seu XP.`);
  };
  if (falta <= 0) return acabou(false); // terminou com o servidor desligado
  timer = setTimeout(() => acabou(true), falta);
}
armar();

module.exports = {
  avisar,
  estado: () => ({ fim: foco.fim, min: foco.min, pendentes: foco.pendentes || 0, agora: Date.now() }),
  iniciar(min) {
    foco.min = Math.max(1, Math.min(180, Number(min) || 25));
    foco.fim = Date.now() + foco.min * 60000;
    salvar(); armar();
    return { fim: foco.fim, min: foco.min, agora: Date.now() };
  },
  parar() { foco.fim = 0; clearTimeout(timer); salvar(); },
  resgatar() { const n = foco.pendentes || 0; foco.pendentes = 0; salvar(); return n; },
};
