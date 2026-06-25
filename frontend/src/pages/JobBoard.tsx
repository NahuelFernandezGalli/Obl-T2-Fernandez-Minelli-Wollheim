import { Link } from 'react-router-dom';
import { useJobCreatedEvents, useJob, type JobCreatedSummary } from '../hooks/useJobs';
import { useTokenMeta } from '../hooks/useToken';
import { formatAddress, formatAmount, statusLabel, statusClass } from '../lib/format';

export function JobBoard() {
  const { data: jobs, isLoading, isError } = useJobCreatedEvents();
  const { data: token } = useTokenMeta();

  if (isLoading) {
    return <p className="muted">Cargando trabajos…</p>;
  }

  if (isError) {
    return (
      <div className="panel">
        <h2>Tablero de trabajos</h2>
        <p className="error">No se pudieron leer los eventos. ¿Está configurada la dirección del contrato?</p>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="panel">
        <h2>Tablero de trabajos</h2>
        <p className="muted">No hay trabajos publicados todavía.</p>
        <Link to="/publicar">Publicar el primero →</Link>
      </div>
    );
  }

  return (
    <section>
      <h2>Tablero de trabajos</h2>
      <div className="job-list">
        {jobs.map((job) => (
          <JobCard key={job.jobId.toString()} job={job} decimals={token?.decimals} symbol={token?.symbol} />
        ))}
      </div>
    </section>
  );
}

function JobCard({
  job,
  decimals,
  symbol,
}: {
  job: JobCreatedSummary;
  decimals?: number;
  symbol?: string;
}) {
  // Datos de la tarjeta vienen del evento JobCreated; el badge de estado es lectura viva.
  const { data: live } = useJob(job.jobId);
  const status = live?.status;

  return (
    <Link to={`/job/${job.jobId.toString()}`} className="job-card">
      <div className="job-card-header">
        <span className="job-id">#{job.jobId.toString()}</span>
        {status !== undefined ? (
          <span className={`status-badge ${statusClass(status)}`}>{statusLabel(status)}</span>
        ) : (
          <span className="status-badge muted">…</span>
        )}
      </div>
      <span className="job-desc">{job.description || '(sin descripción)'}</span>
      <span className="muted">
        Budget: {decimals !== undefined ? formatAmount(job.budget, decimals, symbol) : `${job.budget} (raw)`}
      </span>
      <span className="muted">Cliente: <code>{formatAddress(job.client)}</code></span>
    </Link>
  );
}
