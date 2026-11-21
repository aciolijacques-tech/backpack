' Backpack - abre a janela do app (Edge ou Chrome em modo app, sem barra de endereco).
' Se o servidor estiver desligado, liga antes.
Option Explicit
Dim sh, fso, pasta, url, i, navegador, perfil, c

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://127.0.0.1:4322"

Function Ligado()
  Dim h
  Ligado = False
  On Error Resume Next
  Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  h.setTimeouts 1000, 1000, 1000, 1500
  h.open "GET", url & "/api/ping", False
  h.send
  If Err.Number = 0 Then
    If h.status = 200 Then Ligado = True
  End If
  Err.Clear
  On Error GoTo 0
End Function

If Not Ligado() Then
  sh.Run "wscript.exe """ & pasta & "\servidor.vbs""", 0, False
  For i = 1 To 40
    WScript.Sleep 500
    If Ligado() Then Exit For
  Next
End If
If Not Ligado() Then
  MsgBox "Nao consegui ligar o servidor do Backpack." & vbCrLf & vbCrLf & _
    "Veja o arquivo data\logs\server.log ou abra o Instalar Backpack de novo.", 48, "Backpack"
  WScript.Quit 1
End If

navegador = ""
For Each c In Array( _
    sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe", _
    sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe", _
    sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Microsoft\Edge\Application\msedge.exe", _
    sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe", _
    sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Google\Chrome\Application\chrome.exe", _
    sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe")
  If navegador = "" Then
    If fso.FileExists(c) Then navegador = c
  End If
Next

' perfil separado: a janela do Backpack fica independente do navegador do dia a dia
perfil = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Backpack\janela"
If navegador <> "" Then
  sh.Run """" & navegador & """ --app=" & url & " --user-data-dir=""" & perfil & """" & _
    " --no-first-run --no-default-browser-check --window-size=1280,820", 1, False
Else
  sh.Run url, 1, False
End If
