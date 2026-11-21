# Produção do tutorial 1.0.1: capturas e itens a conferir

Tutorial: [tutorial-backpack-1.0.1.md](tutorial-backpack-1.0.1.md)
Base: código da pasta de trabalho em 20/11/2026. A versão 1.0.1 ainda não tem commit; o último commit é "Backpack 1.0.0".

---

## Capturas de tela necessárias

Salvar em `docs/tutorial/capturas/`. Usar dados de exemplo, nunca dados reais de clientes ou finanças.

| Arquivo | Seção | O que mostrar |
| --- | --- | --- |
| `01-pasta-instalar.png` | 2 | Pasta do Backpack no Finder com **Instalar Backpack** e **Desinstalar.command** visíveis |
| `02-instalado.png` | 2 | Diálogo **"Backpack instalado!"** |
| `03-abrir-mesmo-assim.png` | 2 | Ajustes do Sistema → Privacidade e Segurança com o botão **"Abrir mesmo assim"** |
| `04-aplicativos.png` | 2 | Backpack na pasta Aplicativos |
| `05-menu.png` | 3 | Menu lateral com as 12 telas e o botão **? Tutorial** ao lado do nome da tela |
| `06-tutorial-tela.png` | 3 | Um passo do tutorial do app aberto (caixa com "1 de N", **Próximo**) |
| `07-biblioteca-tipos.png` | 4 | Biblioteca com os chips dos 7 tipos, incluindo **Skill** |
| `08-item-status-etiquetas.png` | 4 | Item aberto com os campos **Status** e **Etiquetas** |
| `09-tarefa-prioridade.png` | 4 | Lista de tarefas com as pílulas **Baixa / Média / Alta** |
| `10-kits.png` | 4 | Biblioteca filtrada pela categoria **Kit do negócio**, com um kit aberto e o PDF anexado |
| `11-clientes-funil.png` | 5 | Clientes no modo **Funil** (Prospect, Ativo, Pausado, Encerrado) |
| `12-cliente-recebimento.png` | 5 | Ficha do cliente com **Financeiro do cliente** e a janela **Editar lançamento** (**Já recebi**, **Apagar**) |
| `13-financeiro-frentes.png` | 5 | Financeiro com **Tudo / Empresa / Casa** e os indicadores do mês |
| `14-lancamento-repetir.png` | 5 | Janela **Novo lançamento** com **Repetir** aberto (**Todo mês (12 meses)**, **Parcelado**) |
| `15-calcular-preco.png` | 5 | Janela **Quanto cobrar** preenchida |
| `16-ditar-campo.png` | 6 | Campo com o botão de microfone gravando |
| `17-criar-por-voz.png` | 6 | Janela **Criar por voz** com o texto transcrito e os botões **Organizar com IA / Salvar como nota / Virar tarefa** |
| `18-voz-baixando.png` | 6 | Mensagem **"Baixando o motor de voz…"** (primeira vez) |
| `19-celular-config.png` | 7 | Configurações → **Usar no celular** ligado, com QR Code e código de 6 números (usar um código descartável e trocar depois) |
| `20-celular-entrar.png` | 7 | Tela **Entrar no Backpack** no celular |
| `21-celular-aviso.png` | 7 | Aviso "conexão não privada" no navegador do celular |
| `22-certificado.png` | 7 | Página **Confiar no Backpack deste Mac** no celular |
| `23-iphone-confianca.png` | 7 | iPhone: Ajustes de Confiança de Certificados com **Backpack** ligado |
| `24-android-certificado.png` | 7 | Android: Instalar certificado → Certificado de CA |
| `25-chrome-nao-conecta.png` | 7 | Mac: **"Chrome ainda não conecta?"** aberto, mostrando o endereço da porta 4324 |
| `26-dados.png` | 8 | Configurações → **Dados** com os quatro botões |
| `27-backup-senha.png` | 8 | Janela **Backup com senha** |
| `28-lixeira.png` | 8 | Lixeira com **Restaurar**, **Apagar de vez** e **Esvaziar** |
| `29-aviso-versao.png` | 9 | Janela **"Saiu o Backpack…"** com **Depois / Atualizar agora** |
| `30-falta-um-passo.png` | 9 | Janela **"Falta um passo"** |
| `31-microfone-bloqueado.png` | 10 | Ajustes do Sistema → Privacidade e Segurança → Microfone com o Backpack |
| `32-reportar.png` | 10 | Janela **Reportar problema ou sugestão** |

---

## Itens [CONFERIR]

O que o código não confirma, ou o que diverge entre código, documentação e o pedido.

1. **Destino do QR Code.** O código (`lib/rede.js`, `status()`; `public/extras.js`) faz o QR e o endereço principal apontarem para a **4323 (HTTPS)**. A porta 4324 aparece só em "Chrome ainda não conecta?". Já a decisão `0011` e o comentário do topo de `lib/rede.js` dizem que o QR aponta para a **4324**. O tutorial segue o código. Decidir qual é o certo e alinhar o código, a decisão e o comentário.
2. **Como abrir a página do certificado no celular.** O link "Instale o certificado deste Mac" fica na tela do Mac. A tela **Entrar no Backpack** do celular não tem link para `/certificado`. O tutorial manda digitar `…:4323/certificado`. Testar no aparelho e, se for o caso, pôr um link na tela de entrar.
3. **Dica de "Liberar na rede Wi-Fi de casa".** Ela diz "A conexão é criptografada (HTTPS)", o que vale só para a 4323. Revisar o texto da dica.
4. **Tutorial do app desatualizado.** O passo da Biblioteca em `public/tour.js` lista 6 tipos, sem **Skill**. O tutorial externo lista os 7 do código (`T.TIPOS`). Atualizar o tour.
5. **Prioridade na Biblioteca.** O pedido coloca prioridade na Biblioteca, mas os itens não têm esse campo; só as tarefas têm (`T.PRIOS`). O tutorial explica isso. Confirmar se é o desejado.
6. **Voz no celular.** Pelo código, o ditado nos campos não aparece no celular (`T.micBtn` exige `!T.remoto`). O botão de microfone do topo abre "Criar por voz", que só grava em conexão segura (4323); na 4324 resta "Mandar um arquivo de áudio". Testar num iPhone e num Android.
7. **Permissão de notificação.** Lembretes, foco e aviso de versão usam a notificação do macOS por `osascript`. Não dá para confirmar pelo código se o macOS pede permissão nem com que nome. Por isso isso não entrou no tutorial; conferir num Mac limpo.
8. **Conflito Mac × celular.** O código tenta juntar os dados quando duas telas salvam juntas (`core.js`, resposta 409 → `T.juntar`). O aviso "fica a última versão salva" segue o pedido e o README. Conferir se vale para o mesmo campo.
9. **README × atualização com um clique.** O README recomenda instalar com `git clone` e diz que a atualização é "com um clique". Numa pasta com Git, o app só mostra "Atualize no Terminal com git pull", sem botão. O tutorial explica os dois casos. Alinhar o README.
10. **Caminho do Android.** O caminho "Configurações → Segurança → Criptografia e credenciais…" é o que a tela do app mostra. Ele muda entre fabricantes; conferir em pelo menos um aparelho.
11. **Versão 1.0.1.** Ela consta em `versao.json` na pasta de trabalho, mas ainda não tem commit nem publicação. Publicar antes de divulgar o tutorial.
12. **Endereço de exemplo.** `192.168.0.10` é ilustrativo. Trocar pela captura real ou manter como exemplo.

## Conferido no código (pente fino)

| Dado | Onde |
| --- | --- |
| Versão 1.0.1 | `versao.json` |
| Portas 4322 (Mac), 4323 (HTTPS), 4324 (HTTP) | `server.js` (`PORTA`, `PORTA_TLS = PORTA + 1`, `PORTA_LAN = PORTA + 2`) |
| Código de 6 números; 8 erros bloqueiam por 15 min | `lib/rede.js` (`novoCodigo`, `tentar`) |
| Motor de voz "uns 80 MB" | `public/voz.js` |
| Mensagem do microfone bloqueado | `public/voz.js` (`erroMic`) |
| Passos do certificado no iPhone e no Android | `lib/rede.js` (`paginaCertificado`) |
| 23 kits (15 + 8) com PDF | `exemplos/kit-negocio.json`, `exemplos/kit-lancamento.json`, `exemplos/kits/` |
| Backup: senha com 6+ caracteres, 20 cópias diárias | `public/extras.js` |
| Atualização: confere a cada 6 h; "Atualizar agora"; "Falta um passo" | `public/atualiza.js` |
| Instalação em /Applications (ou ~/Applications) e diálogo "Backpack instalado!" | `Instalar Backpack.app/Contents/MacOS/instalar` |
| Desinstalar não apaga `data/` | `Desinstalar.command` |
| Reportar abre issue em `aciolijacques-tech/backpack` | `public/tour.js` (`T.reportar`) |
| Rede Local no iPhone para navegadores que não são o Safari | `docs/decisoes/0011` (limite fora do código) |
