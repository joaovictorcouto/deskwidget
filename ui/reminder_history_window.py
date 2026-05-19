"""
Janela de histórico e agenda de lembretes.
Design moderno com customtkinter.
"""

import customtkinter as ctk
from datetime import datetime
from core import reminder_manager


class ReminderHistoryWindow:
    """Janela com abas de lembretes agendados e histórico."""

    def __init__(self, parent):
        self.win = ctk.CTkToplevel(parent)
        self.win.title("Lembretes")
        self.win.geometry("460x420")
        self.win.resizable(True, True)
        self.win.minsize(400, 320)
        self.win.attributes("-topmost", True)

        # Centraliza sem update_idletasks (mais rápido)
        sw = self.win.winfo_screenwidth()
        sh = self.win.winfo_screenheight()
        x = (sw - 460) // 2
        y = (sh - 420) // 2
        self.win.geometry(f"460x420+{x}+{y}")

        self.current_tab = "pending"

        self._build_ui()

    def _build_ui(self):
        main = ctk.CTkFrame(self.win, fg_color="#16181d", corner_radius=0)
        main.pack(fill="both", expand=True)

        # Header
        ctk.CTkLabel(
            main,
            text="📋  Lembretes",
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color="#e0e4ec"
        ).pack(fill="x", padx=20, pady=(16, 10))

        # Tab buttons
        tab_frame = ctk.CTkFrame(main, fg_color="transparent")
        tab_frame.pack(fill="x", padx=16, pady=(0, 8))

        self.tab_var = ctk.StringVar(value="pending")
        self.tab_seg = ctk.CTkSegmentedButton(
            tab_frame,
            values=["pending", "history"],
            variable=self.tab_var,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color="#1e222a",
            selected_color="#4a7cff",
            selected_hover_color="#3d6be6",
            unselected_color="#1e222a",
            unselected_hover_color="#282d36",
            text_color="#c8ccd4",
            corner_radius=10,
            height=32,
            command=self._on_tab_change
        )
        # Renomeia os labels visíveis
        self.tab_seg.pack(fill="x")

        # Workaround: segmented button não suporta labels diferentes do value
        # Vamos usar labels como values
        self.tab_seg.destroy()
        self.tab_var = ctk.StringVar(value="🗓️ Agendados")
        self.tab_seg = ctk.CTkSegmentedButton(
            tab_frame,
            values=["🗓️ Agendados", "🕐 Histórico"],
            variable=self.tab_var,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color="#1e222a",
            selected_color="#4a7cff",
            selected_hover_color="#3d6be6",
            unselected_color="#1e222a",
            unselected_hover_color="#282d36",
            text_color="#c8ccd4",
            corner_radius=10,
            height=32,
            command=self._on_tab_change
        )
        self.tab_seg.pack(fill="x")

        # Content area
        self.content = ctk.CTkScrollableFrame(
            main,
            fg_color="#1a1d24",
            scrollbar_button_color="#2a2f38",
            scrollbar_button_hover_color="#3a3f4a",
            corner_radius=10
        )
        self.content.pack(fill="both", expand=True, padx=16, pady=(0, 8))

        # Bottom bar
        self.bottom_bar = ctk.CTkFrame(main, fg_color="transparent", height=40)
        self.bottom_bar.pack(fill="x", padx=16, pady=(0, 12))

        self._load_pending()

    def _on_tab_change(self, value):
        if "Agendados" in value:
            self.current_tab = "pending"
            self._load_pending()
        else:
            self.current_tab = "history"
            self._load_history()

    def _clear_content(self):
        for w in self.content.winfo_children():
            w.destroy()
        for w in self.bottom_bar.winfo_children():
            w.destroy()

    def _load_pending(self):
        self._clear_content()
        pending = reminder_manager.get_pending_reminders()

        if not pending:
            ctk.CTkLabel(
                self.content,
                text="Nenhum lembrete agendado",
                font=ctk.CTkFont(family="Segoe UI", size=13),
                text_color="#6b7280"
            ).pack(expand=True, pady=40)
            return

        for r in sorted(pending, key=lambda x: x.get("datetime", "")):
            self._pending_card(r)

    def _pending_card(self, reminder):
        card = ctk.CTkFrame(
            self.content,
            fg_color="#21252d",
            corner_radius=10
        )
        card.pack(fill="x", pady=3)

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.pack(fill="x", padx=14, pady=10)

        # Status icon
        status = "⏸️" if reminder.get("status") == "snoozed" else "🔔"

        # Botões à direita empacotados primeiro para não cortar
        btn_frame = ctk.CTkFrame(inner, fg_color="transparent")
        btn_frame.pack(side="right", padx=(8, 0))

        edit_btn = ctk.CTkButton(
            btn_frame,
            text="✏️",
            font=ctk.CTkFont(size=14),
            text_color="#8b95a5",
            fg_color="transparent",
            hover_color="#2a2f38",
            width=32,
            height=32,
            corner_radius=8,
            command=lambda rid=reminder["id"], i=inner: self._enter_edit_mode(i, rid)
        )
        edit_btn.pack(side="left", padx=(0, 4))

        cancel_btn = ctk.CTkButton(
            btn_frame,
            text="✕",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#ef4444",
            fg_color="transparent",
            hover_color="#2a1515",
            width=32,
            height=32,
            corner_radius=8,
            command=lambda rid=reminder["id"]: self._cancel(rid)
        )
        cancel_btn.pack(side="left")

        # Info (empacotado depois para preencher o resto e não empurrar os botões para fora)
        info = ctk.CTkFrame(inner, fg_color="transparent")
        info.pack(side="left", fill="x", expand=True)

        ctk.CTkLabel(
            info,
            text=f"{status}  {reminder.get('title', '')}",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#e0e4ec",
            anchor="w"
        ).pack(fill="x")

        try:
            dt = datetime.fromisoformat(reminder.get("datetime", ""))
            dt_text = dt.strftime("%d/%m/%Y às %H:%M")
        except (ValueError, TypeError):
            dt_text = ""

        if reminder.get("status") == "snoozed" and reminder.get("snoozed_until"):
            try:
                sn = datetime.fromisoformat(reminder["snoozed_until"])
                dt_text = f"Adiado → {sn.strftime('%d/%m às %H:%M')}"
            except (ValueError, TypeError):
                pass

        ctk.CTkLabel(
            info,
            text=dt_text,
            font=ctk.CTkFont(family="Segoe UI", size=10),
            text_color="#6b7280",
            anchor="w"
        ).pack(fill="x")

    def _enter_edit_mode(self, inner, reminder_id):
        """Transforma o card em um formulário de edição."""
        # Puxa o dado mais atualizado possível
        all_rems = reminder_manager.get_pending_reminders()
        reminder = next((r for r in all_rems if r["id"] == reminder_id), None)
        if not reminder:
            self._load_pending()
            return

        for w in inner.winfo_children():
            w.destroy()

        name_var = ctk.StringVar(value=reminder.get("title", ""))
        name_entry = ctk.CTkEntry(inner, textvariable=name_var, height=28, font=ctk.CTkFont(family="Segoe UI", size=12))
        name_entry.pack(fill="x", pady=(0, 6))

        dt_frame = ctk.CTkFrame(inner, fg_color="transparent")
        dt_frame.pack(fill="x")

        # Prioriza o horário de adiamento (snoozed_until), se houver
        target_str = reminder.get("snoozed_until") or reminder.get("datetime", "")

        try:
            dt_obj = datetime.fromisoformat(target_str)
            d_str = dt_obj.strftime("%d/%m/%Y")
            h_str = f"{dt_obj.hour:02d}"
            m_str = f"{dt_obj.minute:02d}"
        except:
            d_str = ""
            h_str = ""
            m_str = ""

        date_entry = ctk.CTkEntry(dt_frame, width=85, height=26, font=ctk.CTkFont(family="Segoe UI", size=11))
        date_entry.insert(0, d_str)
        date_entry.pack(side="left", padx=(0, 4))

        h_entry = ctk.CTkEntry(dt_frame, width=32, height=26, font=ctk.CTkFont(family="Segoe UI", size=11))
        h_entry.insert(0, h_str)
        h_entry.pack(side="left")
        ctk.CTkLabel(dt_frame, text=":", width=10).pack(side="left")
        m_entry = ctk.CTkEntry(dt_frame, width=32, height=26, font=ctk.CTkFont(family="Segoe UI", size=11))
        m_entry.insert(0, m_str)
        m_entry.pack(side="left", padx=(0, 8))

        def save():
            try:
                parts = date_entry.get().split("/")
                y, m, d = int(parts[2]), int(parts[1]), int(parts[0])
                hr, mn = int(h_entry.get()), int(m_entry.get())
                new_dt = datetime(y, m, d, hr, mn)
                if new_dt <= datetime.now():
                    date_entry.configure(border_color="#ef4444")
                    return
                # Quando salva uma nova data, remove o status de snoozed e atualiza o principal
                reminder_manager.update_reminder(reminder["id"], name_entry.get(), new_dt)
                if reminder.get("status") == "snoozed":
                    reminder_manager.update_status(reminder["id"], "pending", None)
                self._load_pending()
            except Exception:
                date_entry.configure(border_color="#ef4444")

        save_btn = ctk.CTkButton(dt_frame, text="Salvar", width=50, height=26, font=ctk.CTkFont(size=11, weight="bold"), fg_color="#4a7cff", hover_color="#3d6be6", command=save)
        save_btn.pack(side="right")

        cancel_btn = ctk.CTkButton(dt_frame, text="Cancelar", width=50, height=26, font=ctk.CTkFont(size=11), fg_color="transparent", hover_color="#2a1515", text_color="#ef4444", command=self._load_pending)
        cancel_btn.pack(side="right", padx=(0, 4))

    def _cancel(self, rid):
        reminder_manager.cancel_reminder(rid)
        self._load_pending()

    def _load_history(self):
        self._clear_content()
        history = reminder_manager.get_history_reminders()

        if not history:
            ctk.CTkLabel(
                self.content,
                text="Nenhum lembrete no histórico",
                font=ctk.CTkFont(family="Segoe UI", size=13),
                text_color="#6b7280"
            ).pack(expand=True, pady=40)
            return

        for r in sorted(history, key=lambda x: x.get("fired_at", ""),
                         reverse=True):
            self._history_card(r)

        # Botão limpar
        ctk.CTkButton(
            self.bottom_bar,
            text="🗑️  Limpar histórico",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color="#282d36",
            hover_color="#2a1515",
            text_color="#c8ccd4",
            corner_radius=8,
            height=32,
            command=self._clear_history
        ).pack(side="right")

    def _history_card(self, reminder):
        card = ctk.CTkFrame(
            self.content,
            fg_color="#21252d",
            corner_radius=10
        )
        card.pack(fill="x", pady=3)

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.pack(fill="x", padx=14, pady=10)

        status = "✅" if reminder.get("status") == "dismissed" else "🔔"

        ctk.CTkLabel(
            inner,
            text=f"{status}  {reminder.get('title', '')}",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#8b95a5",
            anchor="w"
        ).pack(fill="x")

        try:
            dt = datetime.fromisoformat(reminder.get("datetime", ""))
            dt_text = dt.strftime("%d/%m/%Y às %H:%M")
        except (ValueError, TypeError):
            dt_text = ""

        ctk.CTkLabel(
            inner,
            text=dt_text,
            font=ctk.CTkFont(family="Segoe UI", size=10),
            text_color="#4b5060",
            anchor="w"
        ).pack(fill="x")

    def _clear_history(self):
        reminder_manager.clear_history()
        self._load_history()
