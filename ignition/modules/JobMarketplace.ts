import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("JobMarketplace", (m) => {
  const token = m.contract("MockERC20", ["Job Token", "JTK"]);
  const marketplace = m.contract("JobMarketplace", [token]);
  return { token, marketplace };
});
