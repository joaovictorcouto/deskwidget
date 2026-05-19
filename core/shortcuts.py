"""
Utilitário para configurar atalhos de teclado globais (Ctrl+A, Ctrl+Backspace, etc)
em campos de texto do Tkinter/CustomTkinter.
"""

import tkinter as tk
import re

def _ctrl_backspace(event):
    """Apaga a palavra inteira anterior ao cursor."""
    widget = event.widget
    
    # Verifica se é um widget de entrada de texto
    if not hasattr(widget, "get") or not hasattr(widget, "delete") or not hasattr(widget, "index"):
        return

    try:
        # Se houver texto selecionado, apenas apaga a seleção
        if hasattr(widget, "select_present") and widget.select_present():
            widget.delete("sel.first", "sel.last")
            return "break"
            
        # Pega a posição atual do cursor e o texto até o cursor
        cursor_pos = widget.index(tk.INSERT)
        text_before_cursor = widget.get()[:cursor_pos]
        
        # Regex para achar a última palavra (palavra seguida de espaços, ou apenas espaços)
        match = re.search(r'(\w+\W*|\W+)$', text_before_cursor)
        
        if match:
            start_delete = cursor_pos - len(match.group(0))
            widget.delete(start_delete, cursor_pos)
        else:
            # Fallback: deleta tudo até o início se não houver match
            widget.delete(0, cursor_pos)
            
        return "break" # Impede o comportamento padrão do Tkinter (inserir caractere estranho)
    except Exception:
        pass


def _select_all(event):
    """Seleciona todo o texto do campo (Ctrl + A)."""
    widget = event.widget
    try:
        # Para Tkinter Entry ou CustomTkinter Entry
        widget.select_range(0, tk.END)
        widget.icursor(tk.END)
        return "break"
    except AttributeError:
        try:
            # Fallback para Text widgets
            widget.tag_add(tk.SEL, "1.0", tk.END)
            widget.mark_set(tk.INSERT, "1.0")
            widget.see(tk.INSERT)
            return "break"
        except Exception:
            pass


def setup_global_shortcuts(root):
    """Aplica os atalhos de teclado em toda a aplicação."""
    # Control-BackSpace (Apagar palavra)
    root.bind_class("Entry", "<Control-BackSpace>", _ctrl_backspace)
    root.bind_class("TEntry", "<Control-BackSpace>", _ctrl_backspace)
    # Control-a ou Control-A (Selecionar Tudo)
    root.bind_class("Entry", "<Control-a>", _select_all)
    root.bind_class("Entry", "<Control-A>", _select_all)
    root.bind_class("TEntry", "<Control-a>", _select_all)
    root.bind_class("TEntry", "<Control-A>", _select_all)
