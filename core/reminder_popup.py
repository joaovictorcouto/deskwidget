"""
Popup de notificação de lembretes.
Design moderno com customtkinter, cantos arredondados simulados.
"""

import tkinter as tk
import customtkinter as ctk
from datetime import datetime

_active_popups = []


class ReminderPopup:
    """Popup de notificação de um lembrete disparado."""

    POPUP_WIDTH = 340
    POPUP_HEIGHT = 140
    AUTO_DISMISS_MS = 30000
    MARGIN_BOTTOM = 60
    MARGIN_RIGHT = 24
    POPUP_SPACING = 12

    def __init__(self, root, reminder: dict, config: dict,
                 on_dismiss=None, on_snooze=None):
        self.root = root
        self.reminder = reminder
        self.config = config
        self.on_dismiss = on_dismiss
        self.on_snooze = on_snooze
        self._dismiss_timer = None

        # Forçando os tempos solicitados pelo usuário
        self.snooze_options = [10, 30, 60]

        # Janela popup
        self.win = tk.Toplevel(root)
        self.win.overrideredirect(True)
        self.win.attributes("-topmost", True)
        self.win.attributes("-alpha", 0.96)
        self.win.configure(bg="#16181d")
        self.win.wm_attributes("-toolwindow", True)

        _active_popups.append(self)
        self._position()
        self._build_ui()

        self._dismiss_timer = self.win.after(
            self.AUTO_DISMISS_MS, self._auto_dismiss
        )

    def _position(self):
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        index = _active_popups.index(self)
        x = screen_w - self.POPUP_WIDTH - self.MARGIN_RIGHT
        y = (screen_h - self.MARGIN_BOTTOM
             - (index + 1) * (self.POPUP_HEIGHT + self.POPUP_SPACING))
        self.win.geometry(
            f"{self.POPUP_WIDTH}x{self.POPUP_HEIGHT}+{x}+{y}"
        )

    def _build_ui(self):
        # Borda decorativa no topo (accent line)
        accent = tk.Frame(self.win, bg="#4a7cff", height=3)
        accent.pack(fill="x")

        main = ctk.CTkFrame(
            self.win,
            fg_color="#1a1d24",
            corner_radius=0
        )
        main.pack(fill="both", expand=True)

        content = ctk.CTkFrame(main, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=16, pady=12)

        # Título
        ctk.CTkLabel(
            content,
            text=f"🔔  {self.reminder.get('title', 'Lembrete')}",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#e0e4ec",
            anchor="w",
            wraplength=300
        ).pack(fill="x", pady=(0, 4))

        # Horário
        try:
            dt = datetime.fromisoformat(self.reminder.get("datetime", ""))
            time_text = dt.strftime(
                "Hoje às %H:%M" if dt.date() == datetime.now().date()
                else "%d/%m às %H:%M"
            )
        except (ValueError, TypeError):
            time_text = ""

        if time_text:
            ctk.CTkLabel(
                content,
                text=time_text,
                font=ctk.CTkFont(family="Segoe UI", size=11),
                text_color="#6b7280",
                anchor="w"
            ).pack(fill="x", pady=(0, 10))

        # Botões
        btn_frame = ctk.CTkFrame(content, fg_color="transparent")
        btn_frame.pack(fill="x", expand=True)

        for minutes in self.snooze_options:
            label = f"+{minutes}m" if minutes < 60 else "+1h"
            ctk.CTkButton(
                btn_frame,
                text=label,
                font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
                fg_color="#4a7cff",
                hover_color="#3d6be6",
                text_color="white",
                corner_radius=6,
                height=28,
                width=50,
                command=lambda m=minutes: self._snooze(m)
            ).pack(side="left", padx=(0, 6))

        ctk.CTkButton(
            btn_frame,
            text="Dispensar",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            fg_color="#282d36",
            hover_color="#2e333d",
            text_color="#c8ccd4",
            corner_radius=6,
            height=28,
            width=70,
            command=self._dismiss
        ).pack(side="right")

    def _dismiss(self):
        if self.on_dismiss:
            self.on_dismiss()
        self._close()

    def _snooze(self, minutes: int):
        if self.on_snooze:
            self.on_snooze(minutes)
        self._close()

    def _auto_dismiss(self):
        self._dismiss()

    def _close(self):
        if self._dismiss_timer:
            try:
                self.win.after_cancel(self._dismiss_timer)
            except Exception:
                pass

        if self in _active_popups:
            _active_popups.remove(self)

        try:
            self.win.destroy()
        except Exception:
            pass

        for popup in _active_popups:
            try:
                popup._position()
            except Exception:
                pass
