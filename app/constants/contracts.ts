// frontend/app/constants/contracts.ts
export const ESCROW_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0" as `0x${string}`;

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
