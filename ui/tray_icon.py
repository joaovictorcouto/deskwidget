"""
Ícone e menu do system tray (bandeja do sistema).
Usa pystray para criar o ícone na área de notificação do Windows.
"""

import os
import threading

try:
    import pystray
    from pystray import MenuItem as item
    from PIL import Image, ImageDraw
    HAS_PYSTRAY = True
except ImportError:
    HAS_PYSTRAY = False


class TrayIcon:
    """Gerencia o ícone do system tray e seu menu."""

    def __init__(self, config: dict, app):
        """
        Args:
            config: Configuração do app.
            app: Referência ao DeskWidgetApp.
        """
        self.config = config
        self.app = app
        self.icon = None

    def _create_icon_image(self):
        """Cria o ícone programaticamente (sem depender de arquivo .ico)."""
        size = 64
        image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)

        # Fundo circular azul
        draw.ellipse([4, 4, size - 4, size - 4], fill="#5c8aff")

        # Letra "D" branca centralizada
        try:
            from PIL import ImageFont
            font = ImageFont.truetype("segoeui.ttf", 32)
        except Exception:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), "D", font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (size - tw) // 2
        y = (size - th) // 2 - 2
        draw.text((x, y), "D", fill="white", font=font)

        return image

    def _create_menu(self):
        """Cria o menu do tray icon."""
        return pystray.Menu(
            item("⚙️  Configurar Atalho", self._open_settings),
            item("📋  Ver lembretes", self._open_reminders),
            item("🔄  Reiniciar widget", self._restart_widget),
            pystray.Menu.SEPARATOR,
            item("❌  Sair", self._quit)
        )

    def run(self):
        """Inicia o tray icon (bloqueia a thread)."""
        if not HAS_PYSTRAY:
            print("pystray não instalado. Tray icon desabilitado.")
            return

        image = self._create_icon_image()
        menu = self._create_menu()

        self.icon = pystray.Icon(
            name="DeskWidget",
            icon=image,
            title="DeskWidget",
            menu=menu
        )

        self.icon.run()

    def stop(self):
        """Para o tray icon."""
        if self.icon:
            try:
                self.icon.stop()
            except Exception:
                pass

    def _open_settings(self, icon=None, item=None):
        """Abre a janela de configurações na thread do tkinter."""
        self.app.root.after(0, self._do_open_settings)

    def _do_open_settings(self):
        from ui.settings_window import SettingsWindow
        SettingsWindow(self.app.get_config(), self.app)

    def _open_reminders(self, icon=None, item=None):
        """Abre a janela de histórico de lembretes."""
        self.app.root.after(0, self._do_open_reminders)

    def _do_open_reminders(self):
        from ui.reminder_history_window import ReminderHistoryWindow
        ReminderHistoryWindow(self.app.root)

    def _restart_widget(self, icon=None, item=None):
        """Reinicia o widget flutuante."""
        self.app.root.after(0, self.app.restart_widget)

    def _quit(self, icon=None, item=None):
        """Encerra o aplicativo."""
        self.app.root.after(0, self.app.quit_app)
