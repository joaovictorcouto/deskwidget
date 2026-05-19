"""
Carregador de módulos do DeskWidget.
Carrega e renderiza os módulos habilitados na configuração.
"""

import customtkinter as ctk


AVAILABLE_MODULES = {}


def register_modules():
    """Registra todos os módulos disponíveis."""
    global AVAILABLE_MODULES
    from modules.reminder_module import ReminderModule
    from modules.todo_module import TodoModule

    AVAILABLE_MODULES = {
        "reminder": {
            "class": ReminderModule,
            "name": "🔔 Lembretes",
            "description": "Agendar e receber lembretes"
        },
        "todo": {
            "class": TodoModule,
            "name": "📋 To-Do",
            "description": "Lista de tarefas dinâmica"
        }
    }


def get_available_modules():
    if not AVAILABLE_MODULES:
        register_modules()
    return AVAILABLE_MODULES


def load_modules(parent_frame, config: dict, app=None) -> list:
    """Carrega e renderiza os módulos habilitados."""
    if not AVAILABLE_MODULES:
        register_modules()

    enabled = config.get("modules", {}).get("enabled", [])
    order = config.get("modules", {}).get("order", enabled)

    sorted_modules = [m for m in order if m in enabled]
    for m in enabled:
        if m not in sorted_modules:
            sorted_modules.append(m)

    loaded = []
    for i, module_id in enumerate(sorted_modules):
        if module_id not in AVAILABLE_MODULES:
            continue

        module_info = AVAILABLE_MODULES[module_id]
        module_class = module_info["class"]

        module = module_class(parent_frame, config, app)
        module.render()

        # Separador sutil entre módulos
        if i < len(sorted_modules) - 1:
            sep = ctk.CTkFrame(
                parent_frame,
                height=1,
                fg_color=("#d1d5db", "#262b33"),
                corner_radius=0
            )
            sep.pack(fill="x", padx=16, pady=6)

        loaded.append(module)

    return loaded
