// Contract addresses provided by the user
export const TOKEN_FACTORY_ADDRESS: { [key: number]: string } = {
  8453: "0xE1F32066C91a7b4F9Ffe5A5c9C655d93FCaF3e60", // Base Mainnet
  84532: "0x42914FF413a96244228aCA257D3Dc5F856fb1F30", // Base Sepolia Testnet
};

export const SUPPORTED_CHAINS = [
  {
    id: 8453,
    name: "Base Mainnet",
  },
  {
    id: 84532,
    name: "Base Sepolia",
  },
];

// Minimal ABIs for contract interactions
export const TOKEN_FACTORY_ABI = [
  "function createToken(string name, string symbol, uint256 initialSupply, uint8 decimals) returns (address)",
  "function getTokensOfOwner(address owner) view returns (address[])",
];

export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
];
