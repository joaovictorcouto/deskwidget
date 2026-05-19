"""
Scheduler de lembretes.
Thread separada que verifica lembretes a cada 30 segundos.
"""

import threading
from datetime import datetime
from core import reminder_manager


class ReminderScheduler:
    """Verificador periódico de lembretes pendentes."""

    CHECK_INTERVAL_MS = 30000  # 30 segundos

    def __init__(self, root, config):
        """
        Args:
            root: Janela principal do tkinter.
            config: Configuração do app.
        """
        self.root = root
        self.config = config
        self._timer_id = None
        self._running = False

    def start(self):
        """Inicia a verificação periódica."""
        self._running = True
        self._check()

    def stop(self):
        """Para a verificação."""
        self._running = False
        if self._timer_id:
            try:
                self.root.after_cancel(self._timer_id)
            except Exception:
                pass
            self._timer_id = None

    def _check(self):
        """Verifica lembretes que devem disparar agora."""
        if not self._running:
            return

        try:
            due = reminder_manager.get_due_reminders()
            for reminder in due:
                self._fire_reminder(reminder)
        except Exception as e:
            print(f"Erro ao verificar lembretes: {e}")

        # Agenda próxima verificação
        self._timer_id = self.root.after(self.CHECK_INTERVAL_MS, self._check)

    def _fire_reminder(self, reminder: dict):
        """Dispara um popup para o lembrete."""
        from core.reminder_popup import ReminderPopup

        # Marca como disparado
        reminder_manager.update_status(reminder["id"], "fired")

        # Cria popup
        popup = ReminderPopup(
            self.root,
            reminder,
            self.config,
            on_dismiss=lambda r=reminder: self._on_dismiss(r),
            on_snooze=lambda minutes, r=reminder: self._on_snooze(r, minutes)
        )

    def _on_dismiss(self, reminder: dict):
        """Callback quando o lembrete é dispensado."""
        reminder_manager.update_status(reminder["id"], "dismissed")

    def _on_snooze(self, reminder: dict, minutes: int):
        """Callback quando o lembrete é adiado."""
        from datetime import timedelta
        new_time = datetime.now() + timedelta(minutes=minutes)
        reminder_manager.update_status(
            reminder["id"],
            "snoozed",
            snoozed_until=new_time.isoformat()
        )

    def update_config(self, config):
        """Atualiza a configuração do scheduler."""
        self.config = config
