"""
Classe base para todos os módulos do DeskWidget.
Cada módulo deve herdar BaseModule e implementar render().
Usa customtkinter para visual moderno.
"""

import tkinter as tk
import customtkinter as ctk


class BaseModule:
    """Classe abstrata para módulos do atalho flutuante."""

    MODULE_ID = ""
    MODULE_NAME = ""

    # Paleta de cores (Light, Dark)
    COLORS = {
        "bg": ("#f3f4f6", "#1a1d24"),
        "card": ("#e5e7eb", "#21252d"),
        "input": ("#ffffff", "#282d36"),
        "border": ("#d1d5db", "#2e333d"),
        "text": ("#111827", "#c8ccd4"),
        "text_dim": ("#4b5563", "#6b7280"),
        "text_muted": ("#6b7280", "#4b5060"),
        "accent": ("#3b82f6", "#4a7cff"),
        "accent_hover": ("#2563eb", "#3d6be6"),
        "success": ("#22c55e", "#4ade80"),
        "error": ("#ef4444", "#ef4444"),
        "separator": ("#d1d5db", "#262b33"),
    }

    def __init__(self, parent_frame, config: dict, app=None):
        self.parent = parent_frame
        self.config = config
        self.app = app
        self.frame = None

    def render(self):
        raise NotImplementedError("Módulo deve implementar render()")

    def destroy(self):
        if self.frame:
            self.frame.destroy()
            self.frame = None

    def refresh(self):
        pass

    def focus_input(self):
        return False

    def _create_header(self, text: str):
        """Cria um cabeçalho moderno para o módulo."""
        header = ctk.CTkLabel(
            self.frame,
            text=text,
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color=self.COLORS["text"],
            anchor="w"
        )
        header.pack(fill="x", padx=12, pady=(10, 4))
        return header

    def _create_separator(self):
        """Cria um separador visual sutil."""
        sep = ctk.CTkFrame(
            self.frame,
            height=1,
            fg_color=self.COLORS["separator"],
            corner_radius=0
        )
        sep.pack(fill="x", padx=16, pady=6)
        return sep
