import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import type { ReactNode } from 'react';

interface ConnectGateProps {
  children: ReactNode;
}

export function ConnectGate({ children }: ConnectGateProps) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="connect-gate">
        <p>Conectá tu wallet para operar el marketplace.</p>
        <ConnectButton />
      </div>
    );
  }

  return <>{children}</>;
}
