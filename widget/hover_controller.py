"""
Controlador de hover do widget flutuante.
Gerencia a lógica de mouse enter/leave e o timer de recolhimento.
"""


class HoverController:
    """Gerencia o estado de hover e o delay de recolhimento."""

    def __init__(self, widget, collapse_delay_ms: int = 1000):
        """
        Args:
            widget: Referência ao FloatingWidget.
            collapse_delay_ms: Tempo em ms antes de recolher após mouse sair.
        """
        self.widget = widget
        self.collapse_delay_ms = collapse_delay_ms
        self._collapse_timer = None
        self._mouse_inside = False

    @property
    def mouse_inside(self):
        return self._mouse_inside

    def on_enter(self, event=None):
        """Mouse entrou no widget."""
        self._mouse_inside = True
        self._cancel_collapse_timer()
        if not self.widget.is_expanded:
            self.widget.expand()

    def on_leave(self, event=None):
        """Mouse saiu do widget."""
        self._mouse_inside = False
        self._start_collapse_timer()

    def _start_collapse_timer(self):
        """Inicia o timer de recolhimento."""
        self._cancel_collapse_timer()
        self._collapse_timer = self.widget.win.after(
            self.collapse_delay_ms,
            self._try_collapse
        )

    def _try_collapse(self):
        """Tenta recolher o widget se o mouse não estiver dentro."""
        if not self._mouse_inside and self.widget.is_expanded:
            self.widget.collapse()
        self._collapse_timer = None

    def _cancel_collapse_timer(self):
        """Cancela o timer de recolhimento."""
        if self._collapse_timer:
            try:
                self.widget.win.after_cancel(self._collapse_timer)
            except Exception:
                pass
            self._collapse_timer = None

    def update_delay(self, new_delay_ms: int):
        """Atualiza o delay de recolhimento."""
        self.collapse_delay_ms = new_delay_ms
