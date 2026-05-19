"""
Módulo de Lembretes para o DeskWidget.
Painel com formulário para agendar lembretes.
Design moderno com customtkinter.
"""

import tkinter as tk
import customtkinter as ctk
from datetime import datetime, date
from modules.base_module import BaseModule
from core import reminder_manager

try:
    from tkcalendar import DateEntry
    HAS_TKCALENDAR = True
except ImportError:
    HAS_TKCALENDAR = False


class ReminderModule(BaseModule):
    """Módulo de lembretes com formulário para agendar."""

    MODULE_ID = "reminder"
    MODULE_NAME = "🔔 Lembretes"

    def __init__(self, parent_frame, config, app=None):
        super().__init__(parent_frame, config, app)
        self.error_label = None
        self.schedule_btn = None
        self.name_entry = None
        self.date_entry = None
        self.hour_spin = None
        self.min_spin = None
        self.hour_var = None
        self.min_var = None

    def render(self):
        """Renderiza o painel de lembretes."""
        self.frame = ctk.CTkFrame(
            self.parent,
            fg_color=self.COLORS["bg"],
            corner_radius=0
        )
        self.frame.pack(fill="x", padx=0, pady=0)

        self._create_header(self.MODULE_NAME)

        # Campo de nome do lembrete
        self.name_entry = ctk.CTkEntry(
            self.frame,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color=self.COLORS["input"],
            text_color=self.COLORS["text"],
            border_color=self.COLORS["border"],
            border_width=1,
            corner_radius=8,
            height=32,
            placeholder_text="Nome do lembrete...",
            placeholder_text_color=self.COLORS["text_muted"]
        )
        self.name_entry.pack(fill="x", padx=12, pady=(4, 6))
        self.name_entry.bind("<KeyRelease>", self._validate)
        self.name_entry.bind("<Return>", self._on_enter_pressed)

        # Linha de data e hora
        datetime_frame = ctk.CTkFrame(
            self.frame,
            fg_color="transparent",
            corner_radius=0
        )
        datetime_frame.pack(fill="x", padx=12, pady=(0, 4))

        # Ícone data
        date_icon = ctk.CTkLabel(
            datetime_frame,
            text="📅",
            font=ctk.CTkFont(size=13),
            text_color=self.COLORS["text_dim"],
            width=20
        )
        date_icon.pack(side="left", padx=(0, 4))

        # DateEntry (tkcalendar é tk puro, mas funciona dentro do CTk frame)
        if HAS_TKCALENDAR:
            is_dark = ctk.get_appearance_mode() == "Dark"
            self.date_entry = DateEntry(
                datetime_frame,
                width=10,
                background="#282d36" if is_dark else "#ffffff",
                foreground="#c8ccd4" if is_dark else "#111827",
                borderwidth=0,
                date_pattern="dd/MM/yyyy",
                mindate=date.today(),
                font=("Segoe UI", 10),
                state="readonly"
            )
            self.date_entry.pack(side="left", padx=(0, 10))
            self.date_entry.bind("<<DateEntrySelected>>", self._validate)
            self.date_entry.bind("<Return>", self._on_enter_pressed)
        else:
            self.date_entry = ctk.CTkEntry(
                datetime_frame,
                font=ctk.CTkFont(family="Segoe UI", size=12),
                fg_color=self.COLORS["input"],
                text_color=self.COLORS["text"],
                border_color=self.COLORS["border"],
                border_width=1,
                corner_radius=6,
                width=90,
                height=28
            )
            self.date_entry.pack(side="left", padx=(0, 10))
            self.date_entry.insert(0, date.today().strftime("%d/%m/%Y"))
            self.date_entry.bind("<KeyRelease>", self._validate)
            self.date_entry.bind("<Return>", self._on_enter_pressed)

        # Ícone hora
        time_icon = ctk.CTkLabel(
            datetime_frame,
            text="🕐",
            font=ctk.CTkFont(size=13),
            text_color=self.COLORS["text_dim"],
            width=20
        )
        time_icon.pack(side="left", padx=(0, 4))

        # Spinboxes de hora (usa tk.Spinbox estilizado pois CTk não tem Spinbox)
        self.hour_var = tk.StringVar(value=f"{datetime.now().hour:02d}")
        
        is_dark = ctk.get_appearance_mode() == "Dark"
        spin_bg = "#282d36" if is_dark else "#ffffff"
        spin_fg = "#c8ccd4" if is_dark else "#111827"
        spin_btn = "#2e333d" if is_dark else "#e5e7eb"

        self.hour_spin = tk.Spinbox(
            datetime_frame,
            from_=0, to=23,
            width=3,
            textvariable=self.hour_var,
            format="%02.0f",
            font=("Segoe UI", 10),
            bg=spin_bg,
            fg=spin_fg,
            buttonbackground=spin_btn,
            relief="flat",
            highlightthickness=1,
            highlightbackground=spin_btn,
            insertbackground=spin_fg,
            wrap=True,
            bd=0
        )
        self.hour_spin.pack(side="left", padx=(0, 2), ipady=2)
        self.hour_spin.bind("<KeyRelease>", self._validate)
        self.hour_spin.bind("<Return>", self._on_enter_pressed)

        colon = ctk.CTkLabel(
            datetime_frame,
            text=":",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color=self.COLORS["text_dim"],
            width=10
        )
        colon.pack(side="left")

        self.min_var = tk.StringVar(value=f"{datetime.now().minute:02d}")
        self.min_spin = tk.Spinbox(
            datetime_frame,
            from_=0, to=59,
            width=3,
            textvariable=self.min_var,
            format="%02.0f",
            font=("Segoe UI", 10),
            bg=spin_bg,
            fg=spin_fg,
            buttonbackground=spin_btn,
            relief="flat",
            highlightthickness=1,
            highlightbackground=spin_btn,
            insertbackground=spin_fg,
            wrap=True,
            bd=0
        )
        self.min_spin.pack(side="left", padx=(2, 0), ipady=2)
        self.min_spin.bind("<KeyRelease>", self._validate)
        self.min_spin.bind("<Return>", self._on_enter_pressed)

        # Label de erro/sucesso
        self.error_label = ctk.CTkLabel(
            self.frame,
            text="",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color=self.COLORS["error"],
            anchor="w",
            height=16
        )
        self.error_label.pack(fill="x", padx=12, pady=(0, 2))

        # Botões
        btn_frame = ctk.CTkFrame(
            self.frame,
            fg_color="transparent",
            corner_radius=0
        )
        btn_frame.pack(fill="x", padx=12, pady=(0, 8))

        self.schedule_btn = ctk.CTkButton(
            btn_frame,
            text="+ Agendar",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            fg_color=self.COLORS["accent"],
            hover_color=self.COLORS["accent_hover"],
            text_color="white",
            corner_radius=8,
            height=30,
            command=self._schedule_reminder,
            state="disabled"
        )
        self.schedule_btn.pack(side="left", padx=(0, 6))

        view_btn = ctk.CTkButton(
            btn_frame,
            text="📋 Ver todos",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color=self.COLORS["card"],
            hover_color=self.COLORS["border"],
            text_color=self.COLORS["text"],
            corner_radius=8,
            height=30,
            command=self._open_history
        )
        view_btn.pack(side="left")

        self._validate()

    def focus_input(self):
        try:
            if self.name_entry:
                self.name_entry.focus_set()
                return True
        except Exception:
            pass
        return False

    def _get_selected_datetime(self):
        """Retorna o datetime selecionado ou None se inválido."""
        try:
            if HAS_TKCALENDAR:
                selected_date = self.date_entry.get_date()
            else:
                text = self.date_entry.get()
                parts = text.split("/")
                selected_date = date(int(parts[2]), int(parts[1]), int(parts[0]))

            hour = int(self.hour_var.get())
            minute = int(self.min_var.get())

            if not (0 <= hour <= 23 and 0 <= minute <= 59):
                return None

            return datetime(
                selected_date.year, selected_date.month, selected_date.day,
                hour, minute
            )
        except (ValueError, IndexError):
            return None

    def _validate(self, event=None):
        """Valida os campos e habilita/desabilita o botão."""
        name = self.name_entry.get().strip()
        has_name = bool(name)

        selected_dt = self._get_selected_datetime()
        is_past = False

        if selected_dt:
            if selected_dt <= datetime.now():
                is_past = True

        if is_past:
            self.error_label.configure(
                text="⚠️ Selecione um horário futuro",
                text_color=self.COLORS["error"]
            )
            self.hour_spin.config(highlightbackground="#ef4444")
            self.min_spin.config(highlightbackground="#ef4444")
        else:
            self.error_label.configure(text="")
            is_dark = ctk.get_appearance_mode() == "Dark"
            spin_btn = "#2e333d" if is_dark else "#e5e7eb"
            self.hour_spin.config(highlightbackground=spin_btn)
            self.min_spin.config(highlightbackground=spin_btn)

        can_schedule = has_name and selected_dt and not is_past
        self.schedule_btn.configure(
            state="normal" if can_schedule else "disabled"
        )

    def _on_enter_pressed(self, event):
        """Handler para a tecla Enter."""
        self._validate()
        if self.schedule_btn.cget("state") == "normal":
            self._schedule_reminder()

    def _schedule_reminder(self):
        """Agenda um novo lembrete."""
        name = self.name_entry.get().strip()
        dt = self._get_selected_datetime()
        if not name or not dt:
            return

        reminder_manager.add_reminder(name, dt)

        self.name_entry.delete(0, tk.END)

        self.error_label.configure(
            text="✅ Lembrete agendado!",
            text_color=self.COLORS["success"]
        )
        self.frame.after(
            2000,
            lambda: self.error_label.configure(
                text="", text_color=self.COLORS["error"]
            )
        )
        self._validate()

    def _open_history(self):
        """Abre a janela de histórico de lembretes."""
        if getattr(self, '_opening_history', False):
            return

        if hasattr(self, '_history_win') and self._history_win and self._history_win.win.winfo_exists():
            self._history_win.win.lift()
            self._history_win.win.focus_force()
            return

        self._opening_history = True
        self.frame.after(0, self._do_open_history)

    def _do_open_history(self):
        try:
            from ui.reminder_history_window import ReminderHistoryWindow
            parent = self.app.root if self.app else self.frame.winfo_toplevel()
            self._history_win = ReminderHistoryWindow(parent)
        finally:
            self._opening_history = False
