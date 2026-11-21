# Tutorial do Backpack 1.0.1

Autor: Jacques Acioli · Código aberto: [github.com/aciolijacques-tech/backpack](https://github.com/aciolijacques-tech/backpack)

---

## 1. O que é o Backpack

O Backpack é um app para Mac onde você guarda PDFs, prompts, instruções, comandos, links e notas.
Ele também organiza suas tarefas, rotina, clientes e finanças.
Tudo fica no seu computador: não precisa de conta nem de internet para usar.

> Cada tela do app tem um botão **? Tutorial** ao lado do nome. Ele mostra, passo a passo, para que serve cada parte da tela.
> Este guia cobre o que o tutorial do app não cobre: instalar, celular, voz, backup, atualizar e problemas.

---

## 2. Instalar

### Antes de começar

Você precisa de:
- um Mac com macOS 12 ou mais novo;
- o **Node.js** instalado (é grátis: em [nodejs.org](https://nodejs.org), clique no botão "LTS").

### Instalar

1. Baixe a pasta do Backpack (pelo Terminal ou pelo ZIP, como explica o README do repositório).
2. Coloque a pasta em **Documentos** e dê a ela o nome `Backpack`.
3. Abra a pasta.
4. Dê dois cliques em **Instalar Backpack**.
5. Espere a mensagem **"Backpack instalado!"**.
6. Pronto. O app fica em **Aplicativos** e no **Launchpad**.

Para deixar no Dock: clique com o botão direito no ícone → **Opções** → **Manter no Dock**.

O Backpack liga sozinho toda vez que você entra no Mac.

### Abrir depois

1. Abra a pasta **Aplicativos**.
2. Dê dois cliques em **Backpack**.

### Permissões que o macOS pode pedir

O Backpack não tem assinatura da Apple. Por isso o Mac pede algumas confirmações:

- **Na primeira vez que abrir o instalador:** se o macOS bloquear, vá em **Ajustes do Sistema → Privacidade e Segurança** e clique em **"Abrir mesmo assim"**.
- **Ferramentas de Linha de Comando:** se o Mac pedir para instalar, aceite. É gratuito, da Apple. Quando terminar, abra o **Instalar Backpack** de novo.
- **Microfone:** na primeira vez que você usar a voz, o Mac pergunta se o Backpack pode usar o microfone. Clique em permitir.
- **Conexões:** ao ligar o celular, o macOS pode perguntar se o "node" pode aceitar conexões. Clique em **Permitir**.

> Se você mover ou renomear a pasta do Backpack, abra o **Instalar Backpack** de novo.

### Desinstalar

1. Abra a pasta do Backpack.
2. Dê dois cliques em **Desinstalar.command**.
3. O app e o início automático são removidos.

Seus dados **não** são apagados. Eles continuam na pasta `data`.

---

## 3. As telas do menu

O menu fica do lado esquerdo. Uma linha por tela:

| Tela | Para que serve |
| --- | --- |
| **Início** | Resumo do dia, captura rápida, tarefas de hoje, rotina, missões e favoritos. |
| **Biblioteca** | Todos os seus itens guardados, com filtros e quatro jeitos de ver. |
| **Tarefas** | Suas tarefas, separadas em atrasadas, hoje, próximas e sem data. |
| **Calendário** | O mês inteiro. Clique num dia para criar tarefa; arraste para remarcar. |
| **Rotina** | Hábitos com sequência de dias e metas com progresso. |
| **Clientes** | Contatos, funil e tudo de cada cliente num lugar só. |
| **Financeiro** | Entradas e saídas do mês, contas que repetem e calculadora de preço. |
| **Mapa de conexões** | Mostra como seus itens se ligam entre si. |
| **Ferramentas** | Sites que você usa, prontos para abrir ou guardar. |
| **Conquistas** | Nível, XP, sequência de dias e conquistas. |
| **Lixeira** | O que você apagou. Dá para restaurar. |
| **Configurações** | Aparência, celular, IA, dados, versão e ajuda. |

Em qualquer tela, clique em **? Tutorial** para ver o passo a passo dela.

---

## 4. Biblioteca

A Biblioteca guarda tudo. Para os detalhes de filtros e visões, use o **? Tutorial** da Biblioteca.

### Os 7 tipos de item

- **Estudo/PDF**
- **Prompt**
- **Instrução**
- **Comando**
- **Link**
- **Nota**
- **Skill**

### Status

Cada item tem um status:
- **Para ver**
- **Em andamento**
- **Concluído**

### Etiquetas

1. Abra um item.
2. No campo **Etiquetas**, escreva palavras separadas por vírgula. Exemplo: `ia, estudo, urgente`.
3. As etiquetas novas ficam salvas e aparecem como sugestão nos próximos itens e clientes.

### Prioridade

A prioridade (**Baixa**, **Média**, **Alta**) fica nas **Tarefas**, não nos itens da Biblioteca.
Na lista de tarefas, clique na prioridade para mudar.

### Os 23 kits prontos

O Backpack já vem com 23 kits: briefings, contratos, proposta, roteiros de venda e de lançamento.
Cada kit tem um PDF anexado.

1. Abra a **Biblioteca**.
2. Filtre pela categoria **Kit do negócio** (15 kits) ou **Kit de lançamento** (8 kits).
3. Abra o kit para ler, copiar o texto ou abrir o PDF.

Quase todos os kits também são **modelos**: aparecem quando você clica no **+** para criar um item novo.

> **Atenção:** os contratos dos kits são modelos de referência. Revise com um advogado antes de usar.

> **Crédito:** os textos-base dos kits foram adaptados do [MyLoot](https://github.com/edirsooo/myloot) (licença MIT, © 2026 Prestes Design).

---

## 5. Clientes e Financeiro

Para o passo a passo de cada tela, use o **? Tutorial** de **Clientes** e de **Financeiro**.

### Clientes

1. Clique em **Novo cliente**.
2. Preencha nome, contatos, Trello e pasta.
3. Escolha como ver: **Cartões** ou **Funil**.

**Funil:** uma coluna para cada status: **Prospect**, **Ativo**, **Pausado** e **Encerrado**.
Arraste o cliente de uma coluna para outra para mudar o status.

### Recebimento pendente

Dentro do cliente aparece o **Financeiro do cliente**, com o que já foi recebido e o que falta receber.

1. Toque num recebimento da lista.
2. Abre a janela **Editar lançamento**.
3. Para marcar como pago: ligue **Já recebi** e clique em **Salvar**.
4. Para apagar: clique em **Apagar**.

Para lançar um valor novo desse cliente, clique em **Lançar recebimento**.

### Financeiro: Casa e Empresa

O Financeiro separa duas frentes: **Casa** e **Empresa**.
No alto da tela, escolha ver **Tudo**, só **Empresa** ou só **Casa**.
Cada frente tem suas próprias categorias.

### Lançar uma conta

1. Clique em **+ Entrada** ou **− Saída**.
2. Escolha a frente: **Empresa** ou **Casa**.
3. Escreva a descrição e o valor.
4. Escolha a data, a categoria e a forma de pagamento.
5. Clique em **Salvar**.

### Contas que repetem e parcelas

Ao criar um lançamento, use o campo **Repetir**:
- **Não repete**
- **Todo mês (12 meses)**: cria a mesma conta nos próximos 12 meses.
- **Parcelado**: coloque o valor total e o **Número de parcelas**. O app divide em parcelas mensais.

### Calculadora de preço

1. Clique em **Calcular preço**.
2. Preencha quanto quer ganhar por mês, seus custos, horas de trabalho, impostos e reserva.
3. O app mostra quanto vale sua hora, o seu dia de trabalho e o preço de um projeto.

### Exportar planilha

1. Escolha o mês.
2. Clique em **Planilha (CSV)**.
3. O arquivo baixa e abre no Excel, Numbers ou Google Planilhas.

---

## 6. Voz

O Backpack transforma sua fala em texto. A transcrição acontece no próprio Mac.

> **Na primeira vez:** o app baixa o motor de voz (cerca de 80 MB) e pede permissão para usar o microfone. Precisa de internet só nessa primeira vez.

### Ditar num campo

1. Procure o botão de microfone ao lado do campo (aparece "Falar em vez de digitar").
2. Clique e fale.
3. Clique no microfone de novo para parar.
4. O texto aparece no campo.

### Criar item falando

1. Clique no botão de microfone no alto da tela (ou aperte a tecla **V**).
2. Abre a janela **Criar por voz**.
3. Clique no microfone e fale.
4. Clique de novo para parar.
5. Confira o texto. Dá para corrigir.
6. Escolha o que fazer:
   - **Salvar como nota**;
   - **Virar tarefa**;
   - **Organizar com IA** (a IA separa o que você falou em vários itens; depois clique em **Criar os marcados**).

Também dá para usar um áudio pronto, como um áudio do WhatsApp: clique em **Mandar um arquivo de áudio**.

---

## 7. Usar no celular

Você pode abrir o Backpack no celular, pela rede Wi-Fi de casa.
O celular e o Mac precisam estar no **mesmo Wi-Fi**.

### Passo 1: ligar no Mac

1. No Mac, abra **Configurações**.
2. Vá até **Usar no celular**.
3. Ligue **Liberar na rede Wi-Fi de casa**.
4. Aparecem um QR Code e um código de 6 números.

### Passo 2: entrar pelo celular

Escolha um dos dois jeitos:

**Pelo QR Code**
1. No celular, abra a câmera.
2. Aponte para o QR Code da tela do Mac.
3. Toque no link que aparecer.

**Pelo código de 6 números**
1. No navegador do celular, digite o endereço que aparece na tela do Mac.
2. Na tela **Entrar no Backpack**, digite o código de 6 números.
3. Toque em **Entrar**.

Você só precisa entrar uma vez. Depois o celular fica conectado.

Para desconectar todos os celulares: no Mac, clique em **Trocar código**.

### As duas portas: 4323 e 4324

| | Porta **4323** (HTTPS) | Porta **4324** (HTTP) |
| --- | --- | --- |
| Endereço | `https://` + endereço do Mac + `:4323` | `http://` + endereço do Mac + `:4324` |
| Criptografia | Sim | Não |
| Certificado | Precisa instalar uma vez | Não precisa: abre direto |
| Microfone no celular | Funciona | Não funciona |
| Onde aparece no Mac | No QR Code e no endereço principal | Em **"Chrome ainda não conecta?"** |

> **Atenção:** a porta 4324 não é criptografada. Use só em Wi-Fi de confiança e desligue **Usar no celular** quando não estiver usando.

### Instalar o certificado (para a porta 4323)

Na primeira vez, o navegador do celular avisa **"conexão não privada"**. Isso acontece porque o certificado é do seu Mac, não de uma empresa.

1. Toque em **"Mostrar detalhes"** e depois em **"visitar o site"**.
2. No navegador do celular, abra o endereço da porta 4323 que aparece no Mac, terminando em `/certificado`.
   Exemplo: `https://192.168.0.10:4323/certificado` (use o endereço do seu Mac). [CONFERIR]
3. Abre a página **Confiar no Backpack deste Mac**.
4. Toque em **Baixar certificado**.
5. Siga os passos do seu celular:

**iPhone**
1. Toque em **"Baixar certificado"** e em **Permitir**.
2. Vá em **Ajustes → Geral → VPN e Gerenciamento de Dispositivos → Backpack → Instalar**.
3. Vá em **Ajustes → Geral → Sobre → Ajustes de Confiança de Certificados** e ligue **"Backpack"**.

**Android**
1. Baixe o certificado.
2. Vá em **Configurações → Segurança → Criptografia e credenciais → Instalar certificado → Certificado de CA**.

Você faz isso uma vez só. Depois o aviso some de qualquer navegador, inclusive do Chrome.

O certificado só vale para o Backpack do seu Mac. Para remover, apague o perfil "Backpack" nos ajustes do celular.

### O que muda no celular

- Configurações, chaves e o botão de desligar continuam só no Mac.
- O ditado nos campos não aparece no celular. Para criar por voz, use o microfone do alto da tela pela porta 4323.
- No iPhone, segure o dedo num cartão para abrir o menu (o mesmo do clique direito).

> **Atenção:** se o celular e o Mac estiverem abertos ao mesmo tempo e você mudar a mesma coisa nos dois, fica a última versão salva.

---

## 8. Dados e segurança

### Onde ficam seus dados

Tudo fica na pasta `data`, dentro da pasta do Backpack:
- `db.json`: itens, tarefas, clientes, financeiro e rotina;
- `anexos`: os arquivos que você anexou;
- `backups`: uma cópia automática por dia (fica com as 20 mais novas).

Nada disso vai para a internet.

### Fazer backup

1. Abra **Configurações** e vá até **Dados**.
2. Escolha:
   - **Backup (.json)**: baixa uma cópia comum;
   - **Backup com senha**: crie uma senha de pelo menos 6 caracteres, repita e clique em **Baixar**.

> Guarde a senha num lugar seguro. Sem ela, o backup não abre: nem para você.

### Restaurar um backup

1. Em **Dados**, clique em **Restaurar backup**.
2. Escolha o arquivo.
3. Se o backup tiver senha, digite a senha.
4. Confirme. O app guarda uma cópia dos dados atuais antes de trocar.

### Exportar para o Obsidian

1. Em **Dados**, clique em **Exportar para o Obsidian (.zip)**.
2. Extraia o arquivo.
3. No Obsidian, use **"Abrir pasta como cofre"**.

Cada item vira um arquivo `.md`. O financeiro vai em planilha (CSV).

### Lixeira

O que você apaga vai para a **Lixeira**.
- **Restaurar**: volta o item para onde estava.
- **Apagar de vez**: remove para sempre.
- **Esvaziar**: apaga tudo da Lixeira. Não dá para desfazer.

---

## 9. Atualizações

### Como chega o aviso

O Backpack confere se há versão nova ao abrir e a cada 6 horas.
Quando sai uma versão nova:
- aparece no alto da tela **"Backpack [versão] disponível"**;
- abre uma janela com o que mudou;
- com o app fechado, o Mac mostra uma notificação.

### Como atualizar

1. Na janela de aviso, clique em **Atualizar agora**.
2. Espere a mensagem **"Pronto! Reabrindo o app…"**.
3. O app reabre sozinho.

Se aparecer a janela **"Falta um passo"**, clique em **Atualizar o app agora**. Leva cerca de 1 minuto.

Para procurar uma versão nova a qualquer hora: **Configurações → Versão → Procurar atualização**.

> Seus itens, anexos, tarefas e chaves ficam como estão. A atualização troca só os arquivos do app.

**Se você instalou pelo Terminal** (com `git clone`), o botão **Atualizar agora** não aparece. A janela pede para atualizar no Terminal com `git pull` e reiniciar o Backpack.

---

## 10. Problemas comuns

### O microfone não funciona

Aparece: *"O microfone está bloqueado."*
1. Abra **Ajustes do Sistema → Privacidade e Segurança → Microfone**.
2. Ligue o **Backpack**.
3. Tente de novo.

No celular, o microfone só funciona pela porta **4323**, com o certificado instalado.

### O celular não conecta

1. Confira se o celular e o Mac estão no **mesmo Wi-Fi**.
2. Confira se **Liberar na rede Wi-Fi de casa** está ligado no Mac.
3. Se o Mac mostrar *"Não achei o Mac numa rede Wi-Fi"*, conecte o Mac no Wi-Fi e abra a tela de novo.
4. Se o macOS perguntou sobre o "node" aceitar conexões, clique em **Permitir**.
5. No iPhone, com Chrome ou outro navegador que não seja o Safari: vá em **Ajustes → Privacidade e Segurança → Rede Local** e ligue esse navegador.
6. Errou o código 8 vezes? O celular fica bloqueado por 15 minutos. Espere e tente de novo.

Fora de casa, o celular não conecta.

### Aviso "conexão não privada"

É normal na porta 4323 antes de instalar o certificado.
Siga o passo **Instalar o certificado** da seção 7.
Se o Chrome ainda não conectar, abra **"Chrome ainda não conecta?"** na tela do Mac e use o endereço da porta 4324 (só em Wi-Fi de confiança).

### O app não abre

1. Abra a pasta do Backpack e dê dois cliques em **Instalar Backpack** de novo.
2. Se aparecer *"Já tem um Backpack aberto"*, feche a janela do Terminal do **Abrir.command** e tente de novo.
3. Se o macOS bloquear, vá em **Ajustes do Sistema → Privacidade e Segurança → "Abrir mesmo assim"**.
4. Enquanto isso, dá para usar no navegador: `http://127.0.0.1:4322`.

Os detalhes da instalação ficam em `data/logs/instalacao.log`.

### Reportar um problema

1. Abra **Configurações → Ajuda**.
2. Clique em **Reportar problema ou sugestão**.
   (Ou aperte **⌘K** e escolha **Reportar problema ou sugestão**.)
3. Escolha **Problema** ou **Sugestão**.
4. Conte o que aconteceu: onde clicou, o que esperava e o que aconteceu.
5. Clique em **Abrir no GitHub**. Abre um relato pronto no GitHub do Backpack.

Nada é enviado sozinho: você vê tudo antes. Seus itens não vão junto.

---

## Avisos importantes

- A porta **4324** não é criptografada: use só em Wi-Fi de confiança e desligue o acesso pelo celular quando não estiver usando.
- **Voz:** na primeira vez, o app baixa o motor de voz (cerca de 80 MB) e pede permissão para usar o microfone.
- **Celular e Mac abertos ao mesmo tempo:** se a mesma coisa for mudada nos dois, fica a última versão salva.
- Os **contratos dos kits** são modelos de referência: revise com um advogado antes de usar.
- Os **kits** foram adaptados do MyLoot (licença MIT, © 2026 Prestes Design).
