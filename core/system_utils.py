"""
Utilitários de sistema, como configuração para iniciar com o Windows.
"""
import winreg
import sys
import os

def set_autostart(enable: bool):
    """Ativa ou desativa a inicialização do app junto com o Windows."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0, winreg.KEY_SET_VALUE
        )
        if enable:
            # Pega o caminho do executável ou script
            exe_path = sys.executable if getattr(sys, 'frozen', False) else os.path.abspath(sys.argv[0])
            # Se for rodado via python main.py, sys.executable é o python.exe.
            # No executável final, sys.executable é o próprio DeskWidget.exe
            if not getattr(sys, 'frozen', False):
                value = f'"{sys.executable}" "{exe_path}"'
            else:
                value = f'"{exe_path}"'
                
            winreg.SetValueEx(key, "DeskWidget", 0, winreg.REG_SZ, value)
        else:
            try:
                winreg.DeleteValue(key, "DeskWidget")
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception as e:
        print(f"Erro ao configurar autostart: {e}")
