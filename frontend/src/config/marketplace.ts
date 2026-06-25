import { type Address } from 'viem';

// Dirección del contrato JobMarketplace en Sepolia.
// Se completa con VITE_JOBMARKETPLACE_ADDRESS cuando se despliegue.
export const JOBMARKETPLACE_ADDRESS = (import.meta.env.VITE_JOBMARKETPLACE_ADDRESS ??
  '0x0000000000000000000000000000000000000000') as Address;

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

// Bloque en el que se desplegó el JobMarketplace. Se usa como `fromBlock` al leer eventos:
// arrancar en 0 hace que el RPC escanee toda la cadena y rechace la consulta.
// Si se redespliega el contrato, actualizar este valor (o VITE_JOBMARKETPLACE_DEPLOY_BLOCK).
export const JOBMARKETPLACE_DEPLOY_BLOCK = BigInt(
  import.meta.env.VITE_JOBMARKETPLACE_DEPLOY_BLOCK ?? '11137384',
);

// Estados del Job - coincide con el enum Status del contrato.
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
 * ABI generada por el compilador (Hardhat) desde contracts/JobMarketplace.sol.
 * Fuente: artifacts/contracts/JobMarketplace.sol/JobMarketplace.json (campo `abi`).
 * Si se recompila el contrato con cambios, regenerar esta constante desde ese artifact.
 *
 * El getter auto-generado `jobs(uint256)` devuelve, en orden:
 *   client, evaluator, provider, budget, expiresAt, status, deliverableRef, description
 */
export const JOBMARKETPLACE_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'token_', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'EvaluatorRequired', type: 'error' },
  { inputs: [], name: 'InvalidJob', type: 'error' },
  { inputs: [], name: 'InvalidState', type: 'error' },
  { inputs: [], name: 'JobNotExpired', type: 'error' },
  { inputs: [], name: 'NotClient', type: 'error' },
  { inputs: [], name: 'NotEvaluator', type: 'error' },
  { inputs: [], name: 'NotProvider', type: 'error' },
  { inputs: [], name: 'ProviderAlreadySet', type: 'error' },
  { inputs: [], name: 'ProviderRequired', type: 'error' },
  { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
  { inputs: [], name: 'ZeroBudget', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'provider', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'reason', type: 'bytes32' },
    ],
    name: 'Completed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'client', type: 'address' },
      { indexed: true, internalType: 'address', name: 'evaluator', type: 'address' },
      { indexed: false, internalType: 'address', name: 'provider', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'budget', type: 'uint256' },
      { indexed: false, internalType: 'uint64', name: 'expiresAt', type: 'uint64' },
      { indexed: false, internalType: 'string', name: 'description', type: 'string' },
    ],
    name: 'JobCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'JobFunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'provider', type: 'address' },
    ],
    name: 'ProviderSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'client', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Refunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: false, internalType: 'bytes32', name: 'reason', type: 'bytes32' },
    ],
    name: 'Rejected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: false, internalType: 'bytes32', name: 'deliverableRef', type: 'bytes32' },
    ],
    name: 'Submitted',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'jobId', type: 'uint256' }],
    name: 'claimRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { internalType: 'bytes32', name: 'reason', type: 'bytes32' },
    ],
    name: 'complete',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'uint256', name: 'budget', type: 'uint256' },
      { internalType: 'address', name: 'evaluator', type: 'address' },
      { internalType: 'address', name: 'provider', type: 'address' },
      { internalType: 'uint64', name: 'expiresAt', type: 'uint64' },
    ],
    name: 'createJob',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'jobId', type: 'uint256' }],
    name: 'fund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'jobCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'jobs',
    outputs: [
      { internalType: 'address', name: 'client', type: 'address' },
      { internalType: 'address', name: 'evaluator', type: 'address' },
      { internalType: 'address', name: 'provider', type: 'address' },
      { internalType: 'uint256', name: 'budget', type: 'uint256' },
      { internalType: 'uint64', name: 'expiresAt', type: 'uint64' },
      { internalType: 'enum JobMarketplace.Status', name: 'status', type: 'uint8' },
      { internalType: 'bytes32', name: 'deliverableRef', type: 'bytes32' },
      { internalType: 'string', name: 'description', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { internalType: 'bytes32', name: 'reason', type: 'bytes32' },
    ],
    name: 'reject',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { internalType: 'address', name: 'provider', type: 'address' },
    ],
    name: 'setProvider',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { internalType: 'bytes32', name: 'deliverableRef', type: 'bytes32' },
    ],
    name: 'submit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
