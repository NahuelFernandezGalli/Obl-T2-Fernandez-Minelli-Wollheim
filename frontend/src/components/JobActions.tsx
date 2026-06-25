import { useEffect, useRef, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { isAddress, stringToHex, type Address, type Hex } from 'viem';
import { JOBMARKETPLACE_ADDRESS, JOBMARKETPLACE_ABI } from '../config/marketplace';
import { ERC20_ABI } from '../config/erc20';
import type { Job } from '../hooks/useJobs';
import type { TokenMeta } from '../hooks/useToken';
import { useTokenAllowance } from '../hooks/useToken';
import { storeDeliverable } from '../lib/deliverable';
import { isIpfsEnabled } from '../lib/ipfs';
import { decodeRevert } from '../lib/errors';

const ZERO_BYTES32: Hex = `0x${'0'.repeat(64)}`;

function reasonToBytes32(reason: string): Hex {
  if (reason.trim() === '') return ZERO_BYTES32;
  return stringToHex(reason.slice(0, 31), { size: 32 });
}

/**
 * Ejecuta una escritura, espera la confirmación de la tx y al confirmar invalida las queries
 * `onConfirmed` se dispara recién cuando la tx queda minada.
 */
function useAction() {
  const queryClient = useQueryClient();
  const { writeContract, isPending } = useWriteContract();
  const [error, setError] = useState('');
  const [hash, setHash] = useState<Hex | undefined>(undefined);
  const onConfirmedRef = useRef<(() => void) | undefined>(undefined);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    void queryClient.invalidateQueries();
    onConfirmedRef.current?.();
    onConfirmedRef.current = undefined;
    setHash(undefined);
  }, [isSuccess, queryClient]);

  function run(args: Parameters<typeof writeContract>[0], onConfirmed?: () => void) {
    setError('');
    onConfirmedRef.current = onConfirmed;
    writeContract(args, {
      onSuccess: (txHash) => setHash(txHash),
      onError: (e) => setError(decodeRevert(e)),
    });
  }

  return { run, isPending: isPending || isConfirming, error };
}

function mkt(functionName: string, args: readonly unknown[]) {
  return {
    address: JOBMARKETPLACE_ADDRESS,
    abi: JOBMARKETPLACE_ABI,
    functionName,
    args,
  } as Parameters<ReturnType<typeof useWriteContract>['writeContract']>[0];
}

export function SetProviderAction({ jobId }: { jobId: bigint }) {
  const [provider, setProvider] = useState('');
  const { run, isPending, error } = useAction();

  return (
    <div>
      <label className="form" style={{ marginBottom: '0.5rem' }}>
        Dirección del proveedor
        <input type="text" placeholder="0x..." value={provider} onChange={(e) => setProvider(e.target.value)} />
      </label>
      <div className="actions">
        <button
          disabled={isPending || !isAddress(provider.trim())}
          onClick={() => run(mkt('setProvider', [jobId, provider.trim() as Address]), () => setProvider(''))}
        >
          {isPending ? 'Enviando…' : 'Asignar proveedor'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function FundAction({
  jobId,
  job,
  token,
  account,
}: {
  jobId: bigint;
  job: Job;
  token: TokenMeta | undefined;
  account: Address;
}) {
  const { run, isPending, error } = useAction();
  const { data: allowanceData } = useTokenAllowance(token?.address, account, JOBMARKETPLACE_ADDRESS);

  if (!token) return <p className="muted">Cargando token de pago…</p>;

  const [allowance, balance] = (allowanceData as [bigint, bigint] | undefined) ?? [0n, 0n];
  const needsApprove = allowance < job.budget;
  const insufficient = balance < job.budget;

  return (
    <div>
      {insufficient && <p className="error">Balance insuficiente del token para fondear.</p>}
      <div className="actions">
        {needsApprove ? (
          <button
            disabled={isPending || insufficient}
            onClick={() =>
              run({
                address: token.address,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [JOBMARKETPLACE_ADDRESS, job.budget],
              })
            }
          >
            {isPending ? 'Enviando…' : '1) Aprobar tokens'}
          </button>
        ) : (
          <button disabled={isPending} onClick={() => run(mkt('fund', [jobId]))}>
            {isPending ? 'Enviando…' : '2) Fondear trabajo'}
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function SubmitAction({ jobId }: { jobId: bigint }) {
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const { run, isPending, error } = useAction();

  async function handleSubmit() {
    setUploading(true);
    try {
      const ref = await storeDeliverable(content); // sube off-chain, manda solo el ref
      run(mkt('submit', [jobId, ref]), () => setContent(''));
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || isPending;

  return (
    <div>
      <label className="form" style={{ marginBottom: '0.5rem' }}>
        Entregable ({isIpfsEnabled() ? 'se sube a IPFS' : 'se guarda en este navegador'}; on-chain viaja solo el ref)
        <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
      </label>
      <div className="actions">
        <button disabled={busy || content.trim() === ''} onClick={handleSubmit}>
          {uploading ? 'Subiendo…' : isPending ? 'Enviando…' : 'Enviar entrega'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function CompleteAction({ jobId }: { jobId: bigint }) {
  const [reason, setReason] = useState('');
  const { run, isPending, error } = useAction();

  return (
    <div>
      <label className="form" style={{ marginBottom: '0.5rem' }}>
        Atestación (opcional, máx 31 chars)
        <input type="text" maxLength={31} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="actions">
        <button disabled={isPending} onClick={() => run(mkt('complete', [jobId, reasonToBytes32(reason)]))}>
          {isPending ? 'Enviando…' : 'Aprobar y liberar pago'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function RejectAction({ jobId }: { jobId: bigint }) {
  const [reason, setReason] = useState('');
  const { run, isPending, error } = useAction();

  return (
    <div>
      <label className="form" style={{ marginBottom: '0.5rem' }}>
        Motivo del rechazo (opcional, máx 31 chars)
        <input type="text" maxLength={31} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="actions">
        <button className="btn-danger" disabled={isPending} onClick={() => run(mkt('reject', [jobId, reasonToBytes32(reason)]))}>
          {isPending ? 'Enviando…' : 'Rechazar'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function ClaimRefundAction({ jobId }: { jobId: bigint }) {
  const { run, isPending, error } = useAction();
  return (
    <div>
      <div className="actions">
        <button disabled={isPending} onClick={() => run(mkt('claimRefund', [jobId]))}>
          {isPending ? 'Enviando…' : 'Reclamar reembolso'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
