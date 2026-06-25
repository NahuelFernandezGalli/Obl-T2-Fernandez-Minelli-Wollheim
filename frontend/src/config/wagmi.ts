import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http, fallback } from 'viem';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID no está definido en .env.local');
}

// RPC de lectura. El público por defecto limita las consultas de eventos (getLogs) cuando hay
// actividad; por eso preferimos el RPC propio (Alchemy) si está configurado, y si no, un fallback
// de gateways públicos que sí soportan lecturas históricas.
const customRpc = import.meta.env.VITE_SEPOLIA_RPC_URL as string | undefined;

const sepoliaTransport = customRpc
  ? http(customRpc)
  : fallback([
      http('https://sepolia.gateway.tenderly.co'),
      http(), // RPC por defecto de la cadena (último recurso)
    ]);

export const wagmiConfig = getDefaultConfig({
  appName: 'Job Marketplace',
  projectId,
  chains: [sepolia],
  transports: { [sepolia.id]: sepoliaTransport },
  ssr: false,
});
