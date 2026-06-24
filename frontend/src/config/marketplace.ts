import { type Address } from 'viem';

// Dirección del contrato JobMarketplace en Sepolia.
// Se completa con VITE_JOBMARKETPLACE_ADDRESS cuando se despliegue.
export const JOBMARKETPLACE_ADDRESS = (import.meta.env.VITE_JOBMARKETPLACE_ADDRESS ??
  '0x0000000000000000000000000000000000000000') as Address;

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

// Estados del Job — DEBE coincidir con el enum del contrato (Fase 0).
export const JobStatus = {
  Open: 0,
  Funded: 1,
  Submitted: 2,
  Completed: 3,
  Rejected: 4,
  Expired: 5,
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JOB_STATUS_LABEL: Record<number, string> = {
  [JobStatus.Open]: 'Abierto',
  [JobStatus.Funded]: 'Fondeado',
  [JobStatus.Submitted]: 'Entregado',
  [JobStatus.Completed]: 'Completado',
  [JobStatus.Rejected]: 'Rechazado',
  [JobStatus.Expired]: 'Expirado',
};

/**
 * ABI acordada (interfaz congelada del contrato).
 * El contrato `JobMarketplace.sol` todavía no está implementado, pero esta interfaz
 * es el contrato entre las 3 capas. Si cambia una firma, se actualiza acá y se avisa al equipo.
 *
 * Orden del getter auto-generado `jobs(uint256)` (declaración del struct Job):
 *   client, evaluator, provider, budget, expiresAt, status, deliverableRef, description
 */
export const JOBMARKETPLACE_ABI = [
  {
    type: 'constructor',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'token_', type: 'address' }],
  },

  // Lecturas
  {
    type: 'function',
    name: 'token',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'jobCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'jobs',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'client', type: 'address' },
      { name: 'evaluator', type: 'address' },
      { name: 'provider', type: 'address' },
      { name: 'budget', type: 'uint256' },
      { name: 'expiresAt', type: 'uint64' },
      { name: 'status', type: 'uint8' },
      { name: 'deliverableRef', type: 'bytes32' },
      { name: 'description', type: 'string' },
    ],
  },

  // Escrituras
  {
    type: 'function',
    name: 'createJob',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'description', type: 'string' },
      { name: 'budget', type: 'uint256' },
      { name: 'evaluator', type: 'address' },
      { name: 'provider', type: 'address' },
      { name: 'expiresAt', type: 'uint64' },
    ],
    outputs: [{ name: 'jobId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setProvider',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'provider', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'fund',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'submit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'deliverableRef', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'complete',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'reason', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'reject',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'reason', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimRefund',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [],
  },

  // Eventos
  {
    type: 'event',
    name: 'JobCreated',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'client', type: 'address', indexed: true },
      { name: 'evaluator', type: 'address', indexed: true },
      { name: 'provider', type: 'address', indexed: false },
      { name: 'budget', type: 'uint256', indexed: false },
      { name: 'expiresAt', type: 'uint64', indexed: false },
      { name: 'description', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ProviderSet',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'JobFunded',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Submitted',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'deliverableRef', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Completed',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
      { name: 'reason', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Rejected',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'reason', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Refunded',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'client', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  // Custom errors
  { type: 'error', name: 'NotClient', inputs: [] },
  { type: 'error', name: 'NotEvaluator', inputs: [] },
  { type: 'error', name: 'NotProvider', inputs: [] },
  { type: 'error', name: 'EvaluatorRequired', inputs: [] },
  { type: 'error', name: 'ProviderRequired', inputs: [] },
  { type: 'error', name: 'ProviderAlreadySet', inputs: [] },
  { type: 'error', name: 'InvalidState', inputs: [] },
  { type: 'error', name: 'JobNotExpired', inputs: [] },
  { type: 'error', name: 'ZeroBudget', inputs: [] },
  { type: 'error', name: 'InvalidJob', inputs: [] },
] as const;
