"""
Módulo To-Do para o DeskWidget.
Painel de lista de tarefas com campos dinâmicos e checkboxes.
Design moderno com customtkinter.
"""

import tkinter as tk
import customtkinter as ctk
from datetime import datetime, timedelta
from modules.base_module import BaseModule
from core import todo_manager


class TodoModule(BaseModule):
    """Módulo de lista de tarefas dinâmica."""

    MODULE_ID = "todo"
    MODULE_NAME = "📋 To-Do"

    def __init__(self, parent_frame, config, app=None):
        super().__init__(parent_frame, config, app)
        self.task_rows = []
        self.completed_visible = False
        self.completed_section = None

        # Estado do drag
        self._dragging_row = None
        self._drag_ghost = None       # Frame flutuante que segue o mouse
        self._drag_start_y = 0
        self._drag_placeholder_idx = 0  # Índice visual atual durante o drag

    def render(self):
        """Renderiza o painel de To-Do."""
        self.frame = ctk.CTkFrame(
            self.parent,
            fg_color=self.COLORS["bg"],
            corner_radius=0
        )
        self.frame.pack(fill="both", expand=True, padx=0, pady=0)

        self._create_header(self.MODULE_NAME)

        # Área rolável para as tarefas
        self.scroll_container = ctk.CTkScrollableFrame(
            self.frame,
            fg_color="transparent",
            corner_radius=0,
            scrollbar_button_color=self.COLORS["border"],
            scrollbar_button_hover_color=self.COLORS["text_dim"]
        )
        self.scroll_container.pack(fill="both", expand=True, padx=0, pady=(2, 4))

        # Container para tarefas pendentes
        self.tasks_container = ctk.CTkFrame(
            self.scroll_container,
            fg_color="transparent",
            corner_radius=0
        )
        self.tasks_container.pack(fill="x")

        # Carrega tarefas existentes
        pending = todo_manager.get_pending_todos()
        for todo in pending:
            self._add_task_row(todo["text"], todo["id"])

        self._ensure_empty_row()
        self._render_completed_section()

    def focus_input(self):
        if self.task_rows:
            try:
                self.task_rows[-1]["entry"].focus_set()
                return True
            except Exception:
                pass
        return False

    # ──────────────────────────────────────────────
    # Seção de concluídas
    # ──────────────────────────────────────────────

    def _render_completed_section(self):
        done = todo_manager.get_done_todos()
        count = len(done)

        if self.completed_section:
            self.completed_section.destroy()

        self.completed_section = ctk.CTkFrame(
            self.scroll_container,
            fg_color="transparent",
            corner_radius=0
        )
        self.completed_section.pack(fill="x", pady=(0, 6))

        header_frame = ctk.CTkFrame(
            self.completed_section,
            fg_color="transparent",
            corner_radius=0
        )
        header_frame.pack(fill="x")

        arrow = "▸" if not self.completed_visible else "▾"
        header_btn = ctk.CTkButton(
            header_frame,
            text=f"{arrow} Concluídas ({count})",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color=self.COLORS["text_dim"],
            fg_color="transparent",
            hover_color=self.COLORS["card"],
            anchor="w",
            height=24,
            command=self._toggle_completed
        )
        header_btn.pack(side="left", fill="x", expand=True)

        if count > 0:
            clear_btn = ctk.CTkButton(
                header_frame,
                text="Limpar",
                font=ctk.CTkFont(family="Segoe UI", size=10),
                text_color=self.COLORS["text_muted"],
                fg_color="transparent",
                hover_color="#2a1515",
                width=50,
                height=24,
                command=self._clear_completed
            )
            clear_btn.pack(side="right")

        if self.completed_visible and count > 0:
            items_frame = ctk.CTkFrame(
                self.completed_section,
                fg_color="transparent",
                corner_radius=0
            )
            items_frame.pack(fill="x", pady=(2, 0))

            grouped_done = self._group_done_todos_by_date(done)
            for group_date, todos in grouped_done:
                self._render_done_group(items_frame, group_date, todos)

    def _group_done_todos_by_date(self, done_todos: list) -> list:
        grouped = {}
        for todo in done_todos:
            timestamp = todo.get("done_at") or todo.get("created_at")
            try:
                date_obj = datetime.fromisoformat(timestamp).date() if timestamp else None
            except (TypeError, ValueError):
                date_obj = None
            grouped.setdefault(date_obj, []).append(todo)

        sorted_groups = sorted(
            grouped.items(),
            key=lambda item: item[0] or datetime.min.date(),
            reverse=True
        )
        return sorted_groups

    def _render_done_group(self, parent, group_date, todos):
        header_text = self._format_done_group_label(group_date)
        group_frame = ctk.CTkFrame(parent, fg_color="transparent", corner_radius=0)
        group_frame.pack(fill="x", pady=(4, 2), padx=2)

        label = ctk.CTkLabel(
            group_frame,
            text=header_text,
            font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
            text_color=self.COLORS["text_dim"],
            anchor="w"
        )
        label.pack(fill="x", padx=4, pady=(0, 2))

        for todo in todos:
            self._add_completed_row(group_frame, todo)

    def _format_done_group_label(self, date_obj):
        if date_obj is None:
            return "Sem data"

        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        if date_obj == today:
            return "Hoje"
        if date_obj == yesterday:
            return "Ontem"

        weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
        weekday_name = weekdays[date_obj.weekday()]
        return f"{date_obj.strftime('%d/%m/%y')} ({weekday_name})"

    def _toggle_completed(self):
        self.completed_visible = not self.completed_visible
        self._render_completed_section()

    def _add_completed_row(self, parent, todo: dict):
        row = ctk.CTkFrame(parent, fg_color=self.COLORS["card"], corner_radius=6, height=30)
        row.pack(fill="x", pady=1, padx=4)

        # Botão restaurar ↩ — começa invisível, aparece só no hover
        restore_btn = ctk.CTkButton(
            row,
            text="↩",
            font=ctk.CTkFont(family="Segoe UI", size=13),
            text_color=self.COLORS["text_dim"],
            fg_color="transparent",
            hover_color=self.COLORS["border"],
            width=28,
            height=26,
            corner_radius=6,
            command=lambda t=todo: self._restore_todo(t)
        )
        # Reserva o espaço mas deixa invisível (placeholder transparente)
        restore_placeholder = ctk.CTkFrame(row, fg_color="transparent", width=32, height=26)
        restore_placeholder.pack(side="right", padx=(0, 4), pady=2)

        label = ctk.CTkLabel(
            row,
            text=f"  ✓  {todo['text']}",
            font=ctk.CTkFont(family="Segoe UI", size=11, overstrike=True),
            text_color=self.COLORS["text_muted"],
            anchor="w"
        )
        label.pack(side="left", fill="x", expand=True, padx=4, pady=3)

        def _show_restore(e=None):
            restore_placeholder.pack_forget()
            restore_btn.pack(side="right", padx=(0, 4), pady=2)

        def _hide_restore(e=None):
            restore_btn.pack_forget()
            restore_placeholder.pack(side="right", padx=(0, 4), pady=2)

        # Bind hover em todos os filhos do row
        for widget in (row, label, restore_placeholder, restore_btn):
            widget.bind("<Enter>", _show_restore)
            widget.bind("<Leave>", _hide_restore)

    def _restore_todo(self, todo: dict):
        """Restaura uma tarefa concluída para pendente."""
        todo_manager.toggle_todo_done(todo["id"])  # volta done=False

        # Adiciona visualmente de volta ao topo das pendentes
        # (antes da linha vazia final)
        new_row = self._add_task_row(todo["text"], todo["id"])
        # Move para penúltima posição (antes da linha vazia)
        if len(self.task_rows) >= 2:
            self.task_rows.remove(new_row)
            self.task_rows.insert(len(self.task_rows) - 1, new_row)
            self._repack_rows()

        self._render_completed_section()

    def _clear_completed(self):
        todo_manager.clear_done_todos()
        self._render_completed_section()

    # ──────────────────────────────────────────────
    # Linha de tarefa pendente
    # ──────────────────────────────────────────────

    def _add_task_row(self, text: str = "", todo_id: str = None):
        """Adiciona uma linha de tarefa pendente."""
        row_frame = ctk.CTkFrame(
            self.tasks_container,
            fg_color="transparent",
            corner_radius=0,
            height=34
        )
        row_frame.pack(fill="x", pady=1)

        # Checkbox
        var = tk.BooleanVar(value=False)
        check = ctk.CTkCheckBox(
            row_frame,
            text="",
            variable=var,
            width=20,
            height=20,
            checkbox_width=18,
            checkbox_height=18,
            corner_radius=4,
            border_width=2,
            fg_color=self.COLORS["accent"],
            border_color=self.COLORS["border"],
            hover_color=self.COLORS["accent_hover"]
        )
        check.pack(side="left", padx=(4, 4))

        # Drag handle — lado direito (≡)
        drag_handle = ctk.CTkLabel(
            row_frame,
            text="≡",
            font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"),
            text_color=self.COLORS["text_dim"],
            width=22,
            cursor="hand2"
        )
        drag_handle.pack(side="right", padx=(2, 6))

        # Entry
        entry = ctk.CTkEntry(
            row_frame,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color=self.COLORS["input"],
            text_color=self.COLORS["text"],
            border_color=self.COLORS["border"],
            border_width=1,
            corner_radius=6,
            height=28,
            placeholder_text="Nova tarefa..." if not text else None,
            placeholder_text_color=self.COLORS["text_muted"]
        )
        entry.pack(side="left", fill="x", expand=True, padx=(0, 4))

        if text:
            entry.insert(0, text)

        row_data = {
            "id": todo_id,
            "frame": row_frame,
            "var": var,
            "entry": entry,
            "check": check,
            "drag_handle": drag_handle,
        }

        var.trace_add("write", lambda *args, rd=row_data: self._on_check_changed(rd))
        entry.bind("<Return>",   lambda e, rd=row_data: self._on_enter(rd))
        entry.bind("<FocusOut>", lambda e, rd=row_data: self._on_focus_out(rd))

        drag_handle.bind("<ButtonPress-1>",   lambda e, rd=row_data: self._drag_start(e, rd))
        drag_handle.bind("<B1-Motion>",        lambda e, rd=row_data: self._drag_motion(e, rd))
        drag_handle.bind("<ButtonRelease-1>",  lambda e, rd=row_data: self._drag_release(e, rd))

        self.task_rows.append(row_data)
        return row_data

    # ──────────────────────────────────────────────
    # Drag & Drop animado
    # ──────────────────────────────────────────────

    def _drag_start(self, event, row_data):
        """Inicia o drag: cria o ghost flutuante e esconde a linha original."""
        self._dragging_row = row_data
        self._drag_placeholder_idx = self.task_rows.index(row_data)
        self._drag_start_y = event.y_root

        # Cria um frame "fantasma" no topo da janela que segue o mouse
        entry_text = row_data["entry"].get()
        top = self.frame.winfo_toplevel()

        self._drag_ghost = ctk.CTkFrame(
            top,
            fg_color=self.COLORS["card"],
            corner_radius=8,
            height=34,
            border_width=1,
            border_color=self.COLORS["accent"]
        )

        # Conteúdo visual do ghost (ícone ≡ + texto)
        ctk.CTkLabel(
            self._drag_ghost,
            text=entry_text or "Nova tarefa...",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=self.COLORS["text"],
            anchor="w"
        ).pack(side="left", fill="x", expand=True, padx=(10, 4), pady=4)

        ctk.CTkLabel(
            self._drag_ghost,
            text="≡",
            font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"),
            text_color=self.COLORS["accent"],
            width=22
        ).pack(side="right", padx=(2, 6))

        # Posiciona o ghost na posição atual da linha
        rf = row_data["frame"]
        rx = rf.winfo_rootx() - top.winfo_rootx()
        ry = rf.winfo_rooty() - top.winfo_rooty()
        rw = rf.winfo_width()

        self._ghost_offset_y = event.y_root - rf.winfo_rooty()
        self._drag_ghost.place(x=rx, y=ry, width=rw, height=34)
        self._drag_ghost.lift()

        # Torna a linha original semitransparente
        row_data["frame"].configure(fg_color=self.COLORS["border"])

    def _drag_motion(self, event, row_data):
        """Move o ghost com o mouse e reordena as linhas em tempo real."""
        if self._dragging_row is not row_data or self._drag_ghost is None:
            return

        top = self.frame.winfo_toplevel()
        ghost_y = event.y_root - top.winfo_rooty() - self._ghost_offset_y

        # Limita o ghost dentro da janela
        max_y = top.winfo_height() - 34
        ghost_y = max(0, min(ghost_y, max_y))

        # Move o ghost
        self._drag_ghost.place_configure(y=ghost_y)

        # Determina qual índice o mouse está sobre
        current_idx = self.task_rows.index(row_data)
        container_top = self.tasks_container.winfo_rooty()
        mouse_y = event.y_root - container_top

        # Calcula o novo índice alvo (sem incluir a linha vazia no final)
        max_idx = max(0, len(self.task_rows) - 2)  # não troca com linha vazia
        target_idx = max(0, min(int(mouse_y // 36), max_idx))

        if target_idx != current_idx:
            self.task_rows.pop(current_idx)
            self.task_rows.insert(target_idx, row_data)
            self._repack_rows()

    def _drag_release(self, event, row_data):
        """Finaliza o drag: remove o ghost e restaura aparência."""
        if self._drag_ghost:
            self._drag_ghost.destroy()
            self._drag_ghost = None

        if self._dragging_row:
            # Restaura aparência da linha
            self._dragging_row["frame"].configure(fg_color="transparent")
            self._dragging_row = None

        # Salva a nova ordem no arquivo
        new_order = [r["id"] for r in self.task_rows if r["id"]]
        if new_order:
            todo_manager.reorder_todos(new_order)

    # ──────────────────────────────────────────────
    # Gestão de linhas e eventos
    # ──────────────────────────────────────────────

    def _ensure_empty_row(self):
        """Garante que APENAS a última linha pode ser vazia."""
        # Remove todas as linhas vazias que NÃO são a última
        rows_to_remove = []
        for rd in self.task_rows[:-1]:  # todas menos a última
            if not rd["entry"].get().strip() and not rd["id"]:
                rows_to_remove.append(rd)

        for rd in rows_to_remove:
            rd["frame"].destroy()
            if rd in self.task_rows:
                self.task_rows.remove(rd)

        # Se a última linha tem texto, adiciona uma linha vazia nova
        if not self.task_rows or self.task_rows[-1]["entry"].get().strip():
            self._add_task_row()

    def _on_enter(self, row_data):
        text = row_data["entry"].get().strip()
        if not text:
            return "break"

        # Salva se ainda não tem ID
        if not row_data["id"]:
            todo = todo_manager.add_todo(text)
            row_data["id"] = todo["id"]

        idx = self.task_rows.index(row_data)
        new_row = self._add_task_row()

        # Insere a nova linha logo abaixo da atual (se não for a última)
        if idx < len(self.task_rows) - 2:
            self.task_rows.remove(new_row)
            self.task_rows.insert(idx + 1, new_row)
            self._repack_rows()

        new_row["entry"].focus_set()
        return "break"

    def _on_focus_out(self, row_data):
        text = row_data["entry"].get().strip()

        if text and not row_data["id"]:
            # Nova tarefa com conteúdo — salva
            todo = todo_manager.add_todo(text)
            row_data["id"] = todo["id"]
        elif text and row_data["id"]:
            # Tarefa existente com conteúdo — atualiza
            todo_manager.update_todo_text(row_data["id"], text)
        elif not text and row_data["id"]:
            # Texto apagado de tarefa existente — remove do banco
            todo_manager.remove_todo(row_data["id"])
            row_data["id"] = None

        # ── Regra: só a última linha pode ficar vazia ──
        is_last = (self.task_rows[-1] is row_data) if self.task_rows else False

        if not text and not is_last:
            # Linha não é a última e está vazia → destrói
            row_data["frame"].destroy()
            if row_data in self.task_rows:
                self.task_rows.remove(row_data)

        self._ensure_empty_row()

    def _on_check_changed(self, row_data):
        if row_data["var"].get() and row_data["id"]:
            todo_manager.toggle_todo_done(row_data["id"])
            row_data["frame"].destroy()
            if row_data in self.task_rows:
                self.task_rows.remove(row_data)
            self._ensure_empty_row()
            self._render_completed_section()

    def _repack_rows(self):
        for row in self.task_rows:
            row["frame"].pack_forget()
        for row in self.task_rows:
            row["frame"].pack(fill="x", pady=1)
