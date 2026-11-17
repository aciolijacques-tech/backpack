// Backpack — leitor em blocos: .md e .txt viram cartões fáceis de ler (sem bibliotecas, tudo escapado).
(function () {
  const esc = T.esc;

  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
    s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
    s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    s = s.replace(/!?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    return s;
  }

  // devolve { html, codigos } — os códigos alimentam os botões "Copiar"
  T.md = (src) => {
    const linhas = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    const codigos = [], secoes = [];
    let atual = { titulo: '', nivel: 0, out: [] };
    let i = 0, meta = '';
    const empurrar = () => { if (atual.titulo || atual.out.length) secoes.push(atual); };

    // cabeçalho de dados (--- chave: valor ---) vira etiquetas
    if (linhas[0] && linhas[0].trim() === '---') {
      const fim = linhas.indexOf('---', 1);
      if (fim > 0 && fim < 40) {
        meta = linhas.slice(1, fim).filter((l) => l.includes(':')).map((l) => {
          const k = l.slice(0, l.indexOf(':')).trim(), v = l.slice(l.indexOf(':') + 1).trim().replace(/^["[]|["\]]$/g, '');
          return v ? `<span class="tag"><b>${esc(k)}</b> ${esc(v)}</span>` : '';
        }).join('');
        i = fim + 1;
      }
    }
    let para = [];
    const fechar = () => { if (para.length) { atual.out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };

    while (i < linhas.length) {
      const l = linhas[i], t = l.trim();
      let m;
      if (/^```/.test(t)) {
        fechar(); const buf = []; i++;
        while (i < linhas.length && !/^```/.test(linhas[i].trim())) buf.push(linhas[i++]);
        i++; codigos.push(buf.join('\n'));
        atual.out.push(`<div class="ld-codigo"><button class="btn sec pequeno" data-codigo="${codigos.length - 1}">${Icones.svg('copiar', 14)} Copiar</button><pre>${esc(buf.join('\n'))}</pre></div>`);
        continue;
      }
      if ((m = /^(#{1,6})\s+(.+?)\s*#*$/.exec(t))) {
        fechar();
        if (m[1].length <= 2) { empurrar(); atual = { titulo: m[2], nivel: m[1].length, out: [] }; } else atual.out.push(`<h4>${inline(m[2])}</h4>`);
        i++; continue;
      }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { fechar(); atual.out.push('<hr>'); i++; continue; }
      if (/^>/.test(t)) {
        fechar(); const buf = [];
        while (i < linhas.length && /^>/.test(linhas[i].trim())) buf.push(linhas[i++].trim().replace(/^>\s?/, ''));
        atual.out.push(`<blockquote>${buf.map(inline).join('<br>')}</blockquote>`); continue;
      }
      if (/^\|.*\|$/.test(t) && i + 1 < linhas.length && /^\|?[\s:|-]+\|?$/.test(linhas[i + 1].trim()) && linhas[i + 1].includes('-')) {
        fechar();
        const row = (x) => x.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const cab = row(t); i += 2; const corpo = [];
        while (i < linhas.length && /^\|.*\|$/.test(linhas[i].trim())) corpo.push(row(linhas[i++]));
        atual.out.push(`<div class="ld-tabela"><table><thead><tr>${cab.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${corpo.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if (/^([-*+•]|\d+[.)])\s+/.test(t)) {
        fechar(); const ord = /^\d/.test(t); const itens = [];
        while (i < linhas.length && (/^\s*([-*+•]|\d+[.)])\s+/.test(linhas[i]) || (/^\s{2,}\S/.test(linhas[i]) && itens.length))) {
          const x = linhas[i];
          if (/^\s*([-*+•]|\d+[.)])\s+/.test(x)) {
            const prof = Math.min(3, Math.floor(x.match(/^\s*/)[0].replace(/\t/g, '  ').length / 2));
            let txt = x.trim().replace(/^([-*+•]|\d+[.)])\s+/, ''), caixa = '';
            const c = /^\[([ xX])\]\s+/.exec(txt);
            if (c) { caixa = `<span class="ld-caixa ${c[1] === ' ' ? '' : 'on'}">${c[1] === ' ' ? '' : '✓'}</span>`; txt = txt.slice(c[0].length); }
            itens.push(`<li style="margin-left:${prof * 18}px" class="${caixa ? 'chk' : ''}">${caixa}<span>${inline(txt)}</span></li>`);
          } else itens[itens.length - 1] = itens[itens.length - 1].replace(/<\/span><\/li>$/, ` ${inline(x.trim())}</span></li>`);
          i++;
        }
        atual.out.push(`<${ord ? 'ol' : 'ul'}>${itens.join('')}</${ord ? 'ol' : 'ul'}>`); continue;
      }
      if (!t) { fechar(); i++; continue; }
      // texto puro: linha curta toda em MAIÚSCULAS vira subtítulo
      if (!para.length && t.length <= 60 && /[A-ZÀ-Ú]/.test(t) && t === t.toUpperCase() && !/[.!?]$/.test(t)) { atual.out.push(`<h4>${inline(t)}</h4>`); i++; continue; }
      para.push(t); i++;
    }
    fechar(); empurrar();
    const html = (meta ? `<div class="ld-meta">${meta}</div>` : '') + secoes.map((s, n) =>
      `<section class="ld-bloco vidro-cartao ${s.nivel === 1 ? 'h1' : ''}" style="--n:${n}">${s.titulo ? `<h3>${inline(s.titulo)}</h3>` : ''}${s.out.join('')}</section>`).join('');
    return { html: `<div class="leitor">${html || '<p class="suave">Arquivo vazio.</p>'}</div>`, codigos };
  };

  T.abrirLeitor = async (a) => {
    let texto = '';
    try {
      const buf = await (await fetch(T.urlAnexo(a))).arrayBuffer();
      try { texto = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (_) { texto = new TextDecoder('windows-1252').decode(buf); }
      texto = texto.replace(/^﻿/, '');
    } catch (e) { return T.toast('Não consegui abrir o arquivo.', null, 'erro'); }
    const { html, codigos } = T.md(texto);
    const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
    const el = document.createElement('div');
    el.className = 'leitor-tela';
    el.innerHTML = `<div class="leitor-barra vidro-escuro">${Icones.svg('livro', 18)}<b>${esc(a.nome)}</b><small>${palavras} palavras · ~${Math.max(1, Math.round(palavras / 200))} min de leitura</small><span class="espaco"></span>
      <button class="btn sec pequeno" data-a="copiar">${Icones.svg('copiar', 14)} Copiar tudo</button><button class="btn sec pequeno" data-a="cru">Ver original</button>
      <a class="btn sec pequeno" href="${T.urlAnexo(a, true)}" download="${esc(a.nome)}">${Icones.svg('baixar', 14)} Baixar</a>
      <button class="btn-icone" data-a="x" title="Fechar (Esc)">${Icones.svg('x', 18)}</button></div><div class="leitor-rolagem">${html}</div>`;
    document.body.appendChild(el);
    T.som('abrir');
    let cru = false;
    const fechar = () => { el.remove(); document.removeEventListener('keydown', tecla, true); };
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
    document.addEventListener('keydown', tecla, true);
    const copiar = async (t) => { await T.copiarTexto(t); T.som('copia'); T.toast('Copiado'); };
    el.onclick = (e) => {
      const b = e.target.closest('[data-a],[data-codigo]'); if (!b) return;
      if (b.dataset.codigo != null) return copiar(codigos[+b.dataset.codigo]);
      if (b.dataset.a === 'x') fechar();
      else if (b.dataset.a === 'copiar') copiar(texto);
      else if (b.dataset.a === 'cru') {
        cru = !cru;
        el.querySelector('.leitor-rolagem').innerHTML = cru ? `<div class="leitor"><div class="ld-codigo"><pre>${esc(texto)}</pre></div></div>` : html;
        b.textContent = cru ? 'Ver em blocos' : 'Ver original';
      }
    };
  };
})();
