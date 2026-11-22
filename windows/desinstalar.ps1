# Desinstalar Backpack no Windows: tira os atalhos e o servidor automático. Não apaga seus dados (pasta data\).
Add-Type -AssemblyName System.Windows.Forms

# precisa de administrador para tirar a regra do Firewall criada na instalação
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  try {
    $argumentos = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argumentos
  } catch {
    [System.Windows.Forms.MessageBox]::Show("Para desinstalar o Backpack, clique em Sim na janela do Windows que pede permissão de administrador.", 'Backpack', 'OK', 'Warning') | Out-Null
  }
  exit
}

$alvo = (Join-Path $PSScriptRoot 'servidor.cmd').ToLower()
Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains($alvo) } | ForEach-Object {
  $loop = $_.ProcessId
  Stop-Process -Id $loop -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "ParentProcessId=$loop" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
foreach ($a in @(
  (Join-Path ([Environment]::GetFolderPath('Startup')) 'Backpack (servidor).lnk'),
  (Join-Path ([Environment]::GetFolderPath('Programs')) 'Backpack.lnk'),
  (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Backpack.lnk'))) {
  if (Test-Path -LiteralPath $a) { Remove-Item -LiteralPath $a -Force; Write-Output "Removido: $a" }
}
# perfil da janela (só configurações da janela, não são os seus dados)
$perfil = Join-Path $env:LOCALAPPDATA 'Backpack'
if (Test-Path -LiteralPath $perfil) { Remove-Item -LiteralPath $perfil -Recurse -Force -ErrorAction SilentlyContinue }
# tira da lista de "Aplicativos instalados" (Configurações > Apps)
Remove-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Backpack' -Recurse -Force -ErrorAction SilentlyContinue
# tira a regra do Firewall das portas do celular
Get-NetFirewallRule -DisplayName 'Backpack (celular)' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
[System.Windows.Forms.MessageBox]::Show("Backpack desinstalado.`n`nSeus dados na pasta data\ continuam intactos.", 'Backpack', 'OK', 'Information') | Out-Null
