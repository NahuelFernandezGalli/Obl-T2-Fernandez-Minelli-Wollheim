// Base58 (alfabeto Bitcoin) — necesario para codificar/decodificar CIDs de IPFS.
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Encode(bytes: Uint8Array): string {
  let num = 0n;
  for (const b of bytes) num = num * 256n + BigInt(b);

  let out = '';
  while (num > 0n) {
    out = ALPHABET[Number(num % 58n)] + out;
    num /= 58n;
  }
  // Cada byte 0x00 inicial se representa como '1'.
  for (const b of bytes) {
    if (b === 0) out = '1' + out;
    else break;
  }
  return out;
}

export function base58Decode(str: string): Uint8Array {
  let num = 0n;
  for (const c of str) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error('Caracter base58 inválido');
    num = num * 58n + BigInt(i);
  }

  const out: number[] = [];
  while (num > 0n) {
    out.unshift(Number(num % 256n));
    num /= 256n;
  }
  for (const c of str) {
    if (c === '1') out.unshift(0);
    else break;
  }
  return Uint8Array.from(out);
}
