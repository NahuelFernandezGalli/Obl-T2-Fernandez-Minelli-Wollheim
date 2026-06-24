import { useReadContract } from 'wagmi';
import { type Address, type Hex } from 'viem';
import { JOBMARKETPLACE_ADDRESS, JOBMARKETPLACE_ABI } from '../config/marketplace';

const REFETCH = { refetchInterval: 4000 } as const;

export interface Job {
  client: Address;
  evaluator: Address;
  provider: Address;
  budget: bigint;
  expiresAt: bigint;
  status: number;
  deliverableRef: Hex;
  description: string;
}

/** Cantidad total de trabajos. El Tablero itera de 0..jobCount-1. */
export function useJobCount() {
  return useReadContract({
    address: JOBMARKETPLACE_ADDRESS,
    abi: JOBMARKETPLACE_ABI,
    functionName: 'jobCount',
    query: REFETCH,
  });
}

/** Token ERC-20 de pago configurado en el contrato. */
export function usePaymentToken() {
  return useReadContract({
    address: JOBMARKETPLACE_ADDRESS,
    abi: JOBMARKETPLACE_ABI,
    functionName: 'token',
    query: { refetchInterval: 30000 },
  });
}

/** Lee el struct completo de un trabajo y lo normaliza a `Job`. */
export function useJob(jobId: bigint | undefined) {
  const result = useReadContract({
    address: JOBMARKETPLACE_ADDRESS,
    abi: JOBMARKETPLACE_ABI,
    functionName: 'jobs',
    args: jobId === undefined ? undefined : [jobId],
    query: { ...REFETCH, enabled: jobId !== undefined },
  });

  return { ...result, data: normalizeJob(result.data) };
}

// viem puede devolver tupla u objeto según versión — manejamos ambos (igual que la Entrega 2).
function normalizeJob(raw: unknown): Job | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const t = raw as unknown[];
    return {
      client: t[0] as Address,
      evaluator: t[1] as Address,
      provider: t[2] as Address,
      budget: t[3] as bigint,
      expiresAt: t[4] as bigint,
      status: Number(t[5]),
      deliverableRef: t[6] as Hex,
      description: t[7] as string,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    client: o.client as Address,
    evaluator: o.evaluator as Address,
    provider: o.provider as Address,
    budget: o.budget as bigint,
    expiresAt: o.expiresAt as bigint,
    status: Number(o.status),
    deliverableRef: o.deliverableRef as Hex,
    description: o.description as string,
  };
}
