import { useReadContract, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
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

/** Datos estáticos de un trabajo tal como salieron del evento JobCreated. */
export interface JobCreatedSummary {
  jobId: bigint;
  client: Address;
  budget: bigint;
  description: string;
}

/** Cantidad total de trabajos (lectura directa del contador del contrato). */
export function useJobCount() {
  return useReadContract({
    address: JOBMARKETPLACE_ADDRESS,
    abi: JOBMARKETPLACE_ABI,
    functionName: 'jobCount',
    query: REFETCH,
  });
}

/**
 * Lista todos los trabajos leyendo los eventos `JobCreated` (como pide la consigna).
 * Los eventos dan los datos de creación; el estado vivo de cada job se lee aparte con `useJob`.
 */
export function useJobCreatedEvents() {
  const client = usePublicClient();

  return useQuery({
    queryKey: ['jobCreatedEvents', JOBMARKETPLACE_ADDRESS],
    enabled: Boolean(client),
    refetchInterval: 8000,
    queryFn: async (): Promise<JobCreatedSummary[]> => {
      if (!client) return [];
      const logs = await client.getContractEvents({
        address: JOBMARKETPLACE_ADDRESS,
        abi: JOBMARKETPLACE_ABI,
        eventName: 'JobCreated',
        fromBlock: 0n,
        toBlock: 'latest',
      });

      return logs
        .map((log) => ({
          jobId: log.args.jobId as bigint,
          client: log.args.client as Address,
          budget: log.args.budget as bigint,
          description: log.args.description as string,
        }))
        .sort((a, b) => (a.jobId < b.jobId ? 1 : -1)); // más nuevos primero
    },
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
