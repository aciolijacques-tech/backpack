# Instalar Backpack no Windows: liga o servidor sozinho quando você entra no Windows e cria o atalho
# "Backpack" no Menu Iniciar e na Área de Trabalho. Não mexe nos seus dados (pasta data\).
# Atenção: a marca do app no fim usa os mesmos arquivos e a mesma ordem de lib/atualizar.js (ARQS_APP).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
function Aviso($texto, $icone = 'Information') { [System.Windows.Forms.MessageBox]::Show($texto, 'Backpack', 'OK', $icone) | Out-Null }

$app = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $app 'server.js'))) {
  Aviso 'Deixe a pasta "windows" dentro da pasta do Backpack (junto do server.js) e abra o instalador de novo.' 'Warning'; exit 1
}
$logs = Join-Path $app 'data\logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
Start-Transcript -LiteralPath (Join-Path $logs 'instalacao.log') -Force | Out-Null
try {
  Write-Output "== Instalar Backpack · $(Get-Date) · Windows $([Environment]::OSVersion.Version) · $env:PROCESSOR_ARCHITECTURE"
  Write-Output "pasta: $app"

  # arquivos baixados pelo navegador vêm marcados como "da internet"; desmarca para o Windows não bloquear os scripts
  Get-ChildItem -LiteralPath $app -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike '*\data\*' -and $_.FullName -notlike '*\.git\*' } | Unblock-File -ErrorAction SilentlyContinue

  # ---------- Node.js ----------
  $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
  if (-not $node) {
    foreach ($c in @("$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe", "$env:LOCALAPPDATA\Programs\nodejs\node.exe")) {
      if (Test-Path -LiteralPath $c) { $node = $c; break }
    }
  }
  Write-Output "node: $node"
  if (-not $node) {
    Aviso "O Backpack precisa do Node.js.`n`nInstale em nodejs.org (botão LTS) e abra o instalador de novo." 'Error'
    Start-Process 'https://nodejs.org'; exit 1
  }
  Write-Output "versão do node: $(& $node --version)"
  # o servidor.cmd usa este caminho se o "node" ainda não estiver no PATH (Node instalado agora, sem reiniciar)
  [IO.File]::WriteAllText((Join-Path $app 'data\node.txt'), $node)

  # ---------- para o Backpack que estiver rodando desta pasta ----------
  $alvo = (Join-Path $PSScriptRoot 'servidor.cmd').ToLower()
  Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains($alvo) } | ForEach-Object {
    $loop = $_.ProcessId
    Write-Output "parando servidor antigo (cmd $loop)"
    Stop-Process -Id $loop -Force -ErrorAction SilentlyContinue
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$loop" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  }
  Start-Sleep -Seconds 2
  $ocupada = Get-NetTCPConnection -LocalPort 4322 -State Listen -ErrorAction SilentlyContinue
  if ($ocupada) {
    Write-Output "porta 4322 ocupada pelo processo $($ocupada[0].OwningProcess)"
    Aviso "Já tem outro Backpack aberto (porta 4322 ocupada).`n`nFeche a janela dele (ou reinicie o Windows) e abra este instalador de novo." 'Warning'
    exit 1
  }
  $log = Join-Path $logs 'server.log'
  if (Test-Path -LiteralPath $log) { Move-Item -LiteralPath $log -Destination "$log.1" -Force }

  # ---------- 1. servidor ligado sozinho ao entrar no Windows ----------
  $sh = New-Object -ComObject WScript.Shell
  $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
  $ico = Join-Path $PSScriptRoot 'backpack.ico'
  function Atalho($arquivo, $script, $descricao) {
    $l = $sh.CreateShortcut($arquivo)
    $l.TargetPath = $wscript
    $l.Arguments = '"' + (Join-Path $PSScriptRoot $script) + '"'
    $l.WorkingDirectory = $app
    $l.IconLocation = "$ico,0"
    $l.Description = $descricao
    $l.Save()
    Write-Output "atalho: $arquivo"
  }
  Atalho (Join-Path ([Environment]::GetFolderPath('Startup')) 'Backpack (servidor).lnk') 'servidor.vbs' 'Liga o servidor do Backpack'
  Start-Process $wscript -ArgumentList ('"' + (Join-Path $PSScriptRoot 'servidor.vbs') + '"')

  # ---------- 2. atalho "Backpack" no Menu Iniciar e na Área de Trabalho ----------
  foreach ($d in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'))) {
    Atalho (Join-Path $d 'Backpack.lnk') 'abrir.vbs' 'Backpack: inventário pessoal'
  }

  # ---------- 3. aparecer em "Aplicativos instalados" (Configurações > Apps) e poder desinstalar por lá ----------
  $chaveDesinstalar = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Backpack'
  New-Item -Path $chaveDesinstalar -Force | Out-Null
  $versaoApp = '1.0.0'
  try { $versaoApp = (Get-Content -LiteralPath (Join-Path $app 'versao.json') -Raw | ConvertFrom-Json).versao } catch { }
  $tamanhoKB = 0
  try {
    $soma = (Get-ChildItem -LiteralPath $app -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notlike '*\data\*' } | Measure-Object -Property Length -Sum).Sum
    $tamanhoKB = [math]::Round($soma / 1KB)
  } catch { }
  New-ItemProperty -Path $chaveDesinstalar -Name 'DisplayName' -PropertyType String -Value 'Backpack' -Force | Out-Null
  New-ItemProperty -Path $chaveDesinstalar -Name 'DisplayVersion' -PropertyType String -Value $versaoApp -Force | Out-Null
  New-ItemProperty -Path $chaveDesinstalar -Name 'Publisher' -PropertyType String -Value 'Backpack' -Force | Out-Null
  New-ItemProperty -Path $chaveDesinstalar -Name 'DisplayIcon' -PropertyType String -Value "$ico,0" -Force | Out-Null
  New-ItemProperty -Path $chaveDesinstalar -Name 'InstallLocation' -PropertyType String -Value $app -Force | Out-Null
  New-ItemProperty -Path $chaveDesinstalar -Name 'UninstallString' -PropertyType String -Value ('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $PSScriptRoot 'desinstalar.ps1') + '"') -Force | Out-Null
  New-ItemProperty -Path $chaveDesinstalar -Name 'NoModify' -PropertyType DWord -Value 1 -Force | Out-Null
  New-ItemProperty -Path $chaveDesinstalar -Name 'NoRepair' -PropertyType DWord -Value 1 -Force | Out-Null
  New-ItemProperty -Path $chaveDesinstalar -Name 'EstimatedSize' -PropertyType DWord -Value $tamanhoKB -Force | Out-Null
  Write-Output "registrado em Aplicativos instalados (v$versaoApp, $tamanhoKB KB)"

  # marca da versão do app instalada: se uma atualização mudar estes arquivos, o Backpack pede para reinstalar
  $bytes = New-Object System.Collections.Generic.List[byte]
  foreach ($a in @('instalar.ps1', 'servidor.cmd', 'servidor.vbs', 'abrir.vbs')) { $bytes.AddRange([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $a))) }
  $sha = [Security.Cryptography.SHA256]::Create()
  $marca = ([BitConverter]::ToString($sha.ComputeHash($bytes.ToArray())) -replace '-', '').ToLower()
  [IO.File]::WriteAllText((Join-Path $app 'data\app-instalado.txt'), $marca)
  Write-Output "marca do app: $marca"

  # espera o servidor responder
  $ok = $false
  for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
    Start-Sleep -Milliseconds 700
    try { $ok = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:4322/api/ping').StatusCode -eq 200 } catch { }
  }
  Write-Output "servidor respondeu: $ok"
  if (-not $ok) {
    Aviso "Os atalhos foram criados, mas o servidor não respondeu.`n`nOs detalhes estão em data\logs\server.log e data\logs\instalacao.log." 'Warning'
    exit 1
  }
  Start-Process $wscript -ArgumentList ('"' + (Join-Path $PSScriptRoot 'abrir.vbs') + '"')
  Aviso "Backpack instalado!`n`nO atalho está no Menu Iniciar e na Área de Trabalho. Para fixar na barra de tarefas: botão direito no Backpack do Menu Iniciar → Fixar na barra de tarefas.`n`nSe mover ou renomear a pasta do Backpack, abra este instalador de novo."
  Write-Output '== fim: tudo certo'
} catch {
  Write-Output "ERRO: $($_.Exception.Message)"
  Aviso "Algo deu errado na instalação.`n`nOs detalhes estão em data\logs\instalacao.log." 'Error'
  exit 1
} finally {
  Stop-Transcript | Out-Null
}
