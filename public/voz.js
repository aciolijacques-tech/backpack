// Backpack — voz: ditar em qualquer campo (botão de microfone) e criar itens falando.
// Grava, transcreve com o Whisper aqui mesmo (voz-worker.js) e vira nota, tarefa, lançamento ou
// vários itens separados pela IA. Fluxo adaptado do MyLoot (MIT, Prestes Design).
(function () {
  const { esc, $ } = T;

  // ---------- motor ----------
  let worker = null, seq = 0;
  const pedidos = new Map();
  function motor() {
    if (worker) return worker;
    worker = new Worker('/voz-worker.js', { type: 'module' });
    worker.onmessage = (e) => {
      const d = e.data || {}, p = pedidos.get(d.id); if (!p) return;
      if (d.tipo === 'pronto') { pedidos.delete(d.id); p.ok(d.texto); } else if (d.tipo === 'erro') { pedidos.delete(d.id); p.no(new Error(d.msg)); } else p.aviso(d);
    };
    worker.onerror = (e) => {
      for (const p of pedidos.values()) p.no(new Error(`O motor de voz não abriu (${e.message || 'sem internet?'}).`));
      pedidos.clear(); worker = null;
    };
    return worker;
  }
  // áudio (webm, ogg do WhatsApp, m4a, mp3…) → amostras mono a 16 kHz
  async function pcmDe(buf) {
    let dec;
    try { dec = await new OfflineAudioContext(1, 1, 16000).decodeAudioData(buf); } catch (_) { throw new Error('Não consegui ler esse áudio. Tente mp3, m4a, ogg ou wav.'); }
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(dec.duration * 16000)), 16000);
    const f = off.createBufferSource(); f.buffer = dec; f.connect(off.destination); f.start();
    return new Float32Array((await off.startRendering()).getChannelData(0));
  }
  T.transcrever = async (blob, aviso = () => {}) => {
    const pcm = await pcmDe(await blob.arrayBuffer());
    if (pcm.length < 8000) throw new Error('O áudio ficou curto demais.');
    const id = ++seq;
    return new Promise((ok, no) => { pedidos.set(id, { ok, no, aviso }); motor().postMessage({ id, pcm }, [pcm.buffer]); });
  };

  // No app do Mac quem grava é o próprio Mac (Swift); no navegador, o gravador do navegador.
  const nativo = () => !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.backpackMic);
  const podeWeb = () => !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const podeGravar = () => nativo() || podeWeb();
  T.vozDisponivel = () => !T.remoto;

  // ponte com o app do Mac: ele responde chamando T.micNativo({ estado, ... })
  let ponte = null; // { aoNivel, ok, no, fim }
  T.micNativo = (d) => {
    if (!ponte) return;
    if (d.estado === 'nivel') { if (ponte.aoNivel) ponte.aoNivel(d.n || 0); return; }
    if (d.estado === 'gravando' && ponte.ok) { const ok = ponte.ok; ponte.ok = null; ponte.no = null; ok(); return; }
    if (d.estado === 'negado' || d.estado === 'erro') {
      const er = Object.assign(new Error(d.estado === 'negado' ? 'NotAllowedError' : d.msg || 'erro no microfone'), { name: d.estado === 'negado' ? 'NotAllowedError' : 'Error' });
      const no = ponte.no || ponte.fimNo; ponte = null; if (no) no(er); return;
    }
    if (d.estado === 'pronto' && ponte.fim) {
      const bin = atob(d.b64 || ''), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const fim = ponte.fim; ponte = null; fim(new Blob([u8], { type: 'audio/mp4' }));
    }
  };
  function gravarNativo(aoNivel) {
    return new Promise((ok, no) => {
      ponte = { aoNivel, ok, no };
      window.webkit.messageHandlers.backpackMic.postMessage({ acao: 'gravar' });
    }).then(() => ({
      parar: () => new Promise((ok, no) => {
        if (!ponte) { ok(new Blob()); return; }
        ponte.fim = ok; ponte.fimNo = no;
        window.webkit.messageHandlers.backpackMic.postMessage({ acao: 'parar' });
      }),
    }));
  }

  async function gravar(aoNivel) {
    if (nativo()) return gravarNativo(aoNivel);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const mime = tipos.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const partes = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) partes.push(e.data); };
    let ctx = null, raf = 0;
    try {
      ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const d = new Uint8Array(an.fftSize);
      const loop = () => { an.getByteTimeDomainData(d); let mx = 0; for (const v of d) mx = Math.max(mx, Math.abs(v - 128)); aoNivel(Math.min(1, mx / 70)); raf = requestAnimationFrame(loop); };
      loop();
    } catch (_) {}
    rec.start(250);
    return {
      parar: () => new Promise((ok) => {
        rec.onstop = () => { cancelAnimationFrame(raf); if (ctx) ctx.close().catch(() => {}); stream.getTracks().forEach((t) => t.stop()); ok(new Blob(partes, { type: rec.mimeType || 'audio/webm' })); };
        try { rec.stop(); } catch (_) { ok(new Blob(partes)); }
      }),
    };
  }
  const erroMic = (er) => (/denied|permission|NotAllowed/i.test(`${er.name} ${er.message}`) ? 'O microfone está bloqueado. Libere em Ajustes do Sistema → Privacidade e Segurança → Microfone → Backpack.' : `Não consegui usar o microfone: ${er.message}`);
  const avisoDownload = (ref) => (x) => { ref.fase = x.tipo; if (x.tipo === 'baixando' && !ref.avisou) { ref.avisou = true; setTimeout(() => { if (ref.fase === 'baixando') T.toast('Baixando o motor de voz (só na primeira vez, uns 80 MB)…'); }, 1500); } };

  // ---------- ditar num campo: T.micBtn('idDoCampo') ----------
  T.micBtn = (id) => (podeGravar() && !T.remoto ? `<button type="button" class="mic" data-ditar="${id}" title="Falar em vez de digitar" aria-label="Ditar neste campo">${Icones.svg('mic', 15)}</button>` : '');
  let dit = null; // { id, rec, estado, t }
  const ditBtn = () => (dit ? document.querySelector(`[data-ditar="${dit.id}"]`) : null);
  const ditPinta = () => {
    document.querySelectorAll('.mic.on, .mic.espera').forEach((x) => { x.classList.remove('on', 'espera'); x.style.removeProperty('--n'); });
    const b = ditBtn(); if (!b || !dit) return;
    if (dit.estado === 'gravando') b.classList.add('on'); else if (dit.estado === 'transcrevendo') b.classList.add('espera');
  };
  async function ditParar(usar) {
    const d = dit; if (!d || d.estado !== 'gravando') return;
    clearTimeout(d.t); d.estado = 'transcrevendo'; ditPinta();
    let blob = null; try { blob = await d.rec.parar(); } catch (_) {}
    if (!usar || !blob) { dit = null; ditPinta(); return; }
    try {
      const txt = await T.transcrever(blob, avisoDownload({}));
      const el = document.getElementById(d.id);
      if (!txt) T.toast('Não entendi o áudio. Tente falar mais perto do microfone.');
      else if (!el) { T.copiarTexto(txt); T.toast('O campo fechou. O texto falado foi copiado: é só colar.'); } else {
        const umaLinha = el.tagName === 'INPUT';
        const novo = umaLinha ? txt.replace(/\s+/g, ' ').trim().replace(/[.]$/, '') : txt.trim();
        el.value = el.value + (!el.value || /\s$/.test(el.value) ? '' : ' ') + novo;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {}
        T.som('pop');
      }
    } catch (e) { T.toast(e.message, null, 'erro'); }
    dit = null; ditPinta();
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('[data-ditar]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (dit) { if (dit.estado === 'gravando') ditParar(true); return; }
    const d = (dit = { id: b.dataset.ditar, rec: null, estado: 'pedindo', t: 0 });
    try {
      d.rec = await gravar((n) => {
        if (dit !== d) return;
        if (!document.getElementById(d.id)) { ditParar(false); return; } // a janela fechou: joga fora
        const x = ditBtn(); if (x) { if (!x.classList.contains('on')) ditPinta(); x.style.setProperty('--n', n.toFixed(2)); }
      });
      if (dit !== d) { d.rec.parar(); return; }
      d.estado = 'gravando'; ditPinta(); T.som('clique');
      T.toast('Gravando… clique no microfone de novo para parar.');
      d.t = setTimeout(() => { if (dit === d) ditParar(true); }, 180000);
    } catch (er) { dit = null; ditPinta(); T.toast(erroMic(er), null, 'erro'); }
  }, true);

  // ---------- IA: separa a fala em itens ----------
  function pedidoIA() {
    const dia = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
    return `Você recebe a transcrição de um áudio gravado no Backpack (app de notas, tarefas e financeiro). Separe o que a pessoa disse em itens. Hoje é ${T.hoje()} (${dia}).
Responda SÓ com JSON, sem nada em volta, neste formato:
{"itens":[{"tipo":"tarefa","titulo":"...","data":"AAAA-MM-DD ou vazio","hora":"HH:MM ou vazio"},{"tipo":"nota","titulo":"...","texto":"..."},{"tipo":"prompt","titulo":"...","texto":"..."},{"tipo":"link","titulo":"...","url":"..."},{"tipo":"entrada","titulo":"...","valor":0,"data":"AAAA-MM-DD ou vazio","pago":false},{"tipo":"saida","titulo":"...","valor":0,"data":"AAAA-MM-DD ou vazio","pago":false}]}
Regras: "tarefa" é algo a fazer (comece com verbo); datas faladas (amanhã, sexta, dia 20) viram data real; "entrada" (dinheiro que entra) e "saida" (conta, gasto) só quando houver valor em reais, e "pago" diz se já foi pago ou recebido; ideias e informações viram "nota". Não invente nada que não foi dito.`;
  }
  function lerJSON(txt) {
    const m = String(txt || '').match(/\{[\s\S]*\}/);
    if (!m) throw new Error('A IA não devolveu a lista. Tente de novo ou salve como nota.');
    const j = JSON.parse(m[0]);
    return (Array.isArray(j.itens) ? j.itens : []).filter((x) => x && x.tipo);
  }
  const NOME = { tarefa: 'Tarefa', nota: 'Nota', prompt: 'Prompt', link: 'Link', entrada: 'Entrada', saida: 'Saída' };
  const descreve = (x) => {
    const extra = x.tipo === 'tarefa' ? [x.data ? T.fmtData(x.data) : '', x.hora].filter(Boolean).join(' · ')
      : (x.tipo === 'entrada' || x.tipo === 'saida') ? `${T.brl(x.valor)}${x.data ? ` · ${T.fmtData(x.data)}` : ''}${x.pago ? ' · pago' : ''}` : x.tipo === 'link' ? x.url : '';
    return `<span class="pilula">${NOME[x.tipo] || 'Nota'}</span> <b>${esc(x.titulo || '')}</b>${extra ? ` <small class="suave">${esc(extra)}</small>` : ''}`;
  };
  const dataOk = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : '');
  async function criar(x, audio, o) {
    if (x.tipo === 'tarefa') return T.adicionarTarefa(String(x.titulo || '').slice(0, 200), dataOk(x.data), 'media', { hora: /^\d{2}:\d{2}$/.test(x.hora || '') ? x.hora : '', cliente: o.cliente || '' });
    if (x.tipo === 'entrada' || x.tipo === 'saida') {
      const f = { id: T.uid(), tipo: x.tipo, desc: String(x.titulo || '').slice(0, 120), valor: Math.round((Number(x.valor) || 0) * 100) / 100, data: dataOk(x.data) || T.hoje(), pago: !!x.pago, pagoEm: x.pago ? T.hoje() : '', cat: '', cliente: o.cliente || '', forma: '', serie: '', parc: '', obs: 'Criado por voz', criadoEm: T.agora() };
      (T.db.fin || (T.db.fin = [])).push(f); T.salvar(); T.som('moeda');
      return f;
    }
    const tipo = ['nota', 'prompt', 'link'].includes(x.tipo) ? x.tipo : 'nota';
    const it = T.criarItem({ tipo, titulo: String(x.titulo || '').slice(0, 120) || 'Áudio', texto: tipo === 'link' ? String(x.url || '') : String(x.texto || ''), categoria: '', cliente: o.cliente || '' });
    if (audio) await T.anexarArquivos(it, [audio]);
    return it;
  }
  const tituloDe = (t) => { const p = String(t).split(/(?<=[.!?])\s/)[0].trim(); return (p.length > 60 ? `${p.slice(0, 57).replace(/\s\S*$/, '')}…` : p) || 'Áudio'; };
  const arquivo = (blob) => new File([blob], `audio-${T.hoje()}-${Date.now().toString(36).slice(-4)}${/ogg/.test(blob.type) ? '.ogg' : /mp4|m4a|aac/.test(blob.type) ? '.m4a' : /mpeg|mp3/.test(blob.type) ? '.mp3' : /wav/.test(blob.type) ? '.wav' : '.webm'}`, { type: blob.type || 'audio/webm' });

  // ---------- janela "Criar por voz" ----------
  T.vozCriar = (o = {}) => {
    let rec = null, t0 = 0, relogio = 0, ultimo = null;
    const m = T.modal(`${T.cabecalho(`${Icones.svg('mic', 18)} Criar por voz`)}<div class="modal-corpo voz">
      <div class="voz-topo"><button class="voz-mic" id="vMic" aria-label="Gravar">${Icones.svg('mic', 28)}<i id="vNiv"></i></button>
        <div><b id="vSt">${podeGravar() ? 'Clique no microfone e fale' : 'Não dá para gravar aqui'}</b>
        <small class="suave" id="vSub">Fale como num áudio: “ligar pro Rafael amanhã às 10 e anotar a ideia do post de sexta”.</small></div></div>
      <label class="btn sec pequeno arquivo-btn">${Icones.svg('clipe', 14)} Mandar um arquivo de áudio<input type="file" id="vArq" accept="audio/*,.ogg,.opus,.m4a,.mp3,.wav,.webm" hidden></label>
      <div id="vRes" hidden>
        <textarea id="vTx" rows="4" placeholder="O que você falou aparece aqui. Dá para corrigir antes de salvar."></textarea>
        <label class="linha"><input type="checkbox" id="vGuarda"> Guardar o áudio junto (no item)</label>
        <div class="linha"><button class="btn ia" id="vIA">${Icones.svg('ia', 15)} Organizar com IA</button><button class="btn sec" id="vNota">${Icones.svg('nota', 14)} Salvar como nota</button><button class="btn sec" id="vTar">${Icones.svg('tarefas', 14)} Virar tarefa</button></div>
        <div id="vLista"></div></div>
      <small class="suave">A transcrição roda neste ${T.pc}. Na primeira vez ele baixa o motor de voz (uns 80 MB) e depois funciona rápido.</small></div>`,
    { classe: 'pequeno', aoFechar: () => { clearInterval(relogio); if (rec) rec.parar(); } });
    const st = (t, sub) => { $('#vSt', m).textContent = t; if (sub !== undefined) $('#vSub', m).textContent = sub; };
    const mic = $('#vMic', m);
    async function processar(blob) {
      ultimo = blob; mic.disabled = true;
      st('Transcrevendo…', 'Leva alguns segundos.');
      try {
        const txt = await T.transcrever(blob, (x) => { if (x.tipo === 'baixando') st(`Baixando o motor de voz… ${Math.round(x.fracao * 100)}%`, 'Só na primeira vez.'); else if (x.tipo === 'transcrevendo' && x.de > 1) st(`Transcrevendo… parte ${x.trecho} de ${x.de}`); });
        if (!m.isConnected) return;
        $('#vRes', m).hidden = false; $('#vTx', m).value = txt; st(txt ? 'Pronto. Confira o texto:' : 'Não entendi nada no áudio.', '');
        T.som('pop');
      } catch (e) { st('Não deu certo', e.message); T.som('erro'); }
      mic.disabled = false;
    }
    mic.onclick = async () => {
      if (rec) { const r = rec; rec = null; clearInterval(relogio); mic.classList.remove('on'); processar(await r.parar()); return; }
      if (!podeGravar()) return T.toast('Este navegador não deixa gravar aqui. Use “Mandar um arquivo de áudio”.');
      try {
        rec = await gravar((n) => { $('#vNiv', m).style.transform = `scale(${1 + n * 0.6})`; });
        mic.classList.add('on'); t0 = Date.now(); T.som('clique');
        relogio = setInterval(() => { const s = (Date.now() - t0) / 1000; st(`Gravando… ${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`, 'Clique de novo para parar.'); if (s > 600) mic.click(); }, 250);
      } catch (er) { rec = null; T.toast(erroMic(er), null, 'erro'); }
    };
    $('#vArq', m).onchange = (e) => { const f = e.target.files[0]; if (f) processar(f); };
    const txt = () => $('#vTx', m).value.trim();
    const anexo = () => ($('#vGuarda', m).checked && ultimo ? arquivo(ultimo) : null);
    $('#vNota', m).onclick = async () => {
      if (!txt()) return T.falta($('#vTx', m), 'Não tem texto para salvar.');
      const it = await criar({ tipo: 'nota', titulo: tituloDe(txt()), texto: txt() }, anexo(), o);
      T.fecharModal(); T.render(); T.toast('Nota criada'); if (it) T.abrirItem(it.id);
    };
    $('#vTar', m).onclick = async () => {
      if (!txt()) return T.falta($('#vTx', m), 'Não tem texto para virar tarefa.');
      const t = T.adicionarTarefa(txt().replace(/\s+/g, ' ').slice(0, 300), '', 'media', { cliente: o.cliente || '' });
      T.fecharModal(); T.render(); T.toast(t && t.data ? `Tarefa criada para ${T.fmtData(t.data)}` : 'Tarefa criada');
    };
    $('#vIA', m).onclick = async () => {
      if (!txt()) return T.falta($('#vTx', m), 'Não tem texto para organizar.');
      const b = $('#vIA', m); b.disabled = true; b.textContent = 'Organizando…';
      try {
        const r = await T.api('/api/ia', { method: 'POST', body: JSON.stringify({ acao: 'livre', pedido: pedidoIA(), texto: txt(), via: T.db.config.ia.ultima || undefined }) });
        const L = lerJSON(r.texto);
        if (!L.length) throw new Error('A IA não achou nada para criar. Salve como nota.');
        $('#vLista', m).innerHTML = `<div class="voz-lista">${L.map((x, i) => `<label class="linha-mini"><input type="checkbox" data-i="${i}" checked> ${descreve(x)}</label>`).join('')}</div>
          <div class="linha fim"><button class="btn" id="vCriar">${Icones.svg('check', 15)} Criar os marcados</button></div>`;
        $('#vCriar', m).onclick = async () => {
          const marcados = [...m.querySelectorAll('[data-i]:checked')].map((c) => L[+c.dataset.i]);
          if (!marcados.length) return T.toast('Marque pelo menos um.');
          let audio = anexo();
          for (const x of marcados) { await criar(x, ['nota', 'prompt', 'link'].includes(x.tipo) ? audio : null, o); if (['nota', 'prompt', 'link'].includes(x.tipo)) audio = null; }
          T.fecharModal(); T.render(); T.toast(`${marcados.length} criado${marcados.length > 1 ? 's' : ''}`);
        };
      } catch (e) { T.toast(e.message, null, 'erro'); }
      b.disabled = false; b.innerHTML = `${Icones.svg('ia', 15)} Organizar com IA`;
    };
  };
})();
