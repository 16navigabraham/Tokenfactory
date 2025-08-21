
import { ethers } from "ethers";
import type { BigNumber } from "ethers";

// =============================================================================
// VERIFIED CONTRACT ADDRESSES FOR BASE SEPOLIA
// =============================================================================

const WORKING_BASE_SEPOLIA_CONTRACTS = {
    // Using Pancake V2 Router/Factory as they are reliable on testnets
    factory: "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E", 
    weth: "0x4200000000000000000000000000000000000006",
    networkName: "Base Sepolia"
};


// =============================================================================
// ABIs FOR DIRECT PAIR INTERACTION
// =============================================================================

const PAIR_ABI = [
    "function token0() external view returns (address)",
    "function token1() external view returns (address)", 
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function mint(address to) external returns (uint liquidity)",
    "function burn(address to) external returns (uint amount0, uint amount1)",
    "function sync() external",
    "function balanceOf(address owner) external view returns (uint)",
    "function totalSupply() external view returns (uint)"
];

const SIMPLE_FACTORY_ABI = [
    "function createPair(address tokenA, address tokenB) external returns (address pair)",
    "function getPair(address tokenA, address tokenB) external view returns (address)",
    "function allPairs(uint) external view returns (address)",
    "function allPairsLength() external view returns (uint)"
];

const ERC20_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];

const WETH_ABI = [
    "function deposit() external payable",
    "function transfer(address to, uint256 amount) external returns (bool)"
];

// =============================================================================
// DIRECT LIQUIDITY MANAGER (NO ROUTER NEEDED)
// =============================================================================

export class BaseLiquidityManager {
    provider: ethers.providers.Web3Provider;
    signer: ethers.Signer;
    chainId: number;
    factoryAddress: string;
    wethAddress: string;
    factoryContract: ethers.Contract;

    constructor(provider: ethers.providers.Web3Provider, chainId: number) {
        this.provider = provider;
        this.signer = provider.getSigner();
        this.chainId = chainId;
        
        if (this.chainId !== 84532 && this.chainId !== 8453) {
             throw new Error("This implementation is for Base networks only.");
        }
        
        // This is a simplified manager, we can use the same factory for both for now.
        // A more robust implementation would check chainId and select contracts.
        this.factoryAddress = WORKING_BASE_SEPOLIA_CONTRACTS.factory;
        this.wethAddress = WORKING_BASE_SEPOLIA_CONTRACTS.weth;
        
        this.factoryContract = new ethers.Contract(this.factoryAddress, SIMPLE_FACTORY_ABI, this.signer);
    }
    
    // =============================================================================
    // PAIR MANAGEMENT
    // =============================================================================
    
    async getPairAddress(tokenA: string, tokenB: string): Promise<string> {
        try {
            const pairAddress = await this.factoryContract.getPair(tokenA, tokenB);
            return pairAddress;
        } catch (error) {
            console.error("Error getting pair address:", error);
            return ethers.constants.AddressZero;
        }
    }
    
    async createPair(tokenA: string, tokenB: string) {
        try {
            console.log(`Creating pair: ${tokenA} / ${tokenB}`);
            const tx = await this.factoryContract.createPair(tokenA, tokenB);
            const receipt = await tx.wait();
            console.log(`✅ Pair created: ${receipt.transactionHash}`);
            return receipt;
        } catch (error) {
            console.error("Error creating pair:", error);
            throw error;
        }
    }

    // =============================================================================
    // ETH TO WETH HANDLING
    // =============================================================================

    async wrapAndTransfer(ethAmount: BigNumber, toAddress: string, userAddress: string) {
        try {
            const wethContract = new ethers.Contract(this.wethAddress, WETH_ABI, this.signer);
            
            // Wrap ETH to WETH
            const depositTx = await wethContract.deposit({ value: ethAmount });
            await depositTx.wait();
            
            // Transfer WETH to pair
            const transferTx = await wethContract.transfer(toAddress, ethAmount);
            await transferTx.wait();

            console.log("✅ ETH wrapped and transferred");
        } catch (error) {
            console.error("Error wrapping ETH:", error);
            throw error;
        }
    }

    // =============================================================================
    // DIRECT LIQUIDITY ADDITION WORKFLOW
    // =============================================================================
    
    async addLiquidityDirect(tokenAddress: string, tokenAmount: BigNumber, ethAmount: BigNumber, userAddress: string, toast: any) {
         try {
            toast.update({id: toast.id, title: "🚀 Starting Liquidity Addition..."});

            // Step 1: Check if pair exists, create if not
            let pairAddress = await this.getPairAddress(tokenAddress, this.wethAddress);
            if (pairAddress === ethers.constants.AddressZero) {
                toast.update({id: toast.id, title: "Pair not found, creating..."});
                await this.createPair(tokenAddress, this.wethAddress);
                pairAddress = await this.getPairAddress(tokenAddress, this.wethAddress);
                if (pairAddress === ethers.constants.AddressZero) {
                    throw new Error("Failed to create and retrieve pair.");
                }
            }
            toast.update({id: toast.id, title: "Pair found!", description: `Address: ${pairAddress.slice(0,10)}...`});

            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
            const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.signer);

            // Step 2: Transfer tokens to the pair contract
            toast.update({id: toast.id, title: `Transferring Tokens to Pair...`});
            const transferTokenTx = await tokenContract.transfer(pairAddress, tokenAmount);
            await transferTokenTx.wait();
            
            // Step 3: Wrap ETH and transfer to pair contract
            toast.update({id: toast.id, title: `Wrapping ETH...`});
            await this.wrapAndTransfer(ethAmount, pairAddress, userAddress);
            
            // Step 4: Call mint on the pair to get LP tokens
            toast.update({id: toast.id, title: `Minting LP Tokens...`});
            const mintTx = await pairContract.mint(userAddress);
            const receipt = await mintTx.wait();
            
            return { success: true, transactionHash: receipt.transactionHash };

         } catch (error: any) {
            console.error("Direct liquidity addition failed:", error);
            const message = error.reason || error.message || "An unknown error occurred.";
            throw new Error(`Direct liquidity failed: ${message}`);
         }
    }
    
    // =============================================================================
    // MAIN WORKFLOW FUNCTION
    // =============================================================================
    
    async addLiquidityWorkflow(params: {
        tokenAddress: string,
        tokenAmount: string,
        ethAmount: string,
        userAddress: string,
        slippage?: number, // Not used in direct method, but kept for interface consistency
        toast: any,
    }) {
        const {
            tokenAddress,
            tokenAmount,
            ethAmount,
            userAddress,
            toast
        } = params;
        
        try {
            const tokenAmountParsed = ethers.utils.parseEther(tokenAmount);
            const ethAmountParsed = ethers.utils.parseEther(ethAmount);

            // Balance Checks
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
            const tokenBalance = await tokenContract.balanceOf(userAddress);
            if (tokenBalance.lt(tokenAmountParsed)) {
                throw new Error(`Insufficient token balance.`);
            }

            const ethBalance = await this.provider.getBalance(userAddress);
            if (ethBalance.lt(ethAmountParsed)) {
                 throw new Error(`Insufficient ETH balance.`);
            }

            return await this.addLiquidityDirect(
                tokenAddress,
                tokenAmountParsed,
                ethAmountParsed,
                userAddress,
                toast
            );
            
        } catch (error: any) {
            console.error("❌ Liquidity workflow failed:", error);
            throw error;
        }
    }
}
