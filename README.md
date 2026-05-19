# DeskWidget — Atalho Flutuante Modular para Windows

Widget flutuante retrátil na borda da tela com módulos selecionáveis (Lembretes e To-Do).

## Requisitos

- **Python 3.11+** (baixe em https://www.python.org/downloads/)
  - ⚠️ Marque "Add Python to PATH" durante a instalação!

## Instalação

```powershell
# 1. Instale as dependências
pip install -r requirements.txt

# 2. Execute o aplicativo
python main.py
```

## Funcionalidades

### Widget Flutuante
- Borda de 8px recolhida no canto direito da tela
- Expansão suave ao passar o mouse (animação 200ms)
- Recolhimento automático após 1 segundo
- Always-on-top, sem barra de título, translúcido

### 🔔 Módulo de Lembretes
- Formulário com nome, data (calendário) e hora (spinbox)
- Validação de horário (bloqueia datas/horas passadas)
- Popup no canto inferior direito ao disparar
- Opções de adiar (5, 15, 30 minutos) ou dispensar
- Janela de histórico com abas (Agendados / Histórico)

### 📋 Módulo To-Do
- Campos dinâmicos com checkbox
- Enter → nova tarefa | Backspace em vazio → remove
- Seção de concluídas colapsável
- Salvamento automático

### ⚙️ Configurações (via tray icon)
- Ativar/desativar módulos
- Posição (esquerda/direita)
- Opacidade (50-100%)
- Delay de recolhimento

## Estrutura

```
deskwidget/
├── main.py                 ← Ponto de entrada
├── config.json             ← Configurações
├── widget/                 ← Widget flutuante
├── modules/                ← Módulos (lembretes, to-do)
├── core/                   ← Lógica de negócio
└── ui/                     ← Janelas de UI
```
