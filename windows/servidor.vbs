' Backpack - liga o servidor (servidor.cmd) sem abrir janela preta.
Dim sh, fso, pasta
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "cmd.exe /c """"" & pasta & "\servidor.cmd""""", 0, False
