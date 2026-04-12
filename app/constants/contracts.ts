// frontend/app/constants/contracts.ts
export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;


export const ESCROW_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "seller", "type": "address" },
      { "internalType": "bool", "name": "isEscrow", "type": "bool" }
    ],
    "name": "pay",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" }
    ],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
