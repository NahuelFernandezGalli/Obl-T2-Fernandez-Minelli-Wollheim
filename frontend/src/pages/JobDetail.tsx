import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { type Address, type Hex } from 'viem';
import { useJob, type Job } from '../hooks/useJobs';
import { useTokenMeta, type TokenMeta } from '../hooks/useToken';
import { JobStatus, ZERO_ADDRESS } from '../config/marketplace';
import { formatAddress, formatAmount, statusLabel, statusClass, formatExpiry, isExpired } from '../lib/format';
import { loadDeliverable, isZeroRef } from '../lib/deliverable';
import {
  SetProviderAction,
  FundAction,
  RejectAction,
  SubmitAction,
  CompleteAction,
  ClaimRefundAction,
} from '../components/JobActions';

export function JobDetail() {
  const { id } = useParams();
  const { address } = useAccount();
  const jobId = id !== undefined ? BigInt(id) : undefined;

  const { data: job, isLoading } = useJob(jobId);
  const { data: token } = useTokenMeta();

  if (jobId === undefined) return <p className="error">Trabajo inválido.</p>;
  if (isLoading || !job) return <p className="muted">Cargando trabajo #{id}…</p>;

  return (
    <section>
      <Link to="/" className="btn-secondary" style={{ display: 'inline-block', padding: '0.3rem 0.8rem', borderRadius: 8, marginBottom: '1rem' }}>
        ← Volver al tablero
      </Link>

      <div className="panel">
        <h2>
          Trabajo #{id}{' '}
          <span className={`status-badge ${statusClass(job.status)}`}>{statusLabel(job.status)}</span>
        </h2>
        <dl>
          <dt>Descripción</dt>
          <dd>{job.description || '—'}</dd>
          <dt>Budget</dt>
          <dd>{token ? formatAmount(job.budget, token.decimals, token.symbol) : `${job.budget} (raw)`}</dd>
          <dt>Cliente</dt>
          <dd><code>{formatAddress(job.client)}</code></dd>
          <dt>Evaluador</dt>
          <dd><code>{formatAddress(job.evaluator)}</code></dd>
          <dt>Proveedor</dt>
          <dd>{job.provider === ZERO_ADDRESS ? <span className="muted">sin asignar</span> : <code>{formatAddress(job.provider)}</code>}</dd>
          <dt>Expira</dt>
          <dd>{formatExpiry(job.expiresAt)}{isExpired(job.expiresAt) ? ' (expirado)' : ''}</dd>
        </dl>
      </div>

      <DeliverablePanel deliverableRef={job.deliverableRef} />

      <ActionPanel jobId={jobId} job={job} token={token} account={address} />
    </section>
  );
}

/**
 * Muestra el contenido del entregable (off-chain, en localStorage de este navegador).
 * On-chain solo está el hash `deliverableRef`; el evaluador necesita ver el contenido para decidir.
 */
function DeliverablePanel({ deliverableRef }: { deliverableRef: Hex }) {
  if (isZeroRef(deliverableRef)) return null;

  const content = loadDeliverable(deliverableRef);

  return (
    <div className="panel">
      <h2>Entregable</h2>
      <dl>
        <dt>Referencia (on-chain)</dt>
        <dd><code>{deliverableRef}</code></dd>
      </dl>
      {content !== null ? (
        <pre className="deliverable-content">{content}</pre>
      ) : (
        <p className="muted">
          El contenido no está en este navegador. El proveedor lo guardó localmente; para revisarlo,
          el evaluador debe abrir la app en el mismo navegador donde se hizo la entrega.
        </p>
      )}
    </div>
  );
}

function ActionPanel({
  jobId,
  job,
  token,
  account,
}: {
  jobId: bigint;
  job: Job;
  token: TokenMeta | undefined;
  account: Address | undefined;
}) {
  if (!account) return null;

  const me = account.toLowerCase();
  const isClient = job.client.toLowerCase() === me;
  const isProvider = job.provider !== ZERO_ADDRESS && job.provider.toLowerCase() === me;
  const isEvaluator = job.evaluator.toLowerCase() === me;
  const hasProvider = job.provider !== ZERO_ADDRESS;
  const expired = isExpired(job.expiresAt);

  const actions: React.ReactNode[] = [];

  // Cliente · Open · sin proveedor → asignar proveedor
  if (isClient && job.status === JobStatus.Open && !hasProvider) {
    actions.push(<SetProviderAction key="setProvider" jobId={jobId} />);
  }
  // Cliente · Open → fondear + rechazar
  if (isClient && job.status === JobStatus.Open) {
    actions.push(<FundAction key="fund" jobId={jobId} job={job} token={token} account={account} />);
    actions.push(<RejectAction key="rejectClient" jobId={jobId} />);
  }
  // Proveedor · Funded → enviar entrega
  if (isProvider && job.status === JobStatus.Funded) {
    actions.push(<SubmitAction key="submit" jobId={jobId} />);
  }
  // Evaluador · Submitted → aprobar (complete) + rechazar
  if (isEvaluator && job.status === JobStatus.Submitted) {
    actions.push(<CompleteAction key="complete" jobId={jobId} />);
    actions.push(<RejectAction key="rejectEval" jobId={jobId} />);
  }
  // Evaluador · Funded → puede rechazar
  if (isEvaluator && job.status === JobStatus.Funded) {
    actions.push(<RejectAction key="rejectEvalFunded" jobId={jobId} />);
  }
  // Cualquiera · Funded/Submitted expirado → reclamar reembolso
  if (expired && (job.status === JobStatus.Funded || job.status === JobStatus.Submitted)) {
    actions.push(<ClaimRefundAction key="refund" jobId={jobId} />);
  }

  return (
    <div className="panel">
      <h2>Acciones</h2>
      {job.evaluator !== ZERO_ADDRESS && !isEvaluator && job.status === JobStatus.Submitted && (
        <p className="muted">
          Si el evaluador es un contrato MultiSig, la aprobación se hace creando y ejecutando una
          propuesta en el MultiSig que llame a <code>complete()</code> de este trabajo.
        </p>
      )}
      {actions.length === 0 ? (
        <p className="muted">No tenés acciones disponibles para este trabajo en su estado actual.</p>
      ) : (
        actions
      )}
    </div>
  );
}
