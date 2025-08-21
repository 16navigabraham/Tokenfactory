
import { ethers } from "ethers";
import type { BigNumber } from "ethers";

// =============================================================================
// VERIFIED CONTRACT ADDRESSES FOR BASE NETWORKS
// =============================================================================

const BASE_NETWORK_CONTRACTS = {
    // Base Mainnet (Chain ID: 8453)
    8453: {
        router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", // Uniswap V2 Router
        factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6", // Uniswap V2 Factory
        weth: "0x4200000000000000000000000000000000000006",
        networkName: "Base Mainnet"
    },
    
    // Base Sepolia Testnet (Chain ID: 84532)
    84532: {
        router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", // Uniswap V2 Router
        factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6", // Uniswap V2 Factory
        weth: "0x4200000000000000000000000000000000000006",
        networkName: "Base Sepolia"
    }
};


// =============================================================================
// ABIs
// =============================================================================

const ROUTER_ABI = [
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function WETH() external pure returns (address)",
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
];

// =============================================================================
// BASE LIQUIDITY MANAGER CLASS
// =============================================================================

export class BaseLiquidityManager {
    provider: ethers.providers.Web3Provider;
    signer: ethers.Signer;
    chainId: number;
    routerAddress: string;
    factoryAddress: string;
    wethAddress: string;
    routerContract: ethers.Contract;

    constructor(provider: ethers.providers.Web3Provider, chainId: number) {
        this.provider = provider;
        this.signer = provider.getSigner();
        this.chainId = chainId;
        
        const contracts = BASE_NETWORK_CONTRACTS[this.chainId as keyof typeof BASE_NETWORK_CONTRACTS];
        if (!contracts) {
             throw new Error(`Unsupported network. Please switch to Base Mainnet or Base Sepolia. Current: ${this.chainId}`);
        }
        
        this.routerAddress = contracts.router;
        this.factoryAddress = contracts.factory;
        this.wethAddress = contracts.weth;
        
        this.routerContract = new ethers.Contract(this.routerAddress, ROUTER_ABI, this.signer);
    }
    
    private getDeadline(minutesFromNow: number = 20): number {
        return Math.floor(Date.now() / 1000) + minutesFromNow * 60;
    }

    private async approveToken(tokenAddress: string, amount: BigNumber, owner: string): Promise<void> {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
        const allowance = await tokenContract.allowance(owner, this.routerAddress);
        if (allowance.lt(amount)) {
            const tx = await tokenContract.approve(this.routerAddress, ethers.constants.MaxUint256);
            await tx.wait();
        }
    }

    async addLiquidityETH(tokenAddress: string, tokenAmount: string, ethAmount: string, userAddress: string) {
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
            const decimals = await tokenContract.decimals();
            const tokenAmountParsed = ethers.utils.parseUnits(tokenAmount, decimals);
            const ethAmountParsed = ethers.utils.parseEther(ethAmount);

            await this.approveToken(tokenAddress, tokenAmountParsed, userAddress);
            
            const tx = await this.routerContract.addLiquidityETH(
                tokenAddress,
                tokenAmountParsed,
                0, // slippage is handled on the frontend or set to 0 for simplicity here
                0,
                userAddress,
                this.getDeadline(),
                { value: ethAmountParsed }
            );

            const receipt = await tx.wait();
            return { success: true, transactionHash: receipt.transactionHash };

        } catch (error: any) {
            console.error("Error adding liquidity:", error);
            const message = error.reason || error.message || "An unknown error occurred.";
            throw new Error(`Failed to add liquidity: ${message}`);
        }
    }
    
    async getAmountsOut(fromToken: string, toToken: string, amountIn: string): Promise<string> {
        const fromIsEth = fromToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
        const toIsEth = toToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

        const fromAddress = fromIsEth ? this.wethAddress : fromToken;
        const toAddress = toIsEth ? this.wethAddress : toToken;

        const fromContract = new ethers.Contract(fromAddress, ERC20_ABI, this.provider);
        const fromDecimals = await fromContract.decimals();
        const amountInParsed = ethers.utils.parseUnits(amountIn, fromDecimals);

        const amountsOut = await this.routerContract.getAmountsOut(amountInParsed, [fromAddress, toAddress]);

        const toContract = new ethers.Contract(toAddress, ERC20_ABI, this.provider);
        const toDecimals = await toContract.decimals();

        return ethers.utils.formatUnits(amountsOut[1], toDecimals);
    }

    async swapExactETHForTokens(toTokenAddress: string, ethAmount: string, userAddress: string) {
        const ethAmountParsed = ethers.utils.parseEther(ethAmount);
        
        const tx = await this.routerContract.swapExactETHForTokens(
            0, // amountOutMin
            [this.wethAddress, toTokenAddress],
            userAddress,
            this.getDeadline(),
            { value: ethAmountParsed }
        );
        const receipt = await tx.wait();
        return { success: true, transactionHash: receipt.transactionHash };
    }

    async swapExactTokensForETH(fromTokenAddress: string, tokenAmount: string, userAddress: string) {
        const tokenContract = new ethers.Contract(fromTokenAddress, ERC20_ABI, this.signer);
        const decimals = await tokenContract.decimals();
        const tokenAmountParsed = ethers.utils.parseUnits(tokenAmount, decimals);

        await this.approveToken(fromTokenAddress, tokenAmountParsed, userAddress);

        const tx = await this.routerContract.swapExactTokensForETH(
            tokenAmountParsed,
            0, // amountOutMin
            [fromTokenAddress, this.wethAddress],
            userAddress,
            this.getDeadline()
        );
        const receipt = await tx.wait();
        return { success: true, transactionHash: receipt.transactionHash };
    }
    
    async swapExactTokensForTokens(fromTokenAddress: string, toTokenAddress: string, tokenAmount: string, userAddress: string) {
        const tokenContract = new ethers.Contract(fromTokenAddress, ERC20_ABI, this.signer);
        const decimals = await tokenContract.decimals();
        const tokenAmountParsed = ethers.utils.parseUnits(tokenAmount, decimals);

        await this.approveToken(fromTokenAddress, tokenAmountParsed, userAddress);

        const tx = await this.routerContract.swapExactTokensForTokens(
            tokenAmountParsed,
            0, // amountOutMin
            [fromTokenAddress, toTokenAddress],
            userAddress,
            this.getDeadline()
        );
        const receipt = await tx.wait();
        return { success: true, transactionHash: receipt.transactionHash };
    }
}

    