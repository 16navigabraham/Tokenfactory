
import { ethers } from "ethers";
import type { BigNumber } from "ethers";

// =============================================================================
// VERIFIED CONTRACT ADDRESSES FOR BASE NETWORKS
// =============================================================================

const BASE_NETWORK_CONTRACTS = {
    // Base Mainnet (Chain ID: 8453)
    8453: {
        // Uniswap V2 Router on Base (Most reliable)
        router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
        factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
        
        // Alternative: BaseSwap
        baseswapRouter: "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86",
        baseswapFactory: "0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB",
        
        weth: "0x4200000000000000000000000000000000000006",
        networkName: "Base Mainnet"
    },
    
    // Base Sepolia Testnet (Chain ID: 84532)
    84532: {
        // Working Uniswap V2 contracts on Base Sepolia
        router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", 
        factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
        
        weth: "0x4200000000000000000000000000000000000006",
        networkName: "Base Sepolia"
    }
};

// =============================================================================
// CORRECT ABIs FOR BASE NETWORKS
// =============================================================================

const ROUTER_ABI = [
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
    "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
    "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function factory() external pure returns (address)",
    "function WETH() external pure returns (address)"
];

const FACTORY_ABI = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)",
    "function createPair(address tokenA, address tokenB) external returns (address pair)",
    "function allPairs(uint) external view returns (address pair)",
    "function allPairsLength() external view returns (uint)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function name() external view returns (string)"
];

// =============================================================================
// BASE LIQUIDITY MANAGER CLASS - PRODUCTION READY
// =============================================================================

export class BaseLiquidityManager {
    provider: ethers.providers.Web3Provider;
    signer: ethers.Signer;
    chainId: number;
    contracts: typeof BASE_NETWORK_CONTRACTS[8453] | typeof BASE_NETWORK_CONTRACTS[84532];
    routerContract: ethers.Contract;
    factoryContract: ethers.Contract;

    constructor(provider: ethers.providers.Web3Provider, chainId: number) {
        this.provider = provider;
        this.chainId = chainId;
        
        if (![8453, 84532].includes(this.chainId)) {
            throw new Error(`Unsupported network. Please switch to Base Mainnet (8453) or Base Sepolia (84532). Current: ${this.chainId}`);
        }
        
        this.contracts = BASE_NETWORK_CONTRACTS[this.chainId];
        
        this.signer = this.provider.getSigner();
        
        this.routerContract = new ethers.Contract(this.contracts.router, ROUTER_ABI, this.signer);
        this.factoryContract = new ethers.Contract(this.contracts.factory, FACTORY_ABI, this.signer);
    }
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    toChecksumAddress(address: string) {
        return ethers.utils.getAddress(address.toLowerCase());
    }
    
    getDeadline(minutesFromNow = 20) {
        return Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
    }
    
    calculateMinAmount(amount: BigNumber, slippagePercent = 2): BigNumber {
        const slippage = ethers.BigNumber.from(slippagePercent * 10); // Use 10 for 1 decimal place precision
        const hundred = ethers.BigNumber.from(1000);
        return amount.mul(hundred.sub(slippage)).div(hundred);
    }
    
    // =============================================================================
    // PAIR MANAGEMENT
    // =============================================================================
    
    async checkPairExists(tokenA: string, tokenB: string) {
        try {
            const tokenAAddr = this.toChecksumAddress(tokenA);
            const tokenBAddr = this.toChecksumAddress(tokenB);
            
            const pairAddress = await this.factoryContract.getPair(tokenAAddr, tokenBAddr);
            const exists = pairAddress !== ethers.constants.AddressZero;
            
            return { exists, pairAddress };
            
        } catch (error: any) {
            console.error("Error checking pair:", error);
            throw new Error(`Failed to check pair: ${error.message}`);
        }
    }
    
    async createPair(tokenA: string, tokenB: string) {
        try {
            const tokenAAddr = this.toChecksumAddress(tokenA);
            const tokenBAddr = this.toChecksumAddress(tokenB);
            
            const { exists } = await this.checkPairExists(tokenAAddr, tokenBAddr);
            if (exists) {
                throw new Error("Pair already exists");
            }
            
            const tx = await this.factoryContract.createPair(tokenAAddr, tokenBAddr);
            const receipt = await tx.wait();
            const { pairAddress } = await this.checkPairExists(tokenAAddr, tokenBAddr);
            
            return {
                success: true,
                transactionHash: tx.hash,
                pairAddress,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (error: any) {
            console.error("Error creating pair:", error);
            throw new Error(`Failed to create pair: ${error.message}`);
        }
    }
    
    // =============================================================================
    // TOKEN OPERATIONS
    // =============================================================================
    
    async approveToken(tokenAddress: string, amount: BigNumber, userAddress: string) {
        try {
            const tokenAddr = this.toChecksumAddress(tokenAddress);
            const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, this.signer);
            
            const currentAllowance = await tokenContract.allowance(userAddress, this.contracts.router);
            
            if (currentAllowance.gte(amount)) {
                return { success: true, skipApproval: true };
            }
            
            const tx = await tokenContract.approve(this.contracts.router, amount);
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: tx.hash,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (error: any) {
            console.error("Error approving token:", error);
            throw new Error(`Failed to approve token: ${error.message}`);
        }
    }
    
    // =============================================================================
    // LIQUIDITY OPERATIONS
    // =============================================================================
    
    async addLiquidityETH(tokenAddress: string, tokenAmount: BigNumber, ethAmount: BigNumber, userAddress: string, slippage = 2) {
        try {
            const tokenAddr = this.toChecksumAddress(tokenAddress);
            
            const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, this.provider);
            const tokenBalance = await tokenContract.balanceOf(userAddress);
            const ethBalance = await this.provider.getBalance(userAddress);

            if (tokenBalance.lt(tokenAmount)) {
                throw new Error(`Insufficient token balance.`);
            }
            if (ethBalance.lt(ethAmount)) {
                throw new Error(`Insufficient ETH balance.`);
            }
            
            await this.approveToken(tokenAddr, tokenAmount, userAddress);
            
            const minTokenAmount = this.calculateMinAmount(tokenAmount, slippage);
            const minEthAmount = this.calculateMinAmount(ethAmount, slippage);
            const deadline = this.getDeadline();
            
            const tx = await this.routerContract.addLiquidityETH(
                tokenAddr,
                tokenAmount,
                minTokenAmount,
                minEthAmount,
                userAddress,
                deadline,
                { value: ethAmount }
            );
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: tx.hash,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (error: any) {
            console.error("Error adding liquidity:", error);
            throw new Error(`Failed to add liquidity: ${error.message}`);
        }
    }
    
    // =============================================================================
    // COMPLETE WORKFLOW
    // =============================================================================
    
    async addLiquidityWorkflow(params: {
        tokenAddress: string,
        tokenAmount: string,
        ethAmount: string,
        userAddress: string,
        slippage?: number,
        createPairIfNeeded?: boolean,
        toast: any,
    }) {
        const {
            tokenAddress,
            tokenAmount,
            ethAmount,
            userAddress,
            slippage = 2,
            createPairIfNeeded = true,
            toast
        } = params;
        
        try {
            const tokenAmountParsed = ethers.utils.parseUnits(tokenAmount, 18); // Assuming 18 decimals
            const ethAmountParsed = ethers.utils.parseEther(ethAmount);

            toast.update({id: toast.id, title: "Checking for existing pair..."});
            const { exists } = await this.checkPairExists(tokenAddress, this.contracts.weth);
            
            if (!exists && createPairIfNeeded) {
                toast.update({id: toast.id, title: "Pair not found", description: "Creating a new trading pair..."});
                const createResult = await this.createPair(tokenAddress, this.contracts.weth);
                toast.update({id: toast.id, title: "Pair Created!", description: `Tx: ${createResult.transactionHash?.slice(0,10)}...`});
            } else if (!exists) {
                throw new Error("Pair does not exist and auto-creation is disabled.");
            }
            
            toast.update({id: toast.id, title: "Approving Tokens...", description: "Please confirm in your wallet."});
            await this.approveToken(tokenAddress, tokenAmountParsed, userAddress);

            toast.update({id: toast.id, title: "Adding Liquidity...", description: "Please confirm the final transaction."});
            const result = await this.addLiquidityETH(
                tokenAddress,
                tokenAmountParsed,
                ethAmountParsed,
                userAddress,
                slippage
            );
            
            return result;
            
        } catch (error: any) {
            console.error("❌ Liquidity workflow failed:", error);
            throw error;
        }
    }
}

    