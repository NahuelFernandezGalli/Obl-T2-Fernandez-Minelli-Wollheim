# Obligatorio T2 — Fernandez, Minelli, Wollheim

Marketplace de trabajos freelance con pagos en ERC-20 y evaluación por MultiSig, desplegado en Sepolia.

## Contratos

| Contrato | Descripción |
|---|---|
| `JobMarketplace` | Contrato principal. Gestiona ciclo de vida de trabajos (Open → Funded → Submitted → Completed/Rejected/Expired). |
| `MockERC20` | Token ERC-20 de prueba con `mint` público. |
| `MultiSig` | Billetera multifirma reutilizada de la Entrega 2. Permite usar un contrato como evaluador. |

## Configuración

Crear un archivo `.env` en la raíz con:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
SEPOLIA_PRIVATE_KEY=0xTU_CLAVE_PRIVADA
```

- **`SEPOLIA_RPC_URL`**: endpoint de Alchemy para Sepolia (requiere cuenta en [alchemy.com](https://alchemy.com))
- **`SEPOLIA_PRIVATE_KEY`**: clave privada de la wallet MetaMask (Ajustes → Administrar cuenta → Exportar clave privada). Asegurarse de tener ETH de Sepolia (faucet: [sepoliafaucet.com](https://sepoliafaucet.com)).

## Instalación y compilación

```bash
npm install
npm run compile
```

## Tests

```bash
npm test
```

40 tests cubren:
- **Happy path**: crear → fondear → entregar → completar
- **Rechazos**: cliente en Open, evaluador en Funded y Submitted
- **Expiración**: `claimRefund` desde Funded y Submitted, guards de estado y tiempo
- **Control de acceso**: todos los `revert` de autorización y estado
- **MultiSig como evaluador**: propuesta, threshold, ejecución y eventos

## Deploy en Sepolia

```bash
npx hardhat ignition deploy ignition/modules/JobMarketplace.ts --network sepolia
```

### Direcciones desplegadas

| Contrato | Red | Dirección |
|---|---|---|
| `MockERC20` | Sepolia | _pendiente de deploy_ |
| `JobMarketplace` | Sepolia | _pendiente de deploy_ |

## Decisiones de diseño

### Flujo de estados

```
Open → (fund) → Funded → (submit) → Submitted → (complete) → Completed
                    ↓ reject (eval)    ↓ reject (eval)
                  Rejected           Rejected
Open → reject (client) → Rejected
Funded/Submitted → (claimRefund, post-expiresAt) → Expired
```

### Patrón CEI + ReentrancyGuard

Las funciones `fund`, `complete`, `reject` y `claimRefund` siguen el patrón Checks-Effects-Interactions y están protegidas con `ReentrancyGuard` de OpenZeppelin para prevenir ataques de reentrada.

### `expiresAt` en lugar de duración

El campo `expiresAt` del job es un timestamp absoluto fijado en `createJob`. Esto evita ambigüedades sobre cuándo comienza a contar el plazo y permite al cliente elegir fechas específicas de vencimiento.

### Evaluador como dirección arbitraria

El campo `evaluator` acepta cualquier dirección, incluyendo contratos. Esto permite usar un MultiSig (u otro contrato DAO/governance) como evaluador sin cambios en el contrato.

### `deliverableRef` como bytes32

La referencia a la entrega se almacena como `bytes32` (hash IPFS u otro), manteniendo el contrato agnóstico al sistema de almacenamiento off-chain y reduciendo el costo de gas respecto a almacenar strings.
