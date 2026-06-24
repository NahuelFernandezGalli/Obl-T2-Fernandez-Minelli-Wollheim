import { Link } from 'react-router-dom';
import { useJobCount, useJob } from '../hooks/useJobs';
import { useTokenMeta } from '../hooks/useToken';
import { formatAddress, formatAmount, statusLabel, statusClass } from '../lib/format';

export function JobBoard() {
  const { data: count, isLoading } = useJobCount();
  const { data: token } = useTokenMeta();

  if (isLoading || count === undefined) {
    return <p className="muted">Cargando trabajos…</p>;
  }

  const total = Number(count);

  if (total === 0) {
    return (
      <div className="panel">
        <h2>Tablero de trabajos</h2>
        <p className="muted">No hay trabajos publicados todavía.</p>
        <Link to="/publicar">Publicar el primero →</Link>
      </div>
    );
  }

  const ids = Array.from({ length: total }, (_, i) => total - 1 - i); // nuevos primero

  return (
    <section>
      <h2>Tablero de trabajos</h2>
      <div className="job-list">
        {ids.map((id) => (
          <JobCard key={id} jobId={BigInt(id)} decimals={token?.decimals} symbol={token?.symbol} />
        ))}
      </div>
    </section>
  );
}

function JobCard({
  jobId,
  decimals,
  symbol,
}: {
  jobId: bigint;
  decimals?: number;
  symbol?: string;
}) {
  const { data: job } = useJob(jobId);

  if (!job) {
    return (
      <div className="job-card">
        <span className="muted">Cargando #{jobId.toString()}…</span>
      </div>
    );
  }

  return (
    <Link to={`/job/${jobId.toString()}`} className="job-card">
      <div className="job-card-header">
        <span className="job-id">#{jobId.toString()}</span>
        <span className={`status-badge ${statusClass(job.status)}`}>{statusLabel(job.status)}</span>
      </div>
      <span className="job-desc">{job.description || '(sin descripción)'}</span>
      <span className="muted">
        Budget: {decimals !== undefined ? formatAmount(job.budget, decimals, symbol) : `${job.budget} (raw)`}
      </span>
      <span className="muted">Cliente: <code>{formatAddress(job.client)}</code></span>
    </Link>
  );
}
