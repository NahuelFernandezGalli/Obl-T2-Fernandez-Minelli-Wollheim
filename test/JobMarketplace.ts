import "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { expect } from "chai";
import hre from "hardhat";
import type { NetworkConnection } from "hardhat/types/network";

describe("JobMarketplace", function () {
  let conn: NetworkConnection;

  before(async function () {
    conn = await hre.network.connect();
  });

  after(async function () {
    await conn.close();
  });

  // ─── Fixtures ────────────────────────────────────────────────────────────────

  async function deployFixture(connection: NetworkConnection) {
    const [client, provider, evaluator, msig1, msig2, other] =
      await connection.ethers.getSigners();

    const Token = await connection.ethers.getContractFactory("MockERC20");
    const token = await Token.deploy("Job Token", "JTK");

    const Marketplace = await connection.ethers.getContractFactory("JobMarketplace");
    const marketplace = await Marketplace.deploy(await token.getAddress());

    const BUDGET = connection.ethers.parseUnits("100", 18);
    await token.mint(client.address, BUDGET * 10n);

    return { token, marketplace, client, provider, evaluator, msig1, msig2, other, BUDGET };
  }

  // Job creado CON proveedor — estado Open
  async function withJobFixture(connection: NetworkConnection) {
    const base = await connection.networkHelpers.loadFixture(deployFixture);
    const { marketplace, client, provider, evaluator, BUDGET } = base;

    const now = await connection.networkHelpers.time.latest();
    const expiresAt = BigInt(now) + 3600n;

    await marketplace.connect(client).createJob(
      "Test job",
      BUDGET,
      evaluator.address,
      provider.address,
      expiresAt
    );

    return { ...base, jobId: 0n, expiresAt };
  }

  // Estado Funded
  async function withFundedJobFixture(connection: NetworkConnection) {
    const base = await connection.networkHelpers.loadFixture(withJobFixture);
    const { token, marketplace, client, BUDGET, jobId } = base;

    await token.connect(client).approve(await marketplace.getAddress(), BUDGET);
    await marketplace.connect(client).fund(jobId);

    return base;
  }

  // Estado Submitted
  async function withSubmittedJobFixture(connection: NetworkConnection) {
    const base = await connection.networkHelpers.loadFixture(withFundedJobFixture);
    const { marketplace, provider, jobId } = base;

    const deliverableRef = connection.ethers.id("test-deliverable");
    await marketplace.connect(provider).submit(jobId, deliverableRef);

    return { ...base, deliverableRef };
  }

  // ─── Happy path ──────────────────────────────────────────────────────────────

  describe("Happy path: crear → fondear → entregar → completar", function () {

    it("crea el job con el struct correcto", async function () {
      const { marketplace, client, evaluator, provider, BUDGET, jobId } =
        await conn.networkHelpers.loadFixture(withJobFixture);

      const job = await marketplace.jobs(jobId);
      expect(job.client).to.equal(client.address);
      expect(job.evaluator).to.equal(evaluator.address);
      expect(job.provider).to.equal(provider.address);
      expect(job.budget).to.equal(BUDGET);
      expect(job.status).to.equal(0n); // Open
    });

    it("emite JobCreated al crear", async function () {
      const { marketplace, client, evaluator, provider, BUDGET } =
        await conn.networkHelpers.loadFixture(deployFixture);

      const now = await conn.networkHelpers.time.latest();
      const expiresAt = BigInt(now) + 3600n;

      await expect(
        marketplace
          .connect(client)
          .createJob("Test job", BUDGET, evaluator.address, provider.address, expiresAt)
      )
        .to.emit(marketplace, "JobCreated")
        .withArgs(0n, client.address, evaluator.address, provider.address, BUDGET, expiresAt, "Test job");
    });

    it("transfiere los tokens al contrato en fund", async function () {
      const { marketplace, token, BUDGET } =
        await conn.networkHelpers.loadFixture(withFundedJobFixture);

      expect(await token.balanceOf(await marketplace.getAddress())).to.equal(BUDGET);
    });

    it("pasa a estado Funded después de fund", async function () {
      const { marketplace, jobId } =
        await conn.networkHelpers.loadFixture(withFundedJobFixture);

      const job = await marketplace.jobs(jobId);
      expect(job.status).to.equal(1n); // Funded
    });

    it("emite JobFunded", async function () {
      const { marketplace, token, client, BUDGET, jobId } =
        await conn.networkHelpers.loadFixture(withJobFixture);

      await token.connect(client).approve(await marketplace.getAddress(), BUDGET);
      await expect(marketplace.connect(client).fund(jobId))
        .to.emit(marketplace, "JobFunded")
        .withArgs(jobId, BUDGET);
    });

    it("pasa a estado Submitted después de submit", async function () {
      const { marketplace, jobId } =
        await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

      const job = await marketplace.jobs(jobId);
      expect(job.status).to.equal(2n); // Submitted
    });

    it("emite Submitted", async function () {
      const { marketplace, provider, jobId } =
        await conn.networkHelpers.loadFixture(withFundedJobFixture);

      const deliverableRef = conn.ethers.id("test-deliverable");
      await expect(marketplace.connect(provider).submit(jobId, deliverableRef))
        .to.emit(marketplace, "Submitted")
        .withArgs(jobId, deliverableRef);
    });

    it("libera fondos al proveedor en complete", async function () {
      const { marketplace, token, evaluator, provider, BUDGET, jobId } =
        await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

      const providerBalanceBefore = await token.balanceOf(provider.address);
      const reason = conn.ethers.id("approved");

      await marketplace.connect(evaluator).complete(jobId, reason);

      expect(await token.balanceOf(provider.address)).to.equal(providerBalanceBefore + BUDGET);
    });

    it("pasa a estado Completed", async function () {
      const { marketplace, evaluator, jobId } =
        await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

      await marketplace.connect(evaluator).complete(jobId, conn.ethers.id("approved"));
      const job = await marketplace.jobs(jobId);
      expect(job.status).to.equal(3n); // Completed
    });

    it("emite Completed", async function () {
      const { marketplace, evaluator, provider, jobId } =
        await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

      const reason = conn.ethers.id("approved");
      await expect(marketplace.connect(evaluator).complete(jobId, reason))
        .to.emit(marketplace, "Completed")
        .withArgs(jobId, provider.address, reason);
    });

  });

  // ─── Rechazos ────────────────────────────────────────────────────────────────

  describe("Rechazos", function () {

    describe("Cliente rechaza en Open", function () {

      it("pasa a Rejected sin mover fondos del contrato", async function () {
        const { marketplace, token, client, jobId } =
          await conn.networkHelpers.loadFixture(withJobFixture);

        await marketplace.connect(client).reject(jobId, conn.ethers.id("no-longer-needed"));

        const job = await marketplace.jobs(jobId);
        expect(job.status).to.equal(4n); // Rejected
        // El contrato nunca tuvo fondos (no se fondeó), saldo debe ser 0
        expect(await token.balanceOf(await marketplace.getAddress())).to.equal(0n);
      });

      it("emite Rejected", async function () {
        const { marketplace, client, jobId } =
          await conn.networkHelpers.loadFixture(withJobFixture);

        const reason = conn.ethers.id("no-longer-needed");
        await expect(marketplace.connect(client).reject(jobId, reason))
          .to.emit(marketplace, "Rejected")
          .withArgs(jobId, reason);
      });

    });

    describe("Evaluador rechaza en Funded", function () {

      it("pasa a Rejected y reembolsa al cliente", async function () {
        const { marketplace, token, evaluator, client, BUDGET, jobId } =
          await conn.networkHelpers.loadFixture(withFundedJobFixture);

        const clientBalanceBefore = await token.balanceOf(client.address);
        await marketplace.connect(evaluator).reject(jobId, conn.ethers.id("bad-provider"));

        const job = await marketplace.jobs(jobId);
        expect(job.status).to.equal(4n); // Rejected
        expect(await token.balanceOf(client.address)).to.equal(clientBalanceBefore + BUDGET);
      });

      it("emite Rejected y Refunded", async function () {
        const { marketplace, evaluator, client, BUDGET, jobId } =
          await conn.networkHelpers.loadFixture(withFundedJobFixture);

        const reason = conn.ethers.id("bad-provider");
        await expect(marketplace.connect(evaluator).reject(jobId, reason))
          .to.emit(marketplace, "Rejected").withArgs(jobId, reason)
          .and.to.emit(marketplace, "Refunded").withArgs(jobId, client.address, BUDGET);
      });

    });

    describe("Evaluador rechaza en Submitted", function () {

      it("pasa a Rejected y reembolsa al cliente", async function () {
        const { marketplace, token, evaluator, client, BUDGET, jobId } =
          await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

        const clientBalanceBefore = await token.balanceOf(client.address);
        await marketplace.connect(evaluator).reject(jobId, conn.ethers.id("work-rejected"));

        const job = await marketplace.jobs(jobId);
        expect(job.status).to.equal(4n); // Rejected
        expect(await token.balanceOf(client.address)).to.equal(clientBalanceBefore + BUDGET);
      });

      it("emite Rejected y Refunded", async function () {
        const { marketplace, evaluator, client, BUDGET, jobId } =
          await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

        const reason = conn.ethers.id("work-rejected");
        await expect(marketplace.connect(evaluator).reject(jobId, reason))
          .to.emit(marketplace, "Rejected").withArgs(jobId, reason)
          .and.to.emit(marketplace, "Refunded").withArgs(jobId, client.address, BUDGET);
      });

    });

  });

  // ─── Expiración ──────────────────────────────────────────────────────────────
  // Usa conn2 (red separada) para que time.increaseTo no corrompa los snapshots
  // de conn que usa el resto de las secciones (HHE60013).

  describe("Expiración con claimRefund", function () {
    let conn2: NetworkConnection;

    before(async function () {
      conn2 = await hre.network.create();
    });

    after(async function () {
      await conn2.close();
    });

    async function buildExpiredFunded() {
      const [client, provider, evaluator] = await conn2.ethers.getSigners();
      const Token = await conn2.ethers.getContractFactory("MockERC20");
      const token = await Token.deploy("Job Token", "JTK");
      const Marketplace = await conn2.ethers.getContractFactory("JobMarketplace");
      const marketplace = await Marketplace.deploy(await token.getAddress());
      const BUDGET = conn2.ethers.parseUnits("100", 18);
      await token.mint(client.address, BUDGET * 10n);
      const now = await conn2.networkHelpers.time.latest();
      const expiresAt = BigInt(now) + 3600n;
      await marketplace.connect(client).createJob("Test job", BUDGET, evaluator.address, provider.address, expiresAt);
      const jobId = 0n;
      await token.connect(client).approve(await marketplace.getAddress(), BUDGET);
      await marketplace.connect(client).fund(jobId);
      await conn2.networkHelpers.time.increaseTo(expiresAt + 1n);
      return { token, marketplace, client, provider, evaluator, BUDGET, jobId, expiresAt };
    }

    async function buildExpiredSubmitted() {
      const [client, provider, evaluator] = await conn2.ethers.getSigners();
      const Token = await conn2.ethers.getContractFactory("MockERC20");
      const token = await Token.deploy("Job Token", "JTK");
      const Marketplace = await conn2.ethers.getContractFactory("JobMarketplace");
      const marketplace = await Marketplace.deploy(await token.getAddress());
      const BUDGET = conn2.ethers.parseUnits("100", 18);
      await token.mint(client.address, BUDGET * 10n);
      const now = await conn2.networkHelpers.time.latest();
      const expiresAt = BigInt(now) + 3600n;
      await marketplace.connect(client).createJob("Test job", BUDGET, evaluator.address, provider.address, expiresAt);
      const jobId = 0n;
      await token.connect(client).approve(await marketplace.getAddress(), BUDGET);
      await marketplace.connect(client).fund(jobId);
      const deliverableRef = conn2.ethers.id("test-deliverable");
      await marketplace.connect(provider).submit(jobId, deliverableRef);
      await conn2.networkHelpers.time.increaseTo(expiresAt + 1n);
      return { token, marketplace, client, provider, evaluator, BUDGET, jobId, expiresAt, deliverableRef };
    }

    it("claimRefund desde Funded pasa a Expired y reembolsa al cliente", async function () {
      const { marketplace, token, client, BUDGET, jobId } = await buildExpiredFunded();

      const clientBalanceBefore = await token.balanceOf(client.address);
      await marketplace.claimRefund(jobId);

      const job = await marketplace.jobs(jobId);
      expect(job.status).to.equal(5n); // Expired
      expect(await token.balanceOf(client.address)).to.equal(clientBalanceBefore + BUDGET);
    });

    it("claimRefund desde Submitted pasa a Expired y reembolsa al cliente", async function () {
      const { marketplace, token, client, BUDGET, jobId } = await buildExpiredSubmitted();

      const clientBalanceBefore = await token.balanceOf(client.address);
      await marketplace.claimRefund(jobId);

      const job = await marketplace.jobs(jobId);
      expect(job.status).to.equal(5n); // Expired
      expect(await token.balanceOf(client.address)).to.equal(clientBalanceBefore + BUDGET);
    });

    it("reverts con JobNotExpired si todavía no expiró", async function () {
      const [client, provider, evaluator] = await conn2.ethers.getSigners();
      const Token = await conn2.ethers.getContractFactory("MockERC20");
      const token = await Token.deploy("Job Token", "JTK");
      const Marketplace = await conn2.ethers.getContractFactory("JobMarketplace");
      const marketplace = await Marketplace.deploy(await token.getAddress());
      const BUDGET = conn2.ethers.parseUnits("100", 18);
      await token.mint(client.address, BUDGET * 10n);
      const now = await conn2.networkHelpers.time.latest();
      const expiresAt = BigInt(now) + 3600n;
      await marketplace.connect(client).createJob("Test job", BUDGET, evaluator.address, provider.address, expiresAt);
      const jobId = 0n;
      await token.connect(client).approve(await marketplace.getAddress(), BUDGET);
      await marketplace.connect(client).fund(jobId);

      await expect(marketplace.claimRefund(jobId))
        .to.be.revertedWithCustomError(marketplace, "JobNotExpired");
    });

    it("reverts con InvalidState si el job está en Open (no tiene fondos)", async function () {
      const [client, provider, evaluator] = await conn2.ethers.getSigners();
      const Token = await conn2.ethers.getContractFactory("MockERC20");
      const token = await Token.deploy("Job Token", "JTK");
      const Marketplace = await conn2.ethers.getContractFactory("JobMarketplace");
      const marketplace = await Marketplace.deploy(await token.getAddress());
      const BUDGET = conn2.ethers.parseUnits("100", 18);
      await token.mint(client.address, BUDGET * 10n);
      const now = await conn2.networkHelpers.time.latest();
      const expiresAt = BigInt(now) + 3600n;
      await marketplace.connect(client).createJob("Test job", BUDGET, evaluator.address, provider.address, expiresAt);
      const jobId = 0n;
      await conn2.networkHelpers.time.increaseTo(expiresAt + 1n);

      await expect(marketplace.claimRefund(jobId))
        .to.be.revertedWithCustomError(marketplace, "InvalidState");
    });

    it("emite Refunded", async function () {
      const { marketplace, client, BUDGET, jobId } = await buildExpiredFunded();

      await expect(marketplace.claimRefund(jobId))
        .to.emit(marketplace, "Refunded")
        .withArgs(jobId, client.address, BUDGET);
    });

  });

  // ─── Control de acceso ───────────────────────────────────────────────────────

  describe("Control de acceso", function () {

    it("createJob: reverts EvaluatorRequired si evaluador es address(0)", async function () {
      const { marketplace, client, provider, BUDGET } =
        await conn.networkHelpers.loadFixture(deployFixture);

      const now = await conn.networkHelpers.time.latest();
      await expect(
        marketplace
          .connect(client)
          .createJob("bad job", BUDGET, conn.ethers.ZeroAddress, provider.address, BigInt(now) + 3600n)
      ).to.be.revertedWithCustomError(marketplace, "EvaluatorRequired");
    });

    it("createJob: reverts ZeroBudget si budget es 0", async function () {
      const { marketplace, client, evaluator, provider } =
        await conn.networkHelpers.loadFixture(deployFixture);

      const now = await conn.networkHelpers.time.latest();
      await expect(
        marketplace
          .connect(client)
          .createJob("bad job", 0n, evaluator.address, provider.address, BigInt(now) + 3600n)
      ).to.be.revertedWithCustomError(marketplace, "ZeroBudget");
    });

    it("setProvider: reverts NotClient si no es el cliente", async function () {
      const { marketplace, client, evaluator, other, provider, BUDGET } =
        await conn.networkHelpers.loadFixture(deployFixture);
      const now = await conn.networkHelpers.time.latest();
      await marketplace.connect(client).createJob(
        "Job sin proveedor", BUDGET, evaluator.address, conn.ethers.ZeroAddress, BigInt(now) + 3600n
      );
      const jobId = 0n;

      await expect(marketplace.connect(other).setProvider(jobId, provider.address))
        .to.be.revertedWithCustomError(marketplace, "NotClient");
    });

    it("setProvider: reverts ProviderAlreadySet si ya tiene proveedor", async function () {
      const { marketplace, client, other, jobId } =
        await conn.networkHelpers.loadFixture(withJobFixture);

      await expect(marketplace.connect(client).setProvider(jobId, other.address))
        .to.be.revertedWithCustomError(marketplace, "ProviderAlreadySet");
    });

    it("fund: reverts NotClient si no es el cliente", async function () {
      const { marketplace, other, jobId } =
        await conn.networkHelpers.loadFixture(withJobFixture);

      await expect(marketplace.connect(other).fund(jobId))
        .to.be.revertedWithCustomError(marketplace, "NotClient");
    });

    it("fund: reverts ProviderRequired si el job no tiene proveedor", async function () {
      const { marketplace, token, client, evaluator, BUDGET } =
        await conn.networkHelpers.loadFixture(deployFixture);
      const now = await conn.networkHelpers.time.latest();
      await marketplace.connect(client).createJob(
        "Job sin proveedor", BUDGET, evaluator.address, conn.ethers.ZeroAddress, BigInt(now) + 3600n
      );
      const jobId = 0n;

      await token.connect(client).approve(await marketplace.getAddress(), BUDGET);
      await expect(marketplace.connect(client).fund(jobId))
        .to.be.revertedWithCustomError(marketplace, "ProviderRequired");
    });

    it("fund: reverts InvalidState si el job ya está Funded", async function () {
      const { marketplace, client, jobId } =
        await conn.networkHelpers.loadFixture(withFundedJobFixture);

      await expect(marketplace.connect(client).fund(jobId))
        .to.be.revertedWithCustomError(marketplace, "InvalidState");
    });

    it("submit: reverts NotProvider si no es el proveedor", async function () {
      const { marketplace, other, jobId } =
        await conn.networkHelpers.loadFixture(withFundedJobFixture);

      await expect(marketplace.connect(other).submit(jobId, conn.ethers.id("fake")))
        .to.be.revertedWithCustomError(marketplace, "NotProvider");
    });

    it("submit: reverts InvalidState si el job no está en Funded", async function () {
      const { marketplace, provider, jobId } =
        await conn.networkHelpers.loadFixture(withJobFixture);

      await expect(marketplace.connect(provider).submit(jobId, conn.ethers.id("fake")))
        .to.be.revertedWithCustomError(marketplace, "InvalidState");
    });

    it("complete: reverts NotEvaluator si no es el evaluador", async function () {
      const { marketplace, other, jobId } =
        await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

      await expect(marketplace.connect(other).complete(jobId, conn.ethers.id("reason")))
        .to.be.revertedWithCustomError(marketplace, "NotEvaluator");
    });

    it("complete: reverts InvalidState si el job no está en Submitted", async function () {
      const { marketplace, evaluator, jobId } =
        await conn.networkHelpers.loadFixture(withFundedJobFixture);

      await expect(marketplace.connect(evaluator).complete(jobId, conn.ethers.id("reason")))
        .to.be.revertedWithCustomError(marketplace, "InvalidState");
    });

    it("reject en Open: reverts NotClient si no es el cliente", async function () {
      const { marketplace, evaluator, jobId } =
        await conn.networkHelpers.loadFixture(withJobFixture);

      await expect(marketplace.connect(evaluator).reject(jobId, conn.ethers.id("reason")))
        .to.be.revertedWithCustomError(marketplace, "NotClient");
    });

    it("reject en Funded: reverts NotEvaluator si no es el evaluador", async function () {
      const { marketplace, client, jobId } =
        await conn.networkHelpers.loadFixture(withFundedJobFixture);

      await expect(marketplace.connect(client).reject(jobId, conn.ethers.id("reason")))
        .to.be.revertedWithCustomError(marketplace, "NotEvaluator");
    });

    it("reject en Submitted: reverts NotEvaluator si no es el evaluador", async function () {
      const { marketplace, other, jobId } =
        await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

      await expect(marketplace.connect(other).reject(jobId, conn.ethers.id("reason")))
        .to.be.revertedWithCustomError(marketplace, "NotEvaluator");
    });

    it("reject en Completed: reverts InvalidState", async function () {
      const { marketplace, evaluator, client, jobId } =
        await conn.networkHelpers.loadFixture(withSubmittedJobFixture);

      await marketplace.connect(evaluator).complete(jobId, conn.ethers.id("approved"));
      await expect(marketplace.connect(client).reject(jobId, conn.ethers.id("reason")))
        .to.be.revertedWithCustomError(marketplace, "InvalidState");
    });

  });

  // ─── MultiSig como evaluador ─────────────────────────────────────────────────

  describe("MultiSig como evaluador", function () {

    async function withMultiSigEvaluatorFixture(connection: NetworkConnection) {
      const base = await connection.networkHelpers.loadFixture(deployFixture);
      const { token, marketplace, client, provider, msig1, msig2, BUDGET } = base;

      const MultiSig = await connection.ethers.getContractFactory("MultiSig");
      const multisig = await MultiSig.deploy([msig1.address, msig2.address], 2n);

      const now = await connection.networkHelpers.time.latest();
      const expiresAt = BigInt(now) + 3600n;

      await marketplace.connect(client).createJob(
        "Job evaluado por MultiSig",
        BUDGET,
        await multisig.getAddress(),
        provider.address,
        expiresAt
      );
      const jobId = 0n;

      await token.connect(client).approve(await marketplace.getAddress(), BUDGET);
      await marketplace.connect(client).fund(jobId);

      const deliverableRef = connection.ethers.id("multisig-deliverable");
      await marketplace.connect(provider).submit(jobId, deliverableRef);

      return { ...base, multisig, jobId, deliverableRef, expiresAt };
    }

    it("complete falla si un signer llama directo al marketplace (no es evaluador)", async function () {
      const { marketplace, msig1, jobId } =
        await conn.networkHelpers.loadFixture(withMultiSigEvaluatorFixture);

      await expect(
        marketplace.connect(msig1).complete(jobId, conn.ethers.id("reason"))
      ).to.be.revertedWithCustomError(marketplace, "NotEvaluator");
    });

    it("complete falla si el MultiSig ejecuta sin alcanzar el threshold", async function () {
      const { marketplace, multisig, msig1, jobId } =
        await conn.networkHelpers.loadFixture(withMultiSigEvaluatorFixture);

      const reason = conn.ethers.id("approved");
      const calldata = marketplace.interface.encodeFunctionData("complete", [jobId, reason]);
      const marketplaceAddress = await marketplace.getAddress();

      await multisig.connect(msig1).propose(marketplaceAddress, 0n, calldata);
      await multisig.connect(msig1).approve(0n);
      // Solo 1 aprobación — threshold es 2

      await expect(multisig.connect(msig1).execute(0n))
        .to.be.revertedWith("Not enough approvals");
    });

    it("complete funciona cuando el MultiSig alcanza el threshold y ejecuta", async function () {
      const { marketplace, token, multisig, msig1, msig2, provider, BUDGET, jobId } =
        await conn.networkHelpers.loadFixture(withMultiSigEvaluatorFixture);

      const reason = conn.ethers.id("approved");
      const calldata = marketplace.interface.encodeFunctionData("complete", [jobId, reason]);
      const marketplaceAddress = await marketplace.getAddress();

      await multisig.connect(msig1).propose(marketplaceAddress, 0n, calldata);
      await multisig.connect(msig1).approve(0n);
      await multisig.connect(msig2).approve(0n);

      const providerBalanceBefore = await token.balanceOf(provider.address);
      await multisig.connect(msig1).execute(0n);

      const job = await marketplace.jobs(jobId);
      expect(job.status).to.equal(3n); // Completed
      expect(await token.balanceOf(provider.address)).to.equal(providerBalanceBefore + BUDGET);
    });

    it("emite Completed en el marketplace después de la ejecución del MultiSig", async function () {
      const { marketplace, multisig, msig1, msig2, provider, jobId } =
        await conn.networkHelpers.loadFixture(withMultiSigEvaluatorFixture);

      const reason = conn.ethers.id("approved");
      const calldata = marketplace.interface.encodeFunctionData("complete", [jobId, reason]);
      const marketplaceAddress = await marketplace.getAddress();

      await multisig.connect(msig1).propose(marketplaceAddress, 0n, calldata);
      await multisig.connect(msig1).approve(0n);
      await multisig.connect(msig2).approve(0n);

      await expect(multisig.connect(msig1).execute(0n))
        .to.emit(marketplace, "Completed")
        .withArgs(jobId, provider.address, reason);
    });

  });

});
