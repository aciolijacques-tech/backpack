# Backpack — Design System

Direção: vidro fosco claro sobre um ambiente quente desfocado, seguindo a referência visual do
Jacques (dashboard em vidro com indicadores, calendário e agenda). Sem fotos — o "ambiente" é
feito só com gradientes desfocados. Decisão em `docs/decisoes/0004-design-referencia.md`.

## Estrutura da tela
- **Barra do topo** (vidro escuro, pílula flutuante): ícone, busca, botão + novo item.
- **Trilho lateral** (vidro escuro, pílula vertical): filtros por tipo, só ícones; nome e contagem
  aparecem ao passar o mouse.
- **Janela** (vidro claro, cantos 34px): saudação, 4 indicadores, Biblioteca em cartões.
- **Coluna lateral** (vidro escuro): calendário do mês + próximas tarefas.
- Celular: trilho vira linha horizontal, coluna lateral desce para baixo.

## Fundo
Três ambientes (casa, escritório, aula) em `public/ambientes/`, revezando com fade de 1,8 s.
Véu radial escuro nas bordas para contraste. Tema escuro: imagens a 42% de brilho.
Vidro: janela `rgba(250,247,243,.26)` + blur 26px + saturação 180%; cartões `rgba(255,255,255,.7)`.
Textos direto sobre o vidro levam uma sombra clara de 1px.

## Ícone
Mochila só em traço branco sobre quadrado arredondado laranja (gradiente `#ff9628` → `#ff6e00`).
Arquivos: `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` e o `.icns` do instalador.

## Cor
| Token | Valor | Uso |
|---|---|---|
| `--accent` | `#ff7e00` | ação primária, filtro ativo, cartão de tarefa de hoje |
| `--tinta` | `#1c1d21` | texto principal |
| `--tinta-2` / `--tinta-3` | `#5d6068` / `#8b8e96` | texto secundário / terciário |
| `--vidro` | `rgba(240,236,231,.42)` + blur 28px | janela principal |
| `--vidro-escuro` | `rgba(32,33,38,.62)` + blur 24px | topo, trilho, coluna lateral |
| `--cartao` | `rgba(255,255,255,.88)` | cartões e indicadores |
| `--verde` / `--vermelho` | `#2fbf71` / `#ff4d5e` | tarefa futura/hoje / atrasada |

### Cor por tipo de item
| Tipo | Cor |
|---|---|
| Estudo/PDF | `#4f8cff` |
| Prompt | `#a46bff` |
| Instrução | `#2fbf8f` |
| Comando | `#ff7e00` |
| Link | `#e0b100` |
| Nota | `#ff5a7a` |

## Forma
- Raios: janela 34px, coluna lateral 26px, cartões 20px, campos 12px, botões em pílula (999px).
- Sombra da janela: `0 30px 80px rgba(40,25,10,.28)`; cartões: `0 6px 20px rgba(40,25,10,.08)`.
- Ícones: SVG de traço 1.8px em `public/icones.js` (sem biblioteca de ícones).

## Tipografia
- Interface: fonte do sistema (SF Pro no Mac). Títulos 26px/17px, corpo 13–15px.
- Comandos: `ui-monospace` / SF Mono, sobre fundo cinza claro.

## Espaçamento
Escala: `4 8 12 16 24 32 48` (px).

## Rotina, Clientes e Financeiro
- Telas novas (Rotina, Clientes, Financeiro) usam os mesmos cartões de vidro, pílulas e chips.
- Verde = entrou/feito, vermelho = saiu/atrasado, laranja = ação principal. Um botão cheio por bloco.
- Fichas (item e cliente) têm rodapé fixo "Salvar e fechar"; mudança não salva aparece em amarelo.
- Microfone ao lado dos campos (círculo); gravando fica vermelho e pulsa com o volume.
- Telas largas: grupos lado a lado (tarefas, lixeira, configurações em colunas com menu de seções).
