"""
Widget flutuante principal do DeskWidget.
Janela sem borda, always-on-top.
Handle pequeno, arredondado e dinâmico.
"""

import tkinter as tk
import customtkinter as ctk
from widget.hover_controller import HoverController
from widget.module_loader import load_modules

class FloatingWidget:
    """Widget flutuante retrátil fixado na borda da tela."""

    def __init__(self, root: tk.Tk, config: dict, app=None):
        self.root = root
        self.config = config
        self.app = app

        # Parâmetros
        wc = config.get("widget", {})
        self.side = wc.get("side", "right")
        self.opacity = wc.get("opacity", 0.90)
        self.collapse_delay = wc.get("collapse_delay_ms", 1000)
        self.custom_y = wc.get("custom_y", None)
        self._is_dragging = False
        
        # Handle recolhido é um pouco mais largo para acomodar o visual arredondado
        self.collapsed_width = 10 
        self.expanded_width = 320

        # Cores e tema (baseado na config de tema)
        self.theme = wc.get("theme", "dark")
        ctk.set_appearance_mode(self.theme)
        
        # Se claro ou escuro, definimos as cores base
        if self.theme == "dark":
            self.transparent_key = "#000001" # Cor chave para transparência
            self.handle_color = "#3a3f4a"
            self.content_bg = "#1a1d24"
        else:
            self.transparent_key = "#fffffe"
            self.handle_color = "#d1d5db"
            self.content_bg = "#f3f4f6"

        self.accent = "#4a7cff"
        
        self.is_expanded = False
        self._current_width = self.collapsed_width
        self.loaded_modules = []

        # Altura
        self.handle_height = 60
        self.expanded_height = wc.get("height", 600)

        # Cria a janela
        self.win = tk.Toplevel(root)
        self.win.overrideredirect(True)
        self.win.attributes("-topmost", True)
        self.win.wm_attributes("-toolwindow", True)
        
        # No Windows, usamos a transparent key para ter cantos arredondados de verdade
        try:
            self.win.attributes("-transparentcolor", self.transparent_key)
            self.win.configure(bg=self.transparent_key)
        except:
            self.win.configure(bg=self.content_bg)

        # Frame principal que engloba tudo
        self.main_frame = tk.Frame(self.win, bg=self.transparent_key)
        self.main_frame.pack(fill="both", expand=True)

        # O handle será um CTkFrame arredondado
        self.handle_frame = ctk.CTkFrame(
            self.main_frame,
            width=self.collapsed_width,
            height=self.handle_height,
            fg_color=self.handle_color,
            corner_radius=5 # Borda arredondada
        )
        # Posicionamento do handle
        pack_side = "left" if self.side == "right" else "right"
        self.handle_frame.pack(side=pack_side, fill="y", pady=(0, 0))

        # Container do conteúdo expandido (CTkFrame arredondado)
        self.content_frame = ctk.CTkFrame(
            self.main_frame,
            fg_color=self.content_bg,
            corner_radius=10
        )
        
        # A área do conteúdo, será redimensionada dinamicamente
        self.scroll_frame_widget = None

        self.hover = HoverController(self, self.collapse_delay)

        # Começa recolhido
        self.win.attributes("-alpha", self.opacity)
        self._update_geometry()

        self.win.bind("<Enter>", self.hover.on_enter)
        self.win.bind("<Leave>", self._on_leave_check)
        self.win.bind("<Configure>", self._on_configure)
        self.win.bind("<Escape>", lambda e: self.collapse())

        # Bindings para arrastar
        self.handle_frame.bind("<ButtonPress-1>", self._start_drag)
        self.handle_frame.bind("<B1-Motion>", self._do_drag)
        self.handle_frame.bind("<ButtonRelease-1>", self._stop_drag)

    def _on_leave_check(self, event):
        x, y = event.x, event.y
        w, h = self.win.winfo_width(), self.win.winfo_height()
        if 0 <= x <= w and 0 <= y <= h:
            return
        self.hover.on_leave(event)

    def _on_configure(self, event):
        """Ao mudar de tamanho (conteúdo dinâmico crescendo), atualiza a janela se já estiver expandido."""
        if getattr(self, '_is_dragging', False):
            return
        if self.is_expanded:
            self._update_geometry()

    def _update_geometry(self):
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()

        if self.is_expanded:
            height = self.expanded_height
        else:
            height = self.handle_height

        if self.custom_y is not None:
            y = self.custom_y
            if y + height > screen_h:
                y = screen_h - height
            if y < 0:
                y = 0
        else:
            y = (screen_h - height) // 2

        if self.side == "right":
            x = screen_w - self._current_width
        else:
            x = self._current_width - self.expanded_width

        self.win.geometry(f"{self.expanded_width}x{height}+{x}+{y}")

    def set_width(self, width: int):
        self._current_width = width
        self._update_geometry()

    def expand(self):
        if self.is_expanded:
            return
            
        self.is_expanded = True
        self.win.attributes("-alpha", 1.0)
        
        # Esconde a barra lateral completamente
        self.handle_frame.pack_forget()
        
        self._show_content()
        self.set_width(self.expanded_width)

    def collapse(self):
        if not self.is_expanded:
            return

        self.is_expanded = False
        self._hide_content()
        
        # Volta a mostrar a barra lateral
        pack_side = "left" if self.side == "right" else "right"
        self.handle_frame.pack(side=pack_side, fill="y", pady=(0, 0))
        
        self.win.attributes("-alpha", self.opacity)
        self.set_width(self.collapsed_width)

    def _show_content(self):
        pack_side = "left" if self.side == "right" else "right"
        # Sem margem para preencher totalmente e ficar limpo
        self.content_frame.pack(side=pack_side, fill="both", expand=True, padx=0, pady=0)

        # Barra superior de arrasto quando expandido
        self.drag_bar = ctk.CTkFrame(self.content_frame, height=30, fg_color="transparent")
        self.drag_bar.pack(side="top", fill="x")

        # Botão de configurações — lado esquerdo da barra
        settings_btn = ctk.CTkButton(
            self.drag_bar,
            text="⚙",
            font=ctk.CTkFont(size=13),
            text_color=self.handle_color,
            fg_color="transparent",
            hover_color=self.handle_color if self.theme == "dark" else "#e5e7eb",
            width=28,
            height=24,
            corner_radius=6,
            command=self._open_settings
        )
        pack_settings_side = "right" if self.side == "right" else "left"
        settings_btn.pack(side=pack_settings_side, padx=(4, 4), pady=(4, 2))

        # Pill visual centralizado
        pill = ctk.CTkFrame(self.drag_bar, width=40, height=4, fg_color=self.handle_color, corner_radius=2)
        pill.pack(pady=(10, 4))

        # Binds para arrastar a janela aberta
        for w in (self.drag_bar, pill):
            w.bind("<ButtonPress-1>", self._start_drag)
            w.bind("<B1-Motion>", self._do_drag)
            w.bind("<ButtonRelease-1>", self._stop_drag)

        if not self.loaded_modules:
            self._load_modules()

        # Foca no primeiro campo de texto disponível após abrir
        self.root.after(100, self._auto_focus)

    def _auto_focus(self):
        for module in self.loaded_modules:
            if hasattr(module, 'focus_input') and module.focus_input():
                return

    def _hide_content(self):
        if hasattr(self, 'drag_bar') and self.drag_bar:
            self.drag_bar.destroy()
            self.drag_bar = None
        self.content_frame.pack_forget()

    def _load_modules(self):
        for module in self.loaded_modules:
            module.destroy()
        self.loaded_modules.clear()

        for widget in self.content_frame.winfo_children():
            widget.destroy()

        # O scroll_frame deve adaptar-se ao conteúdo. CTkScrollableFrame não cresce sua
        # altura requisitada dinamicamente da mesma forma. 
        # Vamos usar um frame padrão e criar o scroll apenas se a altura passar do máximo.
        self.scroll_frame_widget = ctk.CTkFrame(
            self.content_frame,
            fg_color="transparent"
        )
        self.scroll_frame_widget.pack(fill="both", expand=True, padx=5, pady=5)

        self.loaded_modules = load_modules(
            self.scroll_frame_widget, self.config, self.app
        )

    def apply_config(self, config: dict):
        self.config = config
        wc = config.get("widget", {})
        self.side = wc.get("side", "right")
        self.opacity = wc.get("opacity", 0.90)
        self.collapse_delay = wc.get("collapse_delay_ms", 1000)
        self.expanded_height = wc.get("height", 600)
        self.custom_y = wc.get("custom_y", None)
        
        # Atualiza tema e cores
        new_theme = wc.get("theme", "dark")
        if new_theme != self.theme:
            self.theme = new_theme
            ctk.set_appearance_mode(self.theme)
            if self.theme == "dark":
                self.handle_color = "#3a3f4a"
                self.content_bg = "#1a1d24"
            else:
                self.handle_color = "#d1d5db"
                self.content_bg = "#f3f4f6"
            
            if not self.is_expanded:
                self.handle_frame.configure(fg_color=self.handle_color)
            self.content_frame.configure(fg_color=self.content_bg)

        if not self.is_expanded:
            self.win.attributes("-alpha", self.opacity)
            
        self.hover.update_delay(self.collapse_delay)
        
        if self.is_expanded:
            self._load_modules()
            self._update_geometry()

    def destroy_widget(self):
        try:
            self.win.destroy()
        except Exception:
            pass

    def _open_settings(self):
        """Abre a janela de configurações."""
        if self.app:
            from ui.settings_window import SettingsWindow
            SettingsWindow(self.app.get_config(), self.app)

    def _start_drag(self, event):
        self._is_dragging = True
        self._drag_start_x = event.x_root
        self._drag_start_y = event.y_root
        self._win_start_x = self.win.winfo_x()
        self._win_start_y = self.win.winfo_y()

    def _do_drag(self, event):
        if not self._is_dragging: return
        dx = event.x_root - self._drag_start_x
        dy = event.y_root - self._drag_start_y
        new_x = self._win_start_x + dx
        new_y = self._win_start_y + dy
        
        # Preserva a altura visual (seja expandido ou recolhido)
        current_height = self.expanded_height if self.is_expanded else self.handle_height
        
        # Move a janela fisicamente de forma bruta e rápida
        self.win.geometry(f"{self.expanded_width}x{current_height}+{new_x}+{new_y}")

    def _stop_drag(self, event):
        if not self._is_dragging: return
        self._is_dragging = False
        
        screen_w = self.root.winfo_screenwidth()
        current_x = self.win.winfo_x()
        
        # O handle_x é a ponta visível que o usuário está segurando
        if self.side == "right":
            handle_x = current_x
        else:
            handle_x = current_x + self.expanded_width - self.collapsed_width
            
        new_side = "left" if handle_x < screen_w // 2 else "right"
        self.side = new_side
        self.custom_y = self.win.winfo_y()
        
        new_config = self.app.get_config()
        if "widget" not in new_config:
            new_config["widget"] = {}
        new_config["widget"]["side"] = self.side
        new_config["widget"]["custom_y"] = self.custom_y
        
        # Salva o arquivo e reinicia a interface por inteiro para recriar as âncoras na direita ou esquerda corretamente
        self.app.update_config(new_config)
        self.app.restart_widget()
