"""
DeskWidget — Atalho flutuante modular para Windows.
Ponto de entrada principal do aplicativo.
"""

import sys
import os
import tkinter as tk
import threading
import json
import socket
import keyboard

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from widget.floating_widget import FloatingWidget
from ui.tray_icon import TrayIcon
from core.reminder_scheduler import ReminderScheduler


def _get_app_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def _get_user_data_dir():
    localappdata = os.getenv("LOCALAPPDATA") or os.path.expanduser("~\\AppData\\Local")
    path = os.path.join(localappdata, "DeskWidget")
    os.makedirs(path, exist_ok=True)
    return path


APP_DIR = _get_app_dir()
USER_DATA_DIR = _get_user_data_dir()
CONFIG_PATH = os.path.join(USER_DATA_DIR, "config.json")

DEFAULT_CONFIG = {
    "widget": {
        "side": "right",
        "opacity": 0.90,
        "collapse_delay_ms": 1000,
        "theme": "dark",
        "collapsed_width": 8,
        "expanded_width": 300
    },
    "modules": {
        "enabled": ["reminder", "todo"],
        "order": ["reminder", "todo"]
    },
    "reminders": {
        "popup_corner": "bottom-right",
        "snooze_options_minutes": [5, 15, 30]
    },
    "system": {
        "start_with_windows": False,
        "language": "pt-BR"
    }
}


def load_config():
    """Carrega a configuração do arquivo JSON ou cria uma padrão."""
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                config = json.load(f)
            # Garante que todas as chaves existam (merge com default)
            merged = _deep_merge(DEFAULT_CONFIG, config)
            return merged
        except (json.JSONDecodeError, IOError):
            pass
    # Se não existe ou falhou, cria config padrão
    save_config(DEFAULT_CONFIG)
    return DEFAULT_CONFIG.copy()


def save_config(config):
    """Salva a configuração no arquivo JSON."""
    os.makedirs(USER_DATA_DIR, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def _deep_merge(default, override):
    """Merge recursivo: override sobrescreve default onde existir."""
    result = default.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


class DeskWidgetApp:
    """Classe principal do aplicativo DeskWidget."""

    def __init__(self):
        self.config = load_config()
        self.root = tk.Tk()
        self.root.withdraw()  # Oculta a janela principal do tkinter

        # Aplica atalhos de teclado (Ctrl+Backspace, Ctrl+A) em todos os campos de texto
        from core.shortcuts import setup_global_shortcuts
        setup_global_shortcuts(self.root)

        # Widget flutuante
        self.widget = FloatingWidget(self.root, self.config, self)

        # Scheduler de lembretes
        self.scheduler = ReminderScheduler(self.root, self.config)
        self.scheduler.start()

        # Tray icon (roda em thread separada)
        self.tray = TrayIcon(self.config, self)
        self.tray_thread = threading.Thread(target=self.tray.run, daemon=True)
        self.tray_thread.start()

        # Configurações do sistema
        self._apply_system_settings()
        self._setup_global_hotkey()

    def _apply_system_settings(self):
        from core.system_utils import set_autostart
        start_with_windows = self.config.get("system", {}).get("start_with_windows", False)
        set_autostart(start_with_windows)

    def _setup_global_hotkey(self):
        try:
            keyboard.add_hotkey('ctrl+space', self._on_global_hotkey)
        except Exception as e:
            print(f"Erro ao registrar hotkey global: {e}")

    def _on_global_hotkey(self):
        # Must run in main thread
        self.root.after(0, self._toggle_widget)

    def _toggle_widget(self):
        if self.widget.is_expanded:
            self.widget.collapse()
        else:
            self.widget.expand()

    def run(self):
        """Inicia o loop principal do tkinter."""
        self.root.mainloop()

    def quit_app(self):
        """Encerra o aplicativo completamente."""
        self.scheduler.stop()
        try:
            self.tray.stop()
        except Exception:
            pass
        self.root.quit()
        self.root.destroy()

    def reload_config(self):
        """Recarrega configuração e atualiza o widget."""
        self.config = load_config()
        self.widget.apply_config(self.config)
        self.scheduler.update_config(self.config)

    def restart_widget(self):
        """Reinicia o widget flutuante."""
        self.widget.destroy_widget()
        self.widget = FloatingWidget(self.root, self.config, self)

    def get_config(self):
        """Retorna a configuração atual."""
        return self.config

    def update_config(self, new_config):
        """Atualiza e salva a configuração."""
        self.config = new_config
        save_config(new_config)
        self.reload_config()


_SINGLE_INSTANCE_SOCKET = None

def main():
    global _SINGLE_INSTANCE_SOCKET
    try:
        # Tenta conectar numa porta local fixa para garantir instância única
        _SINGLE_INSTANCE_SOCKET = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _SINGLE_INSTANCE_SOCKET.bind(("127.0.0.1", 45678))
    except socket.error:
        print("DeskWidget já está em execução. Encerrando...")
        sys.exit(0)

    app = DeskWidgetApp()
    app.run()


if __name__ == "__main__":
    main()
