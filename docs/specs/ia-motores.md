# Spec — IA: um motor por vez (Claude ou Codex) e modelos Claude / GPT

## O que muda
- Nas Configurações → IA, as chaves do **Claude Code** e do **Codex** passam a ser exclusivas: ligar
  uma desliga a outra. Dá para deixar as duas desligadas (aí só a chave da API do Claude, se houver).
- A lista "Modelo do Claude" vira **"Modelo do Claude / GPT"**, com dois grupos:

  | Nível            | Claude            | GPT (Codex)    |
  |------------------|-------------------|----------------|
  | Mais caprichado  | Claude Opus 5.5   | GPT-6.2-Astra  |
  | Rápido e bom     | Claude Sonnet 5.5 | GPT-6.2-Sol    |
  | Mais barato      | Claude Haiku 5.5  | GPT-6-Luna     |

- Escolher um modelo GPT liga o Codex (e desliga o Claude Code); escolher um modelo Claude liga o
  Claude Code. Ligar uma chave troca o modelo pelo par do mesmo nível no outro motor.
- A lista "Qual usar" sai: quem decide é a chave ligada. A janela da primeira vez segue a mesma regra.
- A chave da API do Claude continua como reserva e usa o modelo Claude do mesmo nível.

## Troca automática quando o limite acaba
- Se o motor ligado responder que o limite de uso acabou (limite da assinatura, cota, "rate limit",
  erro 429), o Backpack tenta **uma vez** o outro motor, se estiver instalado, com o modelo par. Se
  não houver, tenta a chave da API do Claude, se houver.
- A troca vale só para aquele pedido: a chave ligada não muda. O app avisa: "O Claude chegou ao
  limite; desta vez usei o Codex."
- Erro que não é de limite (login, falta de internet, erro do programa) não troca de motor.
- Se o motor ligado não estiver instalado, usa o outro motor instalado (como já era no "Automático").

## Dados
- `config.ia.modelo` aceita os seis modelos; valor desconhecido vira Claude Sonnet 5.5.
- `config.ia.ligadas` nunca fica com as duas ligadas: ao ler o db, se as duas estiverem ligadas,
  fica o Codex só quando `via` era `codex` (ou o modelo era GPT); senão, fica o Claude Code.
  `via: "api"` antigo vira as duas desligadas.
- O modelo salvo sempre é do motor ligado: com o Codex ligado e um modelo Claude salvo, vira o GPT do
  mesmo nível (e o contrário). Com as duas desligadas, fica o Claude (usado pela chave da API).

## Testes
- Programas falsos de `claude` e `codex` (variável `BACKPACK_IA_PATH`) cobrem: motor ligado
  responde; limite do Claude cai no Codex com o modelo par; erro comum não troca; normalização das
  chaves exclusivas ao gravar o db.
