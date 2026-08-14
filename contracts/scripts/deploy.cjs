const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const Loan = await hre.ethers.getContractFactory('VeriFiLoan');
  const loan = await Loan.deploy(deployer.address);
  await loan.waitForDeployment();
  const loanAddress = await loan.getAddress();
  console.log('VeriFiLoan:', loanAddress);

  const Attestation = await hre.ethers.getContractFactory('TrustAttestation');
  const attestation = await Attestation.deploy(deployer.address);
  await attestation.waitForDeployment();
  const attestationAddress = await attestation.getAddress();
  console.log('TrustAttestation:', attestationAddress);

  const network = await hre.ethers.provider.getNetwork();
  const deployment = {
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contracts: {
      VeriFiLoan: loanAddress,
      TrustAttestation: attestationAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${deployment.chainId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log('Wrote', outPath);

  // copy abis over so the api can call them
  const abiDir = path.join(__dirname, '..', '..', 'server', 'src', 'blockchain', 'abis');
  fs.mkdirSync(abiDir, { recursive: true });

  for (const name of ['VeriFiLoan', 'TrustAttestation']) {
    const artifactPath = path.join(
      __dirname,
      '..',
      'artifacts',
      `${name}.sol`,
      `${name}.json`
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    fs.writeFileSync(
      path.join(abiDir, `${name}.json`),
      JSON.stringify({ abi: artifact.abi, contractName: name }, null, 2)
    );
  }

  console.log('abi dump -> server/src/blockchain/abis/');
  console.log('\ndrop these in .env:');
  console.log(`BLOCKCHAIN_MODE=live`);
  console.log(`BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545`);
  console.log(`BLOCKCHAIN_CHAIN_ID=${deployment.chainId}`);
  console.log(`BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log(`LOAN_CONTRACT_ADDRESS=${loanAddress}`);
  console.log(`ATTESTATION_CONTRACT_ADDRESS=${attestationAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
