// Backpack — seções novas das Configurações: usar no celular, conexões com outros programas,
// dados (backup com senha e exportar para o Obsidian) e ajuda. Também detecta se está no celular.
(function () {
  const { esc, $ } = T;
  T.remoto = false;
  // nome do computador nos textos (o servidor diz o sistema; o celular mostra o do computador)
  T.pc = /Mac/.test(navigator.platform) ? 'Mac' : /Win/.test(navigator.platform) ? 'PC' : 'computador';
  T.mod = /Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl+';

  T.iniciarCelular = async () => {
    try { const r = await T.api('/api/ping'); T.remoto = !!r.remoto; if (r.so) T.pc = r.so === 'darwin' ? 'Mac' : r.so === 'win32' ? 'PC' : 'computador'; } catch (_) {}
    document.body.classList.toggle('remoto', T.remoto);
  };

  // toque longo vira clique direito no iPhone/iPad (eles não têm botão direito)
  if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform))) {
    let t = 0, alvo = null, xy = null;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      alvo = e.target; const tc = e.touches[0]; xy = [tc.clientX, tc.clientY];
      t = setTimeout(() => { if (alvo) alvo.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: xy[0], clientY: xy[1] })); alvo = null; }, 550);
    }, { passive: true });
    const cancela = () => { clearTimeout(t); alvo = null; };
    document.addEventListener('touchmove', cancela, { passive: true });
    document.addEventListener('touchend', cancela, { passive: true });
  }

  // ---------- usar no celular ----------
  T.secaoCelular = () => `<section class="cfg vidro-cartao" id="sec-celular"><h3>${Icones.svg('tela', 18)} Usar no celular</h3><div id="celBox"><small class="suave">Carregando…</small></div></section>`;
  T.ligarSecaoCelular = async () => {
    const box = $('#celBox'); if (!box) return;
    if (T.remoto) { box.innerHTML = `<p class="suave">Você está usando pelo celular. Para ligar, desligar ou trocar o código, use o ${T.pc}.</p>`; return; }
    let s;
    try { s = await T.api('/api/rede'); } catch (e) { box.innerHTML = `<small class="vermelho">${esc(e.message)}</small>`; return; }
    const desenhar = () => {
      box.innerHTML = `<div class="cfg-linha"><span>Liberar na rede Wi-Fi de casa ${T.dica('Celular e ${T.pc} precisam estar no mesmo Wi-Fi. A conexão é criptografada (HTTPS). Só entra quem ler o QR Code ou digitar o código. Configurações, chaves e desligar continuam só no Mac.')}</span>${T.chave('celOn', s.on)}</div>
        ${s.erro ? `<p class="vermelho">${esc(s.erro)}</p>` : ''}
        ${s.on ? (s.link ? `<div class="cel-qr"><div class="qr">${T.qrSvg(s.link, 190)}</div><div><p>1. No celular, abra a câmera e aponte para o QR Code.</p><p>2. Ou abra <b class="mono">https://${esc(s.ips[0])}:${s.portaTls}</b> no navegador e digite o código:</p>
            <div class="pin">${esc(s.pin.replace(/(\d{3})(\d{3})/, '$1 $2'))}</div>
            <p class="suave pequeno-txt">Na primeira vez aparece “conexão não privada” (o certificado é deste ${T.pc}, não de uma empresa). Toque em “Mostrar detalhes → visitar o site” e depois em <a href="https://${esc(s.ips[0])}:${s.portaTls}/certificado" target="_blank">“Instale o certificado deste Mac”</a>: uma vez só, o aviso some de qualquer navegador, incluindo o Chrome.</p>
            <details class="pequeno-txt"><summary class="suave" style="cursor:pointer">Chrome ainda não conecta?</summary><p class="suave">Use <b class="mono">http://${esc(s.ips[0])}:${s.porta}</b> em vez do link acima — sem criptografia, só na sua rede de casa.</p></details>
            <button class="btn sec pequeno" id="celTroca">${Icones.svg('atualizar', 13)} Trocar código</button> ${T.dica('Gera um QR e um código novos e desconecta todos os celulares que já entraram.')}</div></div>`
          : `<p class="vermelho">Não achei o ${T.pc} numa rede Wi-Fi. Conecte no Wi-Fi e abra esta tela de novo.</p>`)
          : `<p class="suave">Desligado: só este ${T.pc} acessa o Backpack.</p>`}
        <small class="suave">Na primeira vez, o macOS pode perguntar se o “node” pode aceitar conexões: clique em Permitir.</small>`;
      $('#celOn', box).onchange = async (e) => {
        try { s = await T.api('/api/rede', { method: 'POST', body: JSON.stringify({ on: e.target.checked }) }); T.som('clique'); desenhar(); } catch (er) { T.toast(er.message, null, 'erro'); s = await T.api('/api/rede').catch(() => s); desenhar(); }
      };
      if ($('#celTroca', box)) {
        $('#celTroca', box).onclick = async () => {
          if (!(await T.confirmar('Trocar o código? Os celulares que já entraram vão precisar entrar de novo.', 'Trocar', false))) return;
          s = await T.api('/api/rede/trocar', { method: 'POST' }); desenhar(); T.toast('Código novo gerado');
        };
      }
    };
    desenhar();
  };

  // ---------- conexões com outros programas ----------
  T.secaoConexoes = () => `<section class="cfg vidro-cartao" id="sec-conexoes"><h3>${Icones.svg('enviar', 18)} Conexões ${T.dica('Outros programas deste ${T.pc} (um atalho, um script, outro app) podem mandar itens para o Backpack com um código. Cada programa tem o seu e dá para desligar.')}</h3><div id="cnxBox"><small class="suave">Carregando…</small></div></section>`;
  T.ligarSecaoConexoes = async () => {
    const box = $('#cnxBox'); if (!box) return;
    if (T.remoto) { box.innerHTML = `<p class="suave">As conexões são configuradas no ${T.pc}.</p>`; return; }
    const desenhar = async () => {
      let r;
      try { r = await T.api('/api/conexoes'); } catch (e) { box.innerHTML = `<small class="vermelho">${esc(e.message)}</small>`; return; }
      const exemplo = `curl -X POST http://127.0.0.1:${r.porta}/api/entrada \\\n  -H "Content-Type: application/json" \\\n  -H "X-Backpack-Conexao: SEU_CODIGO" \\\n  -d '{"formato":"${r.formato}","app":"Meu atalho","itens":[{"id":"1","tipo":"nota","titulo":"Oi do atalho"}]}'`;
      box.innerHTML = `${r.conexoes.map((c) => `<div class="cnx" data-c="${c.id}"><div><b>${esc(c.nome)}</b><small class="suave">${c.recebidos || 0} recebido${c.recebidos === 1 ? '' : 's'}${c.ultimoUso ? ` · último em ${new Date(c.ultimoUso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</small>
          <code class="mono cnx-cod">${esc(c.codigo)}</code></div><button class="btn sec pequeno" data-cop="${esc(c.codigo)}">${Icones.svg('copiar', 13)}</button>${T.chave(`cx-${c.id}`, c.on)}<button class="btn-x" data-rm="${c.id}" title="Apagar">${Icones.svg('x', 14)}</button></div>`).join('') || '<p class="suave">Nenhum programa conectado.</p>'}
        <div class="linha"><input type="text" id="cnxNome" placeholder="Nome do programa (ex.: um atalho ou script)" maxlength="40"><button class="btn sec" id="cnxNovo">${Icones.svg('mais', 14)} Criar código</button></div>
        <details><summary class="suave">Como mandar um item (exemplo)</summary><pre class="mono pequeno-txt">${esc(exemplo)}</pre>
          <small class="suave">Mesmo programa + mesmo "id" atualiza o item em vez de duplicar. Tipos: pdf, prompt, instrucao, comando, link, nota, skill. Só pedidos deste ${T.pc} são aceitos.</small></details>`;
      box.onclick = async (e) => {
        const cp = e.target.closest('[data-cop]'); if (cp) { T.copiarTexto(cp.dataset.cop); return T.toast('Código copiado'); }
        const rm = e.target.closest('[data-rm]');
        if (rm && await T.confirmar('Apagar este código? O programa que usa ele para de conseguir mandar itens.', 'Apagar')) { await T.api('/api/conexoes/apagar', { method: 'POST', body: JSON.stringify({ id: rm.dataset.rm }) }); desenhar(); }
        if (e.target.closest('#cnxNovo')) { await T.api('/api/conexoes', { method: 'POST', body: JSON.stringify({ nome: $('#cnxNome', box).value }) }); T.som('pop'); desenhar(); }
      };
      box.onchange = async (e) => {
        const id = (e.target.id || '').replace(/^cx-/, ''); if (!e.target.id.startsWith('cx-')) return;
        await T.api('/api/conexoes/mudar', { method: 'POST', body: JSON.stringify({ id, on: e.target.checked }) }); T.som('clique');
      };
    };
    desenhar();
  };

  // ---------- dados ----------
  T.secaoDados = () => `<section class="cfg vidro-cartao" id="sec-dados"><h3>${Icones.svg('pasta', 18)} Dados</h3>
      <div class="linha"><a class="btn sec" href="/api/backup" download>${Icones.svg('baixar', 14)} Backup (.json)</a><button class="btn sec" id="dSenha">${Icones.svg('chave', 14)} Backup com senha</button>
        <button class="btn sec" id="cRestaurar">${Icones.svg('subir', 14)} Restaurar backup</button><input type="file" id="cRestArq" accept=".json,.backpack,application/json" hidden></div>
      <div class="linha"><a class="btn sec" href="/api/exportar-md" download>${Icones.svg('livro', 14)} Exportar para o Obsidian (.zip)</a>${T.dica('Cada item vira um arquivo .md numa pasta por tipo, com os anexos. Clientes, tarefas e rotina também. O financeiro vai em planilha (CSV). Extraia e use “Abrir pasta como cofre” no Obsidian.')}</div>
      <small class="suave">Cópia automática todo dia em <code>data/backups</code> (guarda as 20 mais novas). Os anexos ficam em <code>data/anexos</code>. O backup com senha usa AES-256: sem a senha, ninguém abre (nem você).</small></section>`;
  T.ligarSecaoDados = () => {
    if (!$('#dSenha')) return;
    $('#dSenha').onclick = () => {
      const m = T.modal(`${T.cabecalho(`${Icones.svg('chave', 18)} Backup com senha`)}<div class="modal-corpo">
        <label class="campo">Senha (mínimo 6 caracteres)<input type="password" id="bs1" autocomplete="new-password"></label>
        <label class="campo">Repita a senha<input type="password" id="bs2" autocomplete="new-password"></label>
        <p class="suave">Guarde a senha num lugar seguro: sem ela o arquivo não abre.</p>
        <div class="linha fim"><button class="btn" id="bsOk">${Icones.svg('baixar', 14)} Baixar</button></div></div>`, { classe: 'pequeno' });
      $('#bs1', m).focus();
      $('#bsOk', m).onclick = async () => {
        const a = $('#bs1', m).value, b = $('#bs2', m).value;
        if (a.length < 6) return T.falta($('#bs1', m), 'Use pelo menos 6 caracteres.');
        if (a !== b) return T.falta($('#bs2', m), 'As senhas não são iguais.');
        try {
          T.salvar(true); await new Promise((r) => setTimeout(r, 300));
          const r = await fetch('/api/backup/senha', { method: 'POST', headers: { 'X-Backpack': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: a }) });
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro || 'Não consegui gerar.');
          const link = document.createElement('a');
          link.href = URL.createObjectURL(await r.blob()); link.download = `backpack-backup-${T.hoje()}.backpack`; link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 4000);
          T.fecharModal(); T.toast('Backup com senha baixado');
        } catch (e) { T.toast(e.message, null, 'erro'); }
      };
    };
    $('#cRestaurar').onclick = () => $('#cRestArq').click();
    $('#cRestArq').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      e.target.value = '';
      let corpo;
      try { corpo = JSON.parse(await f.text()); } catch (_) { return T.toast('Esse arquivo não é um backup do Backpack.', null, 'erro'); }
      if (corpo.formato === 'backpack-cripto') {
        const senha = await pedirSenha(); if (senha == null) return;
        corpo.senha = senha;
      }
      if (!(await T.confirmar('Trocar os dados atuais pelos desse backup? Uma cópia dos atuais é guardada antes.', 'Restaurar'))) return;
      try { await T.api('/api/restaurar', { method: 'POST', body: JSON.stringify(corpo) }); await T.carregar(); T.aplicarConfig(); T.montarFundo(); T.toast('Backup restaurado'); T.ir('biblioteca'); } catch (er) { T.toast(er.message, null, 'erro'); }
    };
  };
  const pedirSenha = () => new Promise((res) => {
    const m = T.modal(`${T.cabecalho('Senha do backup')}<div class="modal-corpo"><input type="password" id="ps" placeholder="Senha"><div class="linha fim"><button class="btn sec" id="psN">Cancelar</button><button class="btn" id="psOk">Abrir</button></div></div>`, { classe: 'pequeno', aoFechar: () => res(null) });
    $('#ps', m).focus();
    const ok = () => { res($('#ps', m).value); T.fecharModal(); }; // resolver de novo com null no fechar não muda nada
    $('#psOk', m).onclick = ok; $('#ps', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    $('#psN', m).onclick = () => T.fecharModal();
  });

  // ---------- ajuda ----------
  T.secaoAjuda = () => `<section class="cfg vidro-cartao" id="sec-ajuda"><h3>${Icones.svg('alerta', 18)} Ajuda</h3>
      <div class="cfg-linha"><span>Tutoriais na primeira vez em cada tela</span>${T.chave('ajTour', !T.db.config.tourOff)}</div>
      <div class="linha"><button class="btn sec" id="ajReinicia">${Icones.svg('desfazer', 14)} Ver os tutoriais de novo</button><button class="btn sec" id="ajReportar">${Icones.svg('alerta', 14)} Reportar problema ou sugestão</button></div></section>`;
  T.ligarSecaoAjuda = () => {
    if (!$('#ajTour')) return;
    $('#ajTour').onchange = (e) => { T.db.config.tourOff = !e.target.checked; T.salvar(); T.som('clique'); };
    $('#ajReinicia').onclick = () => { T.db.config.tour = {}; T.db.config.tourOff = false; T.salvar(); T.toast('Pronto: cada tela mostra o tutorial de novo na próxima visita.'); T.render(); };
    $('#ajReportar').onclick = () => T.reportar();
  };
})();
