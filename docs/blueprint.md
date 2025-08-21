# **App Name**: TokenForge

## Core Features:

- Wallet Connection: Connect to MetaMask wallet and display the connected wallet address and ETH balance, as well as connection status.
- Token Creation Form: Allows user to enter token name, symbol, and initial supply to submit to the TokenFactory contract.
- Token Creation Interaction: Upon token creation, the DApp interacts with the TokenFactory contract, displaying transaction status and the new token's address.
- My Tokens Dashboard: Lists all tokens created by the connected user, showing token details such as name, symbol, address, and balance. Includes functionality to copy the token address to the clipboard.
- Token Management: Provides the capability to mint additional tokens (if the user is the token owner) and transfer tokens to another address.
- DEX Integration: Interface to create a trading pair for a token and another token like ETH on a DEX (e.g., Uniswap). Add or remove liquidity from existing pairs, with a simple swap interface.
- Gas Fee Estimator: Using the installed AI Tool, gas fees are estimated to determine the current estimated charge and to optimize gas fees when performing transactions.
- Network Availability: DApp is only available base mainnet and base sepolia testnet. Base Mainnet contract address is 0xE1F32066C91a7b4F9Ffe5A5c9C655d93FCaF3e60 and Base Sepolia Testnet contract address is 0x42914FF413a96244228aCA257D3Dc5F856fb1F30

## Style Guidelines:

- Primary color: HSL 120, 70%, 50% (Lime Green), evoking trust and security.
- Background color: HSL 210, 20%, 15% (RGB: #242938), providing a modern dark theme.
- Accent color: HSL 180, 60%, 60% (RGB: #40BFBF), complementing the primary with a fresh highlight.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern, machined, objective, neutral look. It will be suitable for headlines or body text
- Modern line icons representing token functions (mint, transfer, swap, add liquidity), plus external links (block explorer).
- Card-based layout with a dark theme. Sections include: Wallet Connection, Token Creation, My Tokens, Token Management, and DEX Integration.
- Subtle transitions for loading states and confirmations, enhancing the user experience without being intrusive.