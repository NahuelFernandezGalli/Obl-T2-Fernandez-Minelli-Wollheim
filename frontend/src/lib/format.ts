import { formatUnits, type Address } from 'viem';
import { JOB_STATUS_LABEL, JobStatus } from '../config/marketplace';

export function formatAddress(address: Address | undefined): string {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatAmount(value: bigint, decimals: number, symbol?: string): string {
  const raw = formatUnits(value, decimals);
  const n = Number(raw);
  const pretty = Number.isFinite(n) ? n.toLocaleString('es-UY', { maximumFractionDigits: 4 }) : raw;
  return symbol ? `${pretty} ${symbol}` : pretty;
}

export function statusLabel(status: JobStatus | number): string {
  return JOB_STATUS_LABEL[status as JobStatus] ?? 'Desconocido';
}

// Clave CSS para el badge de estado: status-abierto, status-fondeado, etc.
export function statusClass(status: JobStatus | number): string {
  return `status-${statusLabel(status).toLowerCase()}`;
}

export function formatExpiry(expiresAt: bigint): string {
  if (expiresAt === 0n) return '—';
  const date = new Date(Number(expiresAt) * 1000);
  return date.toLocaleString('es-UY');
}

export function isExpired(expiresAt: bigint): boolean {
  if (expiresAt === 0n) return false;
  return Date.now() / 1000 > Number(expiresAt);
}
