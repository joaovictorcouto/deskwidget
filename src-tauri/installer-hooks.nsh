!macro NSIS_HOOK_PREINSTALL
    DetailPrint "Verificando se o DeskWidget esta em execucao..."
    
    # Executa o tasklist de forma oculta para ver se o deskwidget.exe esta rodando
    nsExec::ExecToStack 'cmd /c tasklist /FI "IMAGENAME eq deskwidget.exe" | find /I "deskwidget.exe"'
    Pop $0 ; codigo de retorno (0 se encontrou)
    Pop $1 ; limpa a pilha da saida de texto

    IntCmp $0 0 +1 no_running ; se $0 == 0 (encontrou), vai para a proxima linha (+1), senao vai para no_running

    # O aplicativo esta rodando! Pergunta ao usuario se ele deseja que o instalador feche o app
    MessageBox MB_YESNO|MB_ICONQUESTION "O DeskWidget esta em execucao. Deseja que o instalador feche o aplicativo automaticamente para continuar?" IDYES close_app IDNO cancel_install

close_app:
    DetailPrint "Fechando o DeskWidget..."
    nsExec::Exec 'taskkill /F /IM "deskwidget.exe" /T'
    Sleep 1000 # Da 1 segundo para o processo terminar completamente
    Goto no_running

cancel_install:
    MessageBox MB_OK|MB_ICONEXCLAMATION "A instalacao nao pode continuar com o aplicativo aberto. O instalador sera encerrado."
    Abort

no_running:
    DetailPrint "DeskWidget nao esta em execucao ou foi fechado com sucesso."
!macroend
