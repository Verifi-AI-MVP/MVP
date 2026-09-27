/** ABIs for the two contracts — keep in sync with contracts/*.sol */
export const VeriFiLoanAbi = [
  {
    type: 'function',
    name: 'createLoan',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'offChainId', type: 'bytes32' },
      { name: 'borrower', type: 'address' },
      { name: 'amountCents', type: 'uint256' },
      { name: 'interestRateBps', type: 'uint256' },
      { name: 'termMonths', type: 'uint256' },
      { name: 'monthlyPaymentCents', type: 'uint256' },
    ],
    outputs: [{ name: 'loanId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approveLoan',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'rejectLoan',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'disburseLoan',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'markRepaid',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'markDefaulted',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'offChainIdToLoanId',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getLoan',
    stateMutability: 'view',
    inputs: [{ name: 'loanId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'offChainId', type: 'bytes32' },
          { name: 'borrower', type: 'address' },
          { name: 'amountCents', type: 'uint256' },
          { name: 'interestRateBps', type: 'uint256' },
          { name: 'termMonths', type: 'uint256' },
          { name: 'monthlyPaymentCents', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint64' },
          { name: 'approvedAt', type: 'uint64' },
          { name: 'disbursedAt', type: 'uint64' },
        ],
      },
    ],
  },
] as const;

export const trustAttestationAbi = [
  {
    type: 'function',
    name: 'attest',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'subject', type: 'address' },
      { name: 'riskScore', type: 'uint256' },
      { name: 'decisionHash', type: 'bytes32' },
      { name: 'factorsHash', type: 'bytes32' },
      { name: 'modelVersion', type: 'string' },
    ],
    outputs: [{ name: 'attestationId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'latestAttestationId',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getLatestAttestation',
    stateMutability: 'view',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'subject', type: 'address' },
          { name: 'riskScore', type: 'uint256' },
          { name: 'decisionHash', type: 'bytes32' },
          { name: 'factorsHash', type: 'bytes32' },
          { name: 'modelVersion', type: 'string' },
          { name: 'attestedAt', type: 'uint64' },
          { name: 'attester', type: 'address' },
        ],
      },
    ],
  },
] as const;
