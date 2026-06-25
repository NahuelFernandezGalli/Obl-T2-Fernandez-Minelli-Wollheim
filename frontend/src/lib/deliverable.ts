import { keccak256, toHex, type Hex } from 'viem';
import { isIpfsEnabled, uploadToIpfs, cidToBytes32, bytes32ToCid, fetchFromIpfs, gatewayUrl } from './ipfs';

/**
 * Almacenamiento off-chain del deliverable (Parte B + bonus de la consigna).
 *
 * On-chain solo viaja `deliverableRef` (bytes32). El contenido va off-chain en modo **híbrido**:
 *  - Si IPFS (Pinata) está configurado: se sube a IPFS y `deliverableRef` = CID codificado en bytes32.
 *    Así cualquier evaluador lo ve desde cualquier dispositivo (descentralizado, espíritu del protocolo).
 *  - Si no: `deliverableRef` = keccak256(contenido) y el contenido queda en localStorage (suficiente
 *    para la entrega, pero el evaluador debe estar en el mismo navegador).
 *
 * En ambos casos se guarda una copia local como caché, indexada por el ref.
 */

const PREFIX = 'jobmkt:deliverable:';

function cacheLocal(ref: Hex, content: string): void {
  localStorage.setItem(PREFIX + ref, content);
}

/** Guarda el deliverable (IPFS si está configurado, si no localStorage) y devuelve su ref bytes32. */
export async function storeDeliverable(content: string): Promise<Hex> {
  if (isIpfsEnabled()) {
    try {
      const cid = await uploadToIpfs(content);
      const ref = cidToBytes32(cid);
      cacheLocal(ref, content);
      return ref;
    } catch (e) {
      // Si IPFS falla, no bloqueamos la entrega: caemos a localStorage.
      console.warn('Falló la subida a IPFS, usando localStorage:', e);
    }
  }
  const ref = keccak256(toHex(content));
  cacheLocal(ref, content);
  return ref;
}

export interface DeliverableResult {
  content: string;
  source: 'local' | 'ipfs';
  url?: string;
}

/** Recupera el contenido del deliverable: primero del caché local, si no desde IPFS. */
export async function fetchDeliverable(ref: Hex): Promise<DeliverableResult | null> {
  const local = localStorage.getItem(PREFIX + ref);
  if (local !== null) return { content: local, source: 'local' };

  // No está local: intentamos reconstruir el CID y traerlo de IPFS.
  try {
    const cid = bytes32ToCid(ref);
    const content = await fetchFromIpfs(cid);
    if (content !== null) {
      cacheLocal(ref, content);
      return { content, source: 'ipfs', url: gatewayUrl(cid) };
    }
  } catch {
    // El ref no corresponde a un CID recuperable (ej. fue un keccak de localStorage en otro navegador).
  }
  return null;
}

export const ZERO_REF: Hex = `0x${'0'.repeat(64)}`;

export function isZeroRef(ref: Hex): boolean {
  return ref.toLowerCase() === ZERO_REF;
}
