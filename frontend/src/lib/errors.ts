import { BaseError, ContractFunctionRevertedError } from 'viem';

/**
 * Decodifica un revert a un mensaje legible para el usuario.
 * Prioriza el nombre del custom error del contrato (ej. "NotEvaluator", "InvalidState").
 * Requerido por la UX de la consigna: "al revertir, mostrar el motivo del error de forma clara".
 */
export function decodeRevert(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? revert.reason;
      if (name) return name;
    }
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return 'Error desconocido al enviar la transacción.';
}
