# 🎨 Web3 Escrow Frontend - Next.js Marketplace

A interface da plataforma foi projetada para ser intuitiva, removendo a complexidade da Blockchain para o usuário final, enquanto mantém a segurança descentralizada no core da aplicação.

## 💻 Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** TailwindCSS (Design Moderno & Responsivo)
- **Web3 Engine:** Wagmi + Viem (Provedores de conexão e hooks de contrato)
- **State Management:** TanStack Query (React Query) para sincronização de dados.
- **Real-time:** Socket.io-client para chat e notificações de eventos de rede.

---

## 🌟 Diferenciais Técnicos

### 1. 🛡️ Workroom de Negociação

Uma sala de trabalho completa para cada Job, onde cliente e freelancer podem:

- Negociar via chat em tempo real.
- Visualizar o status do contrato inteligente (Máquina de Estados).
- Verificar o valor **real** bloqueado na Blockchain em tempo real.

### 2. ⚡ Gateway Híbrido (Crypto & Pix)

Implementamos uma lógica de pagamento flexível:

- **Modo Crypto:** Conexão direta via MetaMask/WalletConnect para pagar em MATIC.
- **Modo Pix:** Integração com o backend para gerar uma carteira efêmera, permitindo o financiamento do Escrow sem exigir que o cliente possua cripto previamente.

### 3. 📊 Feedback Visual da Blockchain

- Uso de `useWaitForTransactionReceipt` para exibir loaders progessivos durante as confirmações da rede Polygon.
- Links diretos para o **PolygonScan** em cada transação realizada.

---

## ⚙️ Configuração

### Variáveis de Ambiente (`.env`)

Certifique-se de configurar as chaves de contrato geradas no deploy:

env
NEXT_PUBLIC_ESCROW_ADDRESS="0x..."
NEXT_PUBLIC_RPC_URL="http://127.0.0.1:8545"
NEXT_PUBLIC_TOKEN_ADDRESS="0x..."

🚀 Comandos

Instalação

npm install

Desenvolvimento

npm run dev

Produção

npm run build
npm run start

🧭 Estrutura de Pastas
/app/job/[id]: A "Workroom" principal com lógica de Escrow.
/app/staking: Interface de recompensas para detentores do token.
/components: Componentes reutilizáveis (Banners de status, modais de pagamento).
/constants: ABIs e Endereços dos contratos sincronizados.

🔒 Segurança no Frontend
Proteção de Rotas: Verificação de carteira conectada para acessar páginas de trabalho.
Sanitização de Inputs: Tratamento de valores MATIC e BRL para evitar erros de overflow no Smart Contract.
Tratamento de Erros: Captura e exibição amigável de erros de "Revert" da Redeser (ex: Gas Limit, falta de fundos).

```

```
