import { useReadContracts } from 'wagmi';
import { type Address } from 'viem';
import { ERC20_ABI } from '../config/erc20';
import { usePaymentToken } from './useJobs';

export interface TokenMeta {
  address: Address;
  symbol: string;
  decimals: number;
}

/** Metadatos (symbol, decimals) del token de pago configurado en el marketplace. */
export function useTokenMeta(): { data: TokenMeta | undefined; isLoading: boolean } {
  const { data: token } = usePaymentToken();

  const { data, isLoading } = useReadContracts({
    allowFailure: false,
    contracts: token
      ? [
          { address: token, abi: ERC20_ABI, functionName: 'symbol' },
          { address: token, abi: ERC20_ABI, functionName: 'decimals' },
        ]
      : [],
    query: { enabled: Boolean(token) },
  });

  if (!token || !data) return { data: undefined, isLoading };
  const [symbol, decimals] = data as [string, number];
  return { data: { address: token, symbol, decimals: Number(decimals) }, isLoading };
}

/** allowance del owner hacia el marketplace + balance, para el flujo approve → fund. */
export function useTokenAllowance(token: Address | undefined, owner: Address | undefined, spender: Address) {
  return useReadContracts({
    allowFailure: false,
    contracts:
      token && owner
        ? [
            { address: token, abi: ERC20_ABI, functionName: 'allowance', args: [owner, spender] },
            { address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] },
          ]
        : [],
    query: { enabled: Boolean(token && owner), refetchInterval: 4000 },
  });
}
