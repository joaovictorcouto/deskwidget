# 🧭 AI_CONTEXT.md - Guia de Contexto e Otimização para IA

> [!IMPORTANT]
> **LEIA ESTE ARQUIVO ANTES DE QUALQUER OUTRA AÇÃO NO PROJETO!**
> Este arquivo serve como o mapa de navegação e guia de comportamento para qualquer assistente de IA. Seu objetivo é otimizar a leitura do contexto, reduzir drasticamente o consumo de tokens e acelerar a compreensão do projeto.

---

## 🚫 REGRA CRÍTICA DE ESCOPO (LEGADO)
*   **FOCO EXCLUSIVO**: Todo o desenvolvimento ativo está na pasta `/main` (Tauri + React).
*   **PASTA IGNORADA**: A pasta `/electron-main` é **legado**. 
    *   **NUNCA** leia arquivos em `/electron-main`.
    *   **NUNCA** proponha alterações ou analise códigos em `/electron-main`.
    *   Trate-a como inexistente, a menos que explicitamente solicitado pelo usuário.

---

## ⚙️ Stack Tecnológica (Diretório `/main`)
*   **Frontend**: React 19 + Vite + Vanilla CSS (sem TailwindCSS por padrão, a menos que solicitado).
*   **UI & Interações**: `lucide-react` para ícones, `@hello-pangea/dnd` para drag-and-drop.
*   **Desktop Wrapper & Backend**: Tauri v2 (Rust).
*   **Persistência**: Camada de banco de dados nativa em Rust.

---

## 📂 Organização de Pastas e Arquivos Críticos

Abaixo está o mapa de navegação dos arquivos da pasta `/main` para orientar suas leituras incrementais:

```
/main
├── src/                      # Frontend (React)
│   ├── main.jsx              # Inicialização do React e setup global
│   ├── App.jsx               # Ponto de entrada do layout e roteamento/visões
│   ├── Widget.jsx            # [CRÍTICO (~68KB)] Interface principal do Widget (ler sob demanda)
│   ├── Settings.jsx          # [CRÍTICO (~37KB)] Tela de Configurações do App
│   ├── History.jsx           # [CRÍTICO (~19KB)] Visualização do histórico/registros
│   ├── Popup.jsx             # [CRÍTICO (~18KB)] Popups de ações rápidas e interações
│   ├── index.css             # Estilos globais e folha de design principal (~16KB)
│   ├── App.css               # Estilos complementares do App
│   ├── components/
│   │   └── CustomConfirm.jsx # Componente reutilizável de confirmação personalizada
│   └── utils/
│       └── audio.js          # Utilitário para reprodução de sons e feedbacks auditivos
│
└── src-tauri/                # Backend (Rust)
    ├── tauri.conf.json       # Configurações do app Tauri (permissões, janelas, plugins)
    └── src/
        ├── main.rs           # Ponto de entrada simples do binário
        ├── lib.rs            # [CRÍTICO (~25KB)] Definição de comandos IPC e ciclo de vida Tauri
        └── database.rs       # [CRÍTICO (~17KB)] Gerenciamento de banco de dados e consultas SQL/CRUD
```

---

## 🧠 Estratégia de Leitura Inteligente (Regras para a IA)

Para economizar tokens e tempo do usuário, siga estritamente estas diretrizes de leitura incremental:

### 1. Não faça varreduras completas no início
*   Ao entrar no projeto ou receber uma nova tarefa, **não abra todos os arquivos**.
*   Identifique a natureza da tarefa (Interface, Configurações, Persistência, etc.) usando o mapa de pastas acima.

### 2. Localização contextual (Grep antes de ler)
*   Se precisar saber onde uma função ou componente é usado, faça um `grep_search` focado em vez de abrir os arquivos.
*   **Não leia arquivos inteiros** se puder ler apenas a seção relevante. Por exemplo: se precisar entender um comando Tauri específico, busque o termo em `lib.rs` e abra apenas o intervalo de linhas correspondente.

### 3. Delimitação por tarefa
*   **UI/Estética do Widget**: Foque em `main/src/Widget.jsx` e `main/src/index.css`. Ignore o backend em Rust.
*   **Configurações/Opções**: Foque em `main/src/Settings.jsx` e, se necessário, nas chaves correspondentes no Rust (`database.rs`). Ignore o `Widget.jsx` e o `History.jsx`.
*   **Banco de Dados/Comandos Rust**: Foque em `main/src-tauri/src/database.rs` e `main/src-tauri/src/lib.rs`. Ignore completamente a pasta `main/src` (React) até que precise mapear a chamada do frontend.

---

## 🔄 Fluxo Recomendado de Análise e Modificação

1.  **Entender o Escopo**: Analisar o pedido do usuário e identificar qual o componente/arquivo responsável usando o mapa de arquivos crítico.
2.  **Busca Direcionada (Grep/Range)**: Buscar padrões com `grep_search` ou visualizar intervalos específicos de linhas usando `view_file` (com `StartLine` e `EndLine`).
3.  **Propor Alterações Focadas**: Realizar edições cirúrgicas usando as ferramentas de substituição parcial, mantendo todos os comentários originais intactos.
4.  **Validar**: Compilar ou testar as alterações de forma isolada e local.
