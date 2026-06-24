import { keccak256, toHex, type Hex } from 'viem';

/**
 * Almacenamiento off-chain del deliverable (Parte B de la consigna).
 *
 * On-chain solo viaja `deliverableRef` (bytes32) = keccak256 del contenido. El contenido en sí
 * se guarda en localStorage indexado por ese hash, de modo que:
 *  - el trabajo no es público hasta que el evaluador da el visto bueno,
 *  - evitamos pagar storage caro en la blockchain.
 *
 * Limitación: el evaluador debe estar en el mismo navegador para ver el contenido (suficiente para
 * la entrega). BONUS: reemplazar este módulo por una subida a IPFS y usar el CID como ref.
 */

const PREFIX = 'jobmkt:deliverable:';

/** Calcula el ref bytes32 (keccak256) del contenido del deliverable. */
export function deliverableRef(content: string): Hex {
  return keccak256(toHex(content));
}

/** Guarda el contenido del deliverable localmente y devuelve su ref bytes32. */
export function saveDeliverable(content: string): Hex {
  const ref = deliverableRef(content);
  localStorage.setItem(PREFIX + ref, content);
  return ref;
}

/** Recupera el contenido del deliverable a partir de su ref, si está en este navegador. */
export function loadDeliverable(ref: Hex): string | null {
  return localStorage.getItem(PREFIX + ref);
}

export const ZERO_REF: Hex = `0x${'0'.repeat(64)}`;

export function isZeroRef(ref: Hex): boolean {
  return ref.toLowerCase() === ZERO_REF;
}
