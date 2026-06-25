import { bytesToHex, hexToBytes, type Hex } from 'viem';
import { base58Encode, base58Decode } from './base58';

// Configuración por env (opcional). Si no hay JWT, el deliverable cae a localStorage (modo híbrido).
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;
const GATEWAY = (import.meta.env.VITE_IPFS_GATEWAY as string | undefined) ?? 'https://gateway.pinata.cloud/ipfs/';

/** ¿Está configurada la subida a IPFS (Pinata)? */
export function isIpfsEnabled(): boolean {
  return Boolean(PINATA_JWT);
}

/** URL de gateway para un CID. */
export function gatewayUrl(cid: string): string {
  const base = GATEWAY.endsWith('/') ? GATEWAY : GATEWAY + '/';
  return base + cid;
}

/**
 * CIDv0 (Qm...) ↔ bytes32.
 * Un CIDv0 es un multihash de 34 bytes: 0x12 (sha2-256) + 0x20 (largo 32) + digest(32).
 * Guardamos solo el digest de 32 bytes en el `deliverableRef` (bytes32) y reconstruimos el CID al leer.
 */
export function cidToBytes32(cid: string): Hex {
  const mh = base58Decode(cid);
  if (mh.length !== 34 || mh[0] !== 0x12 || mh[1] !== 0x20) {
    throw new Error('Solo se soportan CIDv0 (sha2-256)');
  }
  return bytesToHex(mh.slice(2));
}

export function bytes32ToCid(ref: Hex): string {
  const digest = hexToBytes(ref);
  const mh = new Uint8Array(34);
  mh[0] = 0x12;
  mh[1] = 0x20;
  mh.set(digest, 2);
  return base58Encode(mh);
}

/** Sube el contenido a IPFS vía Pinata y devuelve el CIDv0. */
export async function uploadToIpfs(content: string): Promise<string> {
  if (!PINATA_JWT) throw new Error('IPFS no configurado');

  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), 'deliverable.txt');
  form.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Pinata respondió ${res.status}`);
  }
  const json = (await res.json()) as { IpfsHash: string };
  return json.IpfsHash;
}

/** Trae el contenido desde un gateway IPFS a partir del CID. */
export async function fetchFromIpfs(cid: string): Promise<string | null> {
  const res = await fetch(gatewayUrl(cid));
  if (!res.ok) return null;
  return res.text();
}
