const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VeriFiLoan', function () {
  let loan, owner, platform, borrower;

  beforeEach(async function () {
    [owner, platform, borrower] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('VeriFiLoan');
    loan = await Factory.deploy(platform.address);
    await loan.waitForDeployment();
  });

  it('creates a loan', async function () {
    const offChainId = ethers.id('loan-uuid-1');
    await expect(
      loan.connect(platform).createLoan(offChainId, borrower.address, 100000, 1299, 12, 8900)
    )
      .to.emit(loan, 'LoanCreated')
      .withArgs(1n, offChainId, borrower.address, 100000n, 1299n, 12n);

    const stored = await loan.getLoan(1);
    expect(stored.borrower).to.equal(borrower.address);
    expect(stored.status).to.equal(0); // Pending
  });

  it('approve -> disburse', async function () {
    const offChainId = ethers.id('loan-uuid-2');
    await loan.connect(platform).createLoan(offChainId, borrower.address, 50000, 1299, 6, 8500);
    await loan.connect(platform).approveLoan(1);
    await loan.connect(platform).disburseLoan(1);
    const stored = await loan.getLoan(1);
    expect(stored.status).to.equal(2); // Disbursed
  });

  it('non-platform cant create', async function () {
    const offChainId = ethers.id('loan-uuid-3');
    await expect(
      loan.connect(borrower).createLoan(offChainId, borrower.address, 1000, 100, 1, 100)
    ).to.be.revertedWithCustomError(loan, 'Unauthorized');
  });
});

describe('TrustAttestation', function () {
  let attestation, attester, subject;

  beforeEach(async function () {
    [, attester, subject] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('TrustAttestation');
    attestation = await Factory.deploy(attester.address);
    await attestation.waitForDeployment();
  });

  it('writes a score', async function () {
    const decisionHash = ethers.id('approve');
    const factorsHash = ethers.id('factors');
    await expect(
      attestation.connect(attester).attest(subject.address, 42, decisionHash, factorsHash, '1.0.0')
    )
      .to.emit(attestation, 'TrustAttested')
      .withArgs(1n, subject.address, 42n, decisionHash, '1.0.0');

    const latest = await attestation.getLatestAttestation(subject.address);
    expect(latest.riskScore).to.equal(42n);
  });
});
