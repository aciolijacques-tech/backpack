# Backpack — gera os kits (exemplos/kit-*.json) e os PDFs (exemplos/kits/) a partir dos textos-base
# do MyLoot (github.com/edirsooo/myloot, MIT, © 2026 Prestes Design), com marca e visual do Backpack.
# Uso (só para quem mantém o projeto): python3 ferramentas/gerar_kits.py <pasta exemplos do MyLoot>
# Precisa de Python com Playwright e Chrome. Os arquivos gerados vão para o Git; o app não roda isto.
import asyncio, html, json, re, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = Path(sys.argv[1]) if len(sys.argv) > 1 else None
AVISO_CONTRATO = 'MODELO DE REFERÊNCIA: revise com um advogado antes de usar. Leis e situações mudam; adapte ao seu caso.'

def adaptar(txt):
    txt = re.sub(r'\bno MyLoot\b', 'no Backpack', txt)
    txt = re.sub(r'\bO MyLoot\b', 'O Backpack', txt)
    txt = re.sub(r'\bMyLoot\b', 'Backpack', txt)
    txt = re.sub(r'Prestes Design', 'sua empresa', txt, flags=re.I)
    return txt

def converter(nome_arq, novo_id, cat):
    d = json.loads((ORIGEM / nome_arq).read_text(encoding='utf-8'))
    itens = []
    for i in d['itens']:
        tipo = {'estudo': 'pdf'}.get(i.get('tipo'), i.get('tipo', 'nota'))
        texto = adaptar(i.get('conteudo', ''))
        if i['titulo'].startswith('Contrato'):
            texto = f'{AVISO_CONTRATO}\n\n{texto}'
        pdf = f"{i['titulo'].replace('/', '-').replace('—', '-').replace(':', ' -')}.pdf"
        pdf = re.sub(r'\s+', ' ', pdf)
        itens.append({
            'tipo': tipo, 'titulo': i['titulo'], 'descricao': adaptar(i.get('descricao', '')), 'texto': texto,
            'tags': i.get('etiquetas', []), 'modelo': bool(i.get('modelo')), 'fav': bool(i.get('favorito')),
            'checklist': [{'t': adaptar(c)} for c in i.get('checklist', [])], 'arquivos': [pdf],
        })
    out = {'id': novo_id, 'pasta': 'kits', 'categoria': cat,
           'origem': 'Textos-base adaptados do MyLoot (MIT, Prestes Design).', 'itens': itens}
    (RAIZ / 'exemplos' / f'{novo_id.rsplit("-v", 1)[0]}.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    return itens

CSS = """
@page{size:A4;margin:18mm 16mm 20mm}
body{font:11pt/1.55 -apple-system,'Helvetica Neue',Arial,sans-serif;color:#1c1d21}
.capa{border-radius:22px;padding:26px 28px;margin-bottom:22px;color:#fff;
 background:linear-gradient(135deg,#ff8a1f,#ff6a00)}
.capa small{opacity:.85;font-weight:600;letter-spacing:.5px;text-transform:uppercase;font-size:9pt}
.capa h1{margin:6px 0 6px;font-size:22pt;line-height:1.15}
.capa p{margin:0;opacity:.92}
.marca{display:flex;align-items:center;gap:8px;margin-bottom:14px;font-weight:700}
.marca i{width:22px;height:22px;border-radius:7px;background:#fff;display:inline-block}
h2{font-size:12pt;margin:18px 0 6px;color:#ff6a00;letter-spacing:.3px}
p.l{margin:0 0 4px;white-space:pre-wrap}
.campo{border-bottom:1px solid #e3e0dc;min-height:18px;margin:2px 0 8px}
.aviso{background:#fff4e0;border:1px solid #ffd59a;color:#8a4b00;padding:10px 12px;border-radius:12px;margin-bottom:14px;font-size:10pt}
ul.check{list-style:none;padding:0} ul.check li::before{content:'☐  '}
footer{margin-top:26px;font-size:8.5pt;color:#8b8e96;border-top:1px solid #ece9e5;padding-top:8px}
"""

def corpo_html(i):
    linhas = i['texto'].split('\n')
    partes = []
    for ln in linhas:
        s = ln.strip()
        if s.startswith('MODELO DE REFERÊNCIA'):
            partes.append(f'<div class="aviso">{html.escape(s)}</div>'); continue
        if s and len(s) < 70 and s == s.upper() and re.search('[A-ZÁÉÍÓÚÂÊÔÃÕÇ]', s) and not s.startswith('['):
            partes.append(f'<h2>{html.escape(s)}</h2>'); continue
        if not s:
            continue
        partes.append(f'<p class="l">{html.escape(ln)}</p>')
        if s.endswith(':') or s.endswith('?'):
            partes.append('<div class="campo"></div>')
    if i['checklist']:
        partes.append('<h2>CHECKLIST</h2><ul class="check">' + ''.join(f'<li>{html.escape(c["t"])}</li>' for c in i['checklist']) + '</ul>')
    return f"""<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>{CSS}</style><body>
<div class="capa"><div class="marca"><i></i> Backpack</div><small>{html.escape(KIT_NOME)}</small><h1>{html.escape(i['titulo'])}</h1><p>{html.escape(i['descricao'])}</p></div>
{''.join(partes)}
<footer>Kit do Backpack (código aberto). Texto-base adaptado do MyLoot (MIT). Personalize antes de usar.</footer></body></html>"""

async def pdfs(itens):
    from playwright.async_api import async_playwright
    global KIT_NOME
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page()
        for kit, L in itens:
            KIT_NOME = kit
            for i in L:
                await pg.set_content(corpo_html(i))
                await pg.pdf(path=str(RAIZ / 'exemplos' / 'kits' / i['arquivos'][0]), format='A4', print_background=True)
        await b.close()

KIT_NOME = ''
if __name__ == '__main__':
    neg = converter('kit-negocio.json', 'kit-negocio-v1', {'id': 'c-negocio', 'nome': 'Kit do negócio', 'icone': '💼', 'cor': '#ff7e00'})
    lan = converter('kit-lancamento.json', 'kit-lancamento-v1', {'id': 'c-lancamento', 'nome': 'Kit de lançamento', 'icone': '🚀', 'cor': '#4f8cff'})
    asyncio.run(pdfs([('Kit do negócio', neg), ('Kit de lançamento', lan)]))
    print(len(neg) + len(lan), 'kits')
