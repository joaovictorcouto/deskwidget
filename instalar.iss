[Setup]
AppName=DeskWidget
AppVersion=1.0
DefaultDirName={autopf}\DeskWidget
DefaultGroupName=DeskWidget
OutputBaseFilename=Instalador_DeskWidget
Compression=lzma
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "dist\DeskWidget.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\DeskWidget"; Filename: "{app}\DeskWidget.exe"
Name: "{autodesktop}\DeskWidget"; Filename: "{app}\DeskWidget.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Criar um atalho na Área de Trabalho"; GroupDescription: "Atalhos adicionais:"
