"""
Gerenciador de lembretes.
Lida com CRUD e persistência dos lembretes em reminders.json.
"""

import os
import sys
import json
import uuid
from datetime import datetime


def _get_data_dir():
    localappdata = os.getenv("LOCALAPPDATA") or os.path.expanduser("~\\AppData\\Local")
    path = os.path.join(localappdata, "DeskWidget")
    os.makedirs(path, exist_ok=True)
    return path


DATA_DIR = _get_data_dir()
REMINDERS_PATH = os.path.join(DATA_DIR, "reminders.json")


def _load_data():
    """Carrega os dados do arquivo JSON."""
    if os.path.exists(REMINDERS_PATH):
        try:
            with open(REMINDERS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {"reminders": []}


def _save_data(data):
    """Salva os dados no arquivo JSON."""
    with open(REMINDERS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_all_reminders():
    """Retorna todos os lembretes."""
    data = _load_data()
    return data.get("reminders", [])


def get_pending_reminders():
    """Retorna lembretes pendentes ou adiados."""
    reminders = get_all_reminders()
    return [r for r in reminders if r.get("status") in ("pending", "snoozed")]


def get_history_reminders():
    """Retorna lembretes disparados ou dispensados (histórico)."""
    reminders = get_all_reminders()
    return [r for r in reminders if r.get("status") in ("fired", "dismissed")]


def add_reminder(title: str, dt: datetime) -> dict:
    """Adiciona um novo lembrete."""
    data = _load_data()
    reminder = {
        "id": str(uuid.uuid4()),
        "title": title.strip(),
        "datetime": dt.isoformat(),
        "status": "pending",
        "snoozed_until": None,
        "fired_at": None,
        "created_at": datetime.now().isoformat()
    }
    data["reminders"].append(reminder)
    _save_data(data)
    return reminder


def update_reminder(reminder_id: str, title: str, dt: datetime):
    """Atualiza um lembrete existente."""
    data = _load_data()
    for reminder in data["reminders"]:
        if reminder["id"] == reminder_id:
            reminder["title"] = title.strip()
            reminder["datetime"] = dt.isoformat()
            break
    _save_data(data)

def update_status(reminder_id: str, status: str, snoozed_until: str = None):
    """Atualiza o status de um lembrete."""
    data = _load_data()
    for reminder in data["reminders"]:
        if reminder["id"] == reminder_id:
            reminder["status"] = status
            if status == "fired":
                reminder["fired_at"] = datetime.now().isoformat()
            if snoozed_until:
                reminder["snoozed_until"] = snoozed_until
            else:
                reminder["snoozed_until"] = None
            break
    _save_data(data)


def cancel_reminder(reminder_id: str):
    """Cancela (remove) um lembrete pendente."""
    data = _load_data()
    data["reminders"] = [r for r in data["reminders"] if r["id"] != reminder_id]
    _save_data(data)


def clear_history():
    """Remove todos os lembretes do histórico (fired/dismissed)."""
    data = _load_data()
    data["reminders"] = [
        r for r in data["reminders"]
        if r.get("status") in ("pending", "snoozed")
    ]
    _save_data(data)


def get_due_reminders():
    """Retorna lembretes que devem disparar agora."""
    now = datetime.now()
    pending = get_pending_reminders()
    due = []
    for r in pending:
        if r["status"] == "snoozed" and r.get("snoozed_until"):
            target = datetime.fromisoformat(r["snoozed_until"])
        else:
            target = datetime.fromisoformat(r["datetime"])

        if target <= now:
            due.append(r)
    return due
