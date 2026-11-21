# Funções que faltavam do MyLoot 2.9

**Pedido (17/11):** "coloque tudo o que não tem." Base: MyLoot 2.9.2 (zip enviado). Entra na
primeira versão pública do Backpack, a 1.0.0 (o número é decidido pelo Jacques).

## Entra
| Função | Onde | Dados |
|---|---|---|
| Tarefa que repete (dia, dias úteis, semana, mês) e lembrete com hora | `tarefas.js`, `lib/lembretes.js` | `tarefa.rep`, `tarefa.hora` |
| Rotina: hábitos (todo dia, dias da semana, X por semana) e metas com progresso | `rotina.js` | `db.habitos`, `db.metas` |
| Clientes: contatos, funil, atalhos, tarefas/itens/lançamentos do cliente | `clientes.js` | `db.clientes`, `item.cliente`, `tarefa.cliente` |
| Financeiro: mês, entradas/saídas, todo mês, parcelado, calculadora de preço, CSV | `financeiro.js` | `db.fin`, `config.calc` |
| Rascunho nas fichas (item e cliente) + "Salvar e fechar" | `core.js` (`T.rasc`) | `rascunho` |
| Voltar e avançar (botões e ⌘[ ⌘]) | `main.js` | histórico do navegador |
| Modelos no "Novo item" | `item.js`, `exemplos/modelos.json` | `item.modelo` |
| Voz: ditar nos campos e criar por voz (Whisper no próprio Mac) | `voz.js`, `voz-worker.js` | anexo de áudio opcional |
| Usar no celular (Wi-Fi de casa, QR Code + código de 6 números, HTTP ou HTTPS) | `lib/rede.js`, `extras.js`, `qr.js` | `data/rede.json`, `data/tls/` |
| 23 kits (negócio e lançamento) com PDF | `exemplos/kit-*.json`, `exemplos/kits/` | pacotes |
| Sincronia entre janelas/aparelhos (junta por id, a cada 4 s) | `core.js` (`T.juntar`) | `rev` |
| Conexões: outros programas mandam itens | `lib/conexoes.js` | `data/conexoes.json`, `item.origem` |
| Backup com senha e exportar para o Obsidian (ZIP) | `lib/exportar.js` | — |
| Tutorial por tela, novidades após atualizar, reportar problema | `tour.js` | `config.tour`, `config.versaoVista` |
| Foco: rodinha do mouse e 6 tempos prontos | `foco.js` | — |
| Lixeira em painéis por tipo, com "apagar de vez" | `paginas.js` | — |

## Fica de fora
- **Cartão de parceiro** e **formulário do Google** do MyLoot: são do autor dele. "Reportar" abre
  uma issue no GitHub do Backpack (a pessoa vê tudo antes; nada é enviado sozinho).
- **"Salvar da web" pelo favorito/compartilhar**: o próprio MyLoot tirou na 2.4.

## Casos-limite e riscos
- **Celular** abre a porta 4323 HTTPS para a rede local (QR Code e código de 6 números) — decisão
  0010. Mitigação: desligado por padrão, cookie só por QR/código, 8 erros = 15 min de bloqueio, rotas
  sensíveis só no Mac, `Host` conferido. Há uma porta extra 4324 HTTP, só como atalho manual (não sai
  no QR) para quem não consegue confiar no certificado — avisado na tela que não é criptografado.
- **Voz** baixa ~80 MB do jsDelivr/Hugging Face na primeira vez (CSP liberada só no worker da voz).
  Sem internet na primeira vez, não funciona. No app do Mac a gravação é nativa (Swift) e precisa da permissão de microfone.
- **Sincronia**: se a mesma coisa muda nos dois lados, fica a versão de quem salvou por último
  nesta janela. Rascunho (`_salvo`) não vai para o servidor.
- **Lembretes** dependem do servidor ligado (launchd) e das notificações do macOS liberadas.

## Financeiro: Casa x Empresa (Jacques, designer que usa IA)
Todo lançamento (`db.fin[]`) agora tem `frente`: `'casa'` | `'empresa'` | `''` (sem classificar — só em
lançamentos de antes dessa divisão existir, quando a categoria antiga não dava pra adivinhar com
segurança). A tela do Financeiro ganhou um seletor Tudo/Empresa/Casa/"A classificar" que filtra
lançamentos, KPIs, gráfico de 6 meses, "para onde foi o dinheiro" e a planilha CSV juntos — não é só um
filtro da lista. Categorias (`T.FIN_CAT`) passaram a ser por frente e tipo, pensadas pro Jacques:
Empresa (Ferramentas de IA, Assinaturas de design, Pró-labore...) e Casa (Moradia, Contas, Saúde...).
O palpite automático de frente para lançamentos antigos (`adivinharFrente` em `lib/dados.js`) só roda
enquanto o campo estiver vazio — uma vez escolhida (pelo palpite ou pela pessoa), nunca é sobrescrita
sozinha de novo.
