import os
import PyInstaller.__main__
import customtkinter

# Encontra o diretório do customtkinter
customtkinter_path = os.path.dirname(customtkinter.__file__)

PyInstaller.__main__.run([
    'main.py',
    '--name=DeskWidget',
    '--windowed', # Não abre terminal
    '--noconfirm',
    '--clean',
    '--onefile', # Cria um único arquivo .exe (pode demorar mais para abrir, mas é mais limpo)
    # Copia a pasta do customtkinter para dentro do executável
    f'--add-data={customtkinter_path};customtkinter/'
])

print("Build concluído com sucesso!")
