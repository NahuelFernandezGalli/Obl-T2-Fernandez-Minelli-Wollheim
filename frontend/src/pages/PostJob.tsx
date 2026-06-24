import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWriteContract } from 'wagmi';
import { parseUnits, isAddress, type Address } from 'viem';
import { JOBMARKETPLACE_ADDRESS, JOBMARKETPLACE_ABI, ZERO_ADDRESS } from '../config/marketplace';
import { useTokenMeta } from '../hooks/useToken';
import { decodeRevert } from '../lib/errors';

export function PostJob() {
  const navigate = useNavigate();
  const { data: token } = useTokenMeta();
  const decimals = token?.decimals ?? 18;

  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [evaluator, setEvaluator] = useState('');
  const [provider, setProvider] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');

  const { writeContract, isPending } = useWriteContract();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isAddress(evaluator)) {
      setError('Dirección del evaluador inválida.');
      return;
    }
    if (provider.trim() !== '' && !isAddress(provider)) {
      setError('Dirección del proveedor inválida.');
      return;
    }

    let parsedBudget: bigint;
    try {
      parsedBudget = parseUnits(budget || '0', decimals);
    } catch {
      setError('Budget inválido.');
      return;
    }
    if (parsedBudget <= 0n) {
      setError('El budget debe ser mayor a cero.');
      return;
    }

    const expiresUnix = expiresAt ? BigInt(Math.floor(new Date(expiresAt).getTime() / 1000)) : 0n;
    if (expiresUnix <= BigInt(Math.floor(Date.now() / 1000))) {
      setError('La fecha de expiración debe ser futura.');
      return;
    }

    const providerArg = (provider.trim() === '' ? ZERO_ADDRESS : provider) as Address;

    writeContract(
      {
        address: JOBMARKETPLACE_ADDRESS,
        abi: JOBMARKETPLACE_ABI,
        functionName: 'createJob',
        args: [description, parsedBudget, evaluator as Address, providerArg, expiresUnix],
      },
      {
        onSuccess: () => navigate('/'),
        onError: (e) => setError(decodeRevert(e)),
      },
    );
  }

  return (
    <section>
      <h2>Publicar trabajo</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Descripción
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label>
          Budget {token ? `(${token.symbol})` : '(tokens)'}
          <input type="text" placeholder="0.0" value={budget} onChange={(e) => setBudget(e.target.value)} required />
        </label>
        <label>
          Dirección del evaluador
          <input type="text" placeholder="0x..." value={evaluator} onChange={(e) => setEvaluator(e.target.value)} required />
        </label>
        <label>
          Proveedor (opcional)
          <input type="text" placeholder="0x..." value={provider} onChange={(e) => setProvider(e.target.value)} />
        </label>
        <label>
          Expira
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={isPending}>
          {isPending ? 'Enviando…' : 'Publicar trabajo'}
        </button>
      </form>
    </section>
  );
}
