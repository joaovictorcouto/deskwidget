"""
Gerenciador de tarefas To-Do.
Lida com CRUD e persistência das tarefas em todos.json.
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
TODOS_PATH = os.path.join(DATA_DIR, "todos.json")


def _load_data():
    """Carrega os dados do arquivo JSON."""
    if os.path.exists(TODOS_PATH):
        try:
            with open(TODOS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {"todos": []}


def _save_data(data):
    """Salva os dados no arquivo JSON."""
    with open(TODOS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_all_todos():
    """Retorna todas as tarefas."""
    data = _load_data()
    return data.get("todos", [])


def get_pending_todos():
    """Retorna tarefas não concluídas."""
    todos = get_all_todos()
    return [t for t in todos if not t.get("done", False)]


def get_done_todos():
    """Retorna tarefas concluídas."""
    todos = get_all_todos()
    return [t for t in todos if t.get("done", False)]


def add_todo(text: str) -> dict:
    """Adiciona uma nova tarefa."""
    data = _load_data()
    todo = {
        "id": str(uuid.uuid4()),
        "text": text.strip(),
        "done": False,
        "created_at": datetime.now().isoformat(),
        "done_at": None
    }
    data["todos"].append(todo)
    _save_data(data)
    return todo


def update_todo_text(todo_id: str, new_text: str):
    """Atualiza o texto de uma tarefa."""
    data = _load_data()
    for todo in data["todos"]:
        if todo["id"] == todo_id:
            todo["text"] = new_text.strip()
            break
    _save_data(data)


def toggle_todo_done(todo_id: str) -> bool:
    """Marca/desmarca uma tarefa como concluída. Retorna o novo estado."""
    data = _load_data()
    new_done = False
    for todo in data["todos"]:
        if todo["id"] == todo_id:
            todo["done"] = not todo["done"]
            todo["done_at"] = datetime.now().isoformat() if todo["done"] else None
            new_done = todo["done"]
            break
    _save_data(data)
    return new_done


def remove_todo(todo_id: str):
    """Remove uma tarefa pelo ID."""
    data = _load_data()
    data["todos"] = [t for t in data["todos"] if t["id"] != todo_id]
    _save_data(data)


def clear_done_todos():
    """Remove todas as tarefas concluídas."""
    data = _load_data()
    data["todos"] = [t for t in data["todos"] if not t.get("done", False)]
    _save_data(data)


def save_all_todos(todos_list: list):
    """Salva a lista completa de tarefas (usado pelo módulo para salvar em batch)."""
    _save_data({"todos": todos_list})

def reorder_todos(new_order_ids: list):
    """Reordena as tarefas pendentes de acordo com a lista de IDs passada."""
    data = _load_data()
    todos = data.get("todos", [])
    
    pending = [t for t in todos if not t.get("done", False)]
    done = [t for t in todos if t.get("done", False)]
    
    order_map = {uid: i for i, uid in enumerate(new_order_ids)}
    
    # Ordena as pendentes: se não estiver no mapa, vai para o final
    pending.sort(key=lambda t: order_map.get(t["id"], 999999))
    
    data["todos"] = pending + done
    _save_data(data)
