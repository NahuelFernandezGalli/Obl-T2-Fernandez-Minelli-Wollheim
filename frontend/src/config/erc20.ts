import { erc20Abi } from 'viem';

// El token de pago lo determina el contrato JobMarketplace (función `token()`).
// El frontend lee name/symbol/decimals/balanceOf/allowance con la ABI estándar de viem.
export const ERC20_ABI = erc20Abi;
