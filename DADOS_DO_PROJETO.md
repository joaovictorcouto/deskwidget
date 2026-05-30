# 🔑 CoutoApps - Dados de Conexão, Credenciais e Licenciamento

Este documento centraliza com exclusividade todas as chaves de API, segredos de conexão de terceiros, dados do banco de dados e as licenças comerciais do projeto **DeskWidget**. Guarde este arquivo com segurança.

---

## ☁️ 1. Configurações do Supabase (Sincronização em Nuvem)
* **Project URL**: `https://zpawkjebkogozdfhqubp.supabase.co`
* **API Key (anon public)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXdramVia29nb3pkZmhxdWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjUzNTYsImV4cCI6MjA5NTQ0MTM1Nn0.DD6AEdm8qD65NjCOV987FutoAm8VEhdBdR-SK1aBQVM`
* **Identificador de Sincronização Unificado (Multi-Dispositivo)**: `coutoapps_joaovictor`

---

## 🦀 2. Criptografia de Licenças (Ed25519)
* **Chave Privada Oficial (Hex de 32 bytes)**:
  `669fef8751f44285f4e86eb86f28006304251da44be09c9df3113de4c2606751`
  *(Usada pelo script `gerar_licenca.js` para assinar digitalmente novas licenças).*
* **Chave Pública Oficial (Hex de 32 bytes)**:
  `cdb88da1f1703f98c1e549ab073f74d799c0ded793586ae3d6861ef6de8b1edf`
  *(Embutida no backend Rust em `security.rs` para verificação offline inquebrável).*

---

## 🤖 3. Integração com Telegram (Feedback e Logs)
* **Bot API Token**: `8904259622:AAEe_AK-7t-UILw0EIgklBT4Ba7626J1siE`
* **Chat ID**: `8049604881`

---

## 💻 4. Chaves de Licença Geradas

### 🖥️ PC Principal (Computador de Desenvolvimento)
* **HWID**: `2ea55ba034c52610f6d4e208d2156ac06baaaa218604ab6873740df49cbbfda4`
* **Chave Pro de Ativação**:
  ```text
  7b2268776964223a2232656135356261303334633532363130663664346532303864323135366163303662616161613231383630346162363837333734306466343963626266646134222c22706c616e223a2270726f5f62657461222c226c6963656e73655f6964223a22636f75746f617070735f6a6f616f766963746f72222c22637265617465645f6174223a22323032362d30352d32375431343a35303a30392e3637335a227d.1a7cc90d41dc8dffe677d8d7f42abfcba90d97068015ff3863fdfa934c52b923d4fa6c84dcd236126d236a7ac865d64ec1fb8372dfa000cc217597824d62f20a
  ```

---

*Nota: Toda vez que precisar gerar uma licença para o segundo computador ou outros dispositivos, use o comando:*
`node gerar_licenca.js <HWID_DO_DISPOSITIVO>`
