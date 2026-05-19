"""
Animações de expansão e retração do widget flutuante.
Usa easing ease-out para expansão e ease-in para retração.
"""

import math


def ease_out(t: float) -> float:
    """Easing ease-out: rápido no início, desacelera no final."""
    return 1 - (1 - t) ** 3


def ease_in(t: float) -> float:
    """Easing ease-in: lento no início, acelera no final."""
    return t ** 3


def calculate_steps(start: int, end: int, num_steps: int, easing_func) -> list:
    """
    Calcula os valores intermediários da animação.

    Args:
        start: Largura inicial.
        end: Largura final.
        num_steps: Número de passos da animação.
        easing_func: Função de easing a aplicar.

    Returns:
        Lista de larguras intermediárias (inteiros).
    """
    steps = []
    for i in range(1, num_steps + 1):
        t = i / num_steps
        eased = easing_func(t)
        value = start + (end - start) * eased
        steps.append(int(round(value)))
    return steps


class WidgetAnimator:
    """Controlador de animações do widget flutuante."""

    ANIMATION_STEPS = 10
    ANIMATION_INTERVAL_MS = 20  # 200ms total (10 × 20ms)

    def __init__(self, widget_window):
        """
        Args:
            widget_window: Referência ao Toplevel do widget flutuante.
        """
        self.window = widget_window
        self._animation_id = None
        self._animating = False

    @property
    def is_animating(self):
        return self._animating

    def animate_expand(self, collapsed_w: int, expanded_w: int, on_complete=None):
        """Anima expansão do widget (ease-out)."""
        self._cancel_animation()
        steps = calculate_steps(collapsed_w, expanded_w, self.ANIMATION_STEPS, ease_out)
        self._run_steps(steps, 0, on_complete)

    def animate_collapse(self, expanded_w: int, collapsed_w: int, on_complete=None):
        """Anima retração do widget (ease-out reverso)."""
        self._cancel_animation()
        steps = calculate_steps(expanded_w, collapsed_w, self.ANIMATION_STEPS, ease_out)
        self._run_steps(steps, 0, on_complete)

    def _run_steps(self, steps: list, index: int, on_complete=None):
        """Executa os passos de animação sequencialmente."""
        if index >= len(steps):
            self._animating = False
            if on_complete:
                on_complete()
            return

        self._animating = True
        width = steps[index]

        try:
            self.window.set_width(width)
        except Exception:
            self._animating = False
            return

        self._animation_id = self.window.win.after(
            self.ANIMATION_INTERVAL_MS,
            lambda: self._run_steps(steps, index + 1, on_complete)
        )

    def _cancel_animation(self):
        """Cancela animação em andamento."""
        if self._animation_id:
            try:
                self.window.win.after_cancel(self._animation_id)
            except Exception:
                pass
            self._animation_id = None
        self._animating = False
