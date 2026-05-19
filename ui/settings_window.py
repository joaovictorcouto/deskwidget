"""
Janela de configurações do atalho flutuante.
Design moderno com customtkinter.
"""

import customtkinter as ctk
from widget.module_loader import get_available_modules


class SettingsWindow:
    """Janela de configuração do atalho."""

    def __init__(self, config: dict, app):
        self.config = config
        self.app = app
        self.module_vars = {}

        self.win = ctk.CTkToplevel()
        self.win.title("Configurar Atalho")
        self.win.geometry("380x480")
        self.win.resizable(False, False)
        self.win.attributes("-topmost", True)

        self._build_ui()

        # Centraliza na tela
        self.win.update_idletasks()
        sw = self.win.winfo_screenwidth()
        sh = self.win.winfo_screenheight()
        x = (sw - 380) // 2
        y = (sh - 480) // 2
        self.win.geometry(f"380x480+{x}+{y}")

    def _build_ui(self):
        main = ctk.CTkScrollableFrame(
            self.win,
            fg_color="#16181d",
            corner_radius=0
        )
        main.pack(fill="both", expand=True)

        # Título
        ctk.CTkLabel(
            main,
            text="⚙️  Configurações",
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color="#e0e4ec"
        ).pack(fill="x", padx=20, pady=(16, 4))

        ctk.CTkLabel(
            main,
            text="Personalize o atalho flutuante",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#6b7280"
        ).pack(fill="x", padx=20, pady=(0, 12))

        # --- Card: Módulos ---
        modules_card = ctk.CTkFrame(main, fg_color="#1e222a", corner_radius=12)
        modules_card.pack(fill="x", padx=16, pady=(0, 10))

        ctk.CTkLabel(
            modules_card,
            text="Módulos",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#c8ccd4"
        ).pack(fill="x", padx=16, pady=(12, 6))

        enabled = self.config.get("modules", {}).get("enabled", [])
        available = get_available_modules()

        for mod_id, mod_info in available.items():
            var = ctk.BooleanVar(value=mod_id in enabled)
            self.module_vars[mod_id] = var

            row = ctk.CTkFrame(modules_card, fg_color="transparent")
            row.pack(fill="x", padx=16, pady=3)

            ctk.CTkLabel(
                row,
                text=mod_info['name'],
                font=ctk.CTkFont(family="Segoe UI", size=12),
                text_color="#c8ccd4",
                anchor="w"
            ).pack(side="left", fill="x", expand=True)

            switch = ctk.CTkSwitch(
                row,
                text="",
                variable=var,
                width=40,
                height=20,
                switch_width=36,
                switch_height=18,
                fg_color="#2e333d",
                progress_color="#4a7cff",
                button_color="#e0e4ec",
                button_hover_color="#ffffff"
            )
            switch.pack(side="right")

        # Padding inferior do card
        ctk.CTkFrame(modules_card, fg_color="transparent", height=8).pack()

        # --- Card: Aparência ---
        appearance_card = ctk.CTkFrame(main, fg_color="#1e222a", corner_radius=12)
        appearance_card.pack(fill="x", padx=16, pady=(0, 10))

        ctk.CTkLabel(
            appearance_card,
            text="Aparência",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#c8ccd4"
        ).pack(fill="x", padx=16, pady=(12, 8))

        # Posição
        pos_row = ctk.CTkFrame(appearance_card, fg_color="transparent")
        pos_row.pack(fill="x", padx=16, pady=(0, 6))

        ctk.CTkLabel(
            pos_row,
            text="Posição",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#8b95a5"
        ).pack(side="left")

        current_side = self.config.get("widget", {}).get("side", "right")
        self.side_var = ctk.StringVar(value=current_side)
        side_seg = ctk.CTkSegmentedButton(
            pos_row,
            values=["left", "right"],
            variable=self.side_var,
            font=ctk.CTkFont(family="Segoe UI", size=11),
            fg_color="#282d36",
            selected_color="#4a7cff",
            selected_hover_color="#3d6be6",
            unselected_color="#282d36",
            unselected_hover_color="#2e333d",
            text_color="#c8ccd4",
            corner_radius=8,
            height=28
        )
        side_seg.pack(side="right")

        # Tema
        theme_row = ctk.CTkFrame(appearance_card, fg_color="transparent")
        theme_row.pack(fill="x", padx=16, pady=(0, 6))

        ctk.CTkLabel(
            theme_row,
            text="Tema",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#8b95a5"
        ).pack(side="left")

        current_theme = self.config.get("widget", {}).get("theme", "dark")
        self.theme_var = ctk.StringVar(value=current_theme)
        theme_seg = ctk.CTkSegmentedButton(
            theme_row,
            values=["dark", "light"],
            variable=self.theme_var,
            font=ctk.CTkFont(family="Segoe UI", size=11),
            fg_color="#282d36",
            selected_color="#4a7cff",
            selected_hover_color="#3d6be6",
            unselected_color="#282d36",
            unselected_hover_color="#2e333d",
            text_color="#c8ccd4",
            corner_radius=8,
            height=28
        )
        theme_seg.pack(side="right")

        # Opacidade
        opacity_row = ctk.CTkFrame(appearance_card, fg_color="transparent")
        opacity_row.pack(fill="x", padx=16, pady=(0, 6))

        ctk.CTkLabel(
            opacity_row,
            text="Opacidade",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#8b95a5"
        ).pack(side="left")

        current_opacity = self.config.get("widget", {}).get("opacity", 0.9)
        self.opacity_var = ctk.DoubleVar(value=current_opacity)

        self.opacity_label = ctk.CTkLabel(
            opacity_row,
            text=f"{int(current_opacity * 100)}%",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color="#4a7cff",
            width=40
        )
        self.opacity_label.pack(side="right")

        opacity_slider = ctk.CTkSlider(
            appearance_card,
            from_=0.5, to=1.0,
            variable=self.opacity_var,
            fg_color="#282d36",
            progress_color="#4a7cff",
            button_color="#e0e4ec",
            button_hover_color="#ffffff",
            height=14,
            command=self._on_opacity_change
        )
        opacity_slider.pack(fill="x", padx=16, pady=(0, 8))

        # Delay
        delay_row = ctk.CTkFrame(appearance_card, fg_color="transparent")
        delay_row.pack(fill="x", padx=16, pady=(0, 12))

        ctk.CTkLabel(
            delay_row,
            text="Delay recolher",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#8b95a5"
        ).pack(side="left")

        self.delay_var = ctk.StringVar(
            value=str(self.config.get("widget", {}).get("collapse_delay_ms", 1000))
        )
        delay_entry = ctk.CTkEntry(
            delay_row,
            textvariable=self.delay_var,
            width=70,
            height=28,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color="#282d36",
            text_color="#c8ccd4",
            border_color="#2e333d",
            border_width=1,
            corner_radius=6,
            justify="center"
        )
        delay_entry.pack(side="right")

        ctk.CTkLabel(
            delay_row,
            text="ms",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color="#6b7280",
            width=24
        ).pack(side="right", padx=(0, 4))

        # Altura
        height_row = ctk.CTkFrame(appearance_card, fg_color="transparent")
        height_row.pack(fill="x", padx=16, pady=(0, 12))

        ctk.CTkLabel(
            height_row,
            text="Altura expandida",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#8b95a5"
        ).pack(side="left")

        self.height_var = ctk.StringVar(
            value=str(self.config.get("widget", {}).get("height", 600))
        )
        height_entry = ctk.CTkEntry(
            height_row,
            textvariable=self.height_var,
            width=70,
            height=28,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            fg_color="#282d36",
            text_color="#c8ccd4",
            border_color="#2e333d",
            border_width=1,
            corner_radius=6,
            justify="center"
        )
        height_entry.pack(side="right")

        ctk.CTkLabel(
            height_row,
            text="px",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color="#6b7280",
            width=24
        ).pack(side="right", padx=(0, 4))

        # Auto-Start
        autostart_row = ctk.CTkFrame(appearance_card, fg_color="transparent")
        autostart_row.pack(fill="x", padx=16, pady=(0, 12))

        ctk.CTkLabel(
            autostart_row,
            text="Iniciar com o Windows",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#8b95a5"
        ).pack(side="left")

        current_autostart = self.config.get("system", {}).get("start_with_windows", False)
        self.autostart_var = ctk.BooleanVar(value=current_autostart)
        
        autostart_switch = ctk.CTkSwitch(
            autostart_row,
            text="",
            variable=self.autostart_var,
            width=40,
            height=20,
            switch_width=36,
            switch_height=18,
            fg_color="#2e333d",
            progress_color="#4a7cff",
            button_color="#e0e4ec",
            button_hover_color="#ffffff"
        )
        autostart_switch.pack(side="right")

        # --- Botões ---
        btn_frame = ctk.CTkFrame(main, fg_color="transparent")
        btn_frame.pack(fill="x", padx=16, pady=(8, 16))

        ctk.CTkButton(
            btn_frame,
            text="Salvar",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            fg_color="#4a7cff",
            hover_color="#3d6be6",
            text_color="white",
            corner_radius=10,
            height=36,
            command=self._save
        ).pack(side="left", fill="x", expand=True, padx=(0, 6))

        ctk.CTkButton(
            btn_frame,
            text="Cancelar",
            font=ctk.CTkFont(family="Segoe UI", size=13),
            fg_color="#282d36",
            hover_color="#2e333d",
            text_color="#c8ccd4",
            corner_radius=10,
            height=36,
            command=self.win.destroy
        ).pack(side="left", fill="x", expand=True)

    def _on_opacity_change(self, value):
        self.opacity_label.configure(text=f"{int(float(value) * 100)}%")

    def _save(self):
        import copy
        enabled = [m for m, v in self.module_vars.items() if v.get()]
        new_config = copy.deepcopy(self.config)
        new_config["modules"] = {"enabled": enabled, "order": enabled}
        new_config["widget"]["side"] = self.side_var.get()
        new_config["widget"]["theme"] = self.theme_var.get()
        new_config["widget"]["opacity"] = round(self.opacity_var.get(), 2)
        try:
            new_config["widget"]["collapse_delay_ms"] = int(self.delay_var.get())
        except ValueError:
            pass
        try:
            new_config["widget"]["height"] = int(self.height_var.get())
        except ValueError:
            pass

        if "system" not in new_config:
            new_config["system"] = {}
        new_config["system"]["start_with_windows"] = self.autostart_var.get()
        
        from core.system_utils import set_autostart
        set_autostart(self.autostart_var.get())

        self.app.update_config(new_config)
        self.win.destroy()
