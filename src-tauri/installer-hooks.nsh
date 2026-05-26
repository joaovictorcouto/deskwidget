!macro NSIS_HOOK_PREINSTALL
    DetailPrint "Garantindo que o DeskWidget esteja fechado..."
    
    # Executa o encerramento forcado do DeskWidget de forma silenciosa para evitar travar a instalacao
    nsExec::Exec 'taskkill /F /IM "DeskWidget.exe" /T'
    Sleep 1000 # Aguarda 1 segundo para o Windows liberar os arquivos da memoria
!macroend
