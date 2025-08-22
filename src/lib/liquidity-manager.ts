
import { ethers, type BigNumber } from "ethers";

// =============================================================================
// STEP 1: NETWORK CONFIGURATION - UPDATED WITH BASESWAP CONTRACTS
// =============================================================================

const NETWORK_CONFIG = {
    // Base Mainnet (Chain ID: 8453) - Using BaseSwap
    8453: {
        name: "Base Mainnet",
        rpcUrl: "https://mainnet.base.org",
        explorer: "https://basescan.org",
        router: "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86",
        factory: "0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB",
        weth: "0x4200000000000000000000000000000000000006"
    },
    
    // Base Sepolia Testnet (Chain ID: 84532) - Using BaseSwap
    84532: {
        name: "Base Sepolia",
        rpcUrl: "https://sepolia.base.org",
        explorer: "https://sepolia.basescan.org",
        router: "0x4200000000000000000000000000000000000024", // Incorrect, but placeholder. Using a known working one for now.
        factory: "0x4200000000000000000000000000000000000008",// Incorrect, but placeholder
        weth: "0x4200000000000000000000000000000000000006"
    }
};

// =============================================================================
// STEP 2: CONTRACT ABIs
// =============================================================================

const ROUTER_ABI = [
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
    "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
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
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function name() external view returns (string)"
];

// =============================================================================
// STEP 3: MAIN LIQUIDITY MANAGER CLASS
// =============================================================================

export class BaseLiquidityManager {
    provider: ethers.providers.Web3Provider | null = null;
    signer: ethers.Signer | null = null;
    userAddress: string | null = null;
    chainId: number | null = null;
    networkConfig: any = null;
    contracts: any = {};
    onStep: (message: string) => void = () => {};

    // =========================================================================
    // STEP 3A: INITIALIZE Ethers.js CONNECTION
    // =========================================================================
    async initialize(provider: ethers.providers.Web3Provider, onStepCallback?: (message: string) => void) {
        if (onStepCallback) this.onStep = onStepCallback;
        this.onStep("🚀 STEP 1: Initializing Connection...");

        if (!provider) {
            throw new Error("❌ Provider is not available. Please connect your wallet.");
        }
        
        this.provider = provider;
        this.signer = this.provider.getSigner();
        this.userAddress = await this.signer.getAddress();
        
        const network = await this.provider.getNetwork();
        this.chainId = network.chainId;
        
        if (![8453, 84532].includes(this.chainId)) {
            throw new Error(`❌ Unsupported network. Please switch to Base Mainnet (8453) or Base Sepolia (84532). Current: ${this.chainId}`);
        }
        
        this.networkConfig = NETWORK_CONFIG[this.chainId as keyof typeof NETWORK_CONFIG];
        
        this.onStep(`✅ Connected to ${this.networkConfig.name}`);
        console.log(`📍 User Address: ${this.userAddress}`);
        console.log(`🔗 Chain ID: ${this.chainId}`);
        
        return true;
    }

    // =========================================================================
    // STEP 3B: VERIFY CONTRACTS EXIST
    // =========================================================================
    async verifyContracts() {
        this.onStep("🔍 STEP 2: Verifying contract addresses...");
        if (!this.provider) throw new Error("Provider not initialized");
        
        try {
            const routerCode = await this.provider.getCode(this.networkConfig.router);
            if (routerCode === "0x") {
                throw new Error(`Router contract not found at ${this.networkConfig.router}`);
            }
            
            const factoryCode = await this.provider.getCode(this.networkConfig.factory);
            if (factoryCode === "0x") {
                throw new Error(`Factory contract not found at ${this.networkConfig.factory}`);
            }
            
            this.contracts.router = new ethers.Contract(this.networkConfig.router, ROUTER_ABI, this.signer);
            this.contracts.factory = new ethers.Contract(this.networkConfig.factory, FACTORY_ABI, this.signer);
            
            const pairsLength = await this.contracts.factory.allPairsLength();
            const wethAddress = await this.contracts.router.WETH();
            
            this.onStep("✅ Contracts verified successfully.");
            console.log(`✅ Router verified: ${this.networkConfig.router}`);
            console.log(`✅ Factory verified: ${this.networkConfig.factory}`);
            console.log(`📊 Total pairs in factory: ${pairsLength}`);
            console.log(`💎 WETH address: ${wethAddress}`);
            
            return true;
        } catch (error: any) {
            console.error("❌ Contract verification failed:", error);
            throw new Error(`Contract verification failed: ${error.message}`);
        }
    }

    // =========================================================================
    // STEP 4: CHECK IF TOKEN PAIR EXISTS
    // =========================================================================
    async checkPairExists(tokenA: string, tokenB: string) {
        this.onStep("🔍 STEP 3: Checking if token pair exists...");
        
        try {
            const pairAddress = await this.contracts.factory.getPair(tokenA, tokenB);
            const exists = pairAddress !== ethers.constants.AddressZero;
            
            this.onStep(`Pair ${exists ? 'exists' : 'does not exist'}.`);
            console.log(`Token A: ${tokenA}`);
            console.log(`Token B: ${tokenB}`);
            console.log(`Pair ${exists ? 'EXISTS' : 'DOES NOT EXIST'} at: ${pairAddress}`);
            
            return { exists, pairAddress };
        } catch (error: any) {
            console.error("❌ Error checking pair:", error);
            throw new Error(`Error checking pair: ${error.message}`);
        }
    }

    // =========================================================================
    // STEP 5: CREATE NEW TOKEN PAIR
    // =========================================================================
    async createPair(tokenA: string, tokenB: string) {
        this.onStep("🏗️ STEP 4: Creating new token pair...");
        if (!this.signer) throw new Error("Signer not initialized");
        
        try {
            const { exists } = await this.checkPairExists(tokenA, tokenB);
            if (exists) {
                this.onStep("Pair already exists. Skipping creation.");
                return { success: true, skipped: true };
            }
            
            this.onStep("📝 Sending createPair transaction...");
            
            const tx = await this.contracts.factory.createPair(tokenA, tokenB);
            this.onStep("Transaction sent, awaiting confirmation...");
            const receipt = await tx.wait();
            
            this.onStep("✅ Pair created successfully!");
            console.log(`📝 Transaction: ${receipt.transactionHash}`);
            
            const { pairAddress } = await this.checkPairExists(tokenA, tokenB);
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                pairAddress
            };
        } catch (error: any) {
            console.error("❌ Error creating pair:", error);
            throw new Error(`Error creating pair: ${error.message}`);
        }
    }

    // =========================================================================
    // STEP 7: APPROVE TOKEN SPENDING
    // =========================================================================
    async approveToken(tokenAddress: string, amount: BigNumber) {
        this.onStep("✅ STEP 5: Approving token for router...");
        if (!this.userAddress || !this.signer) throw new Error("Manager not initialized");

        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
            
            const currentAllowance = await tokenContract.allowance(
                this.userAddress, 
                this.networkConfig.router
            );
            
            if (currentAllowance.gte(amount)) {
                this.onStep("✅ Sufficient allowance exists.");
                return { success: true, skipApproval: true };
            }
            
            this.onStep("📝 Sending approval transaction...");
            const tx = await tokenContract.approve(this.networkConfig.router, amount);
            await tx.wait();
            
            this.onStep("✅ Token approved successfully!");
            return { success: true, transactionHash: tx.hash };
        } catch (error: any) {
            console.error("❌ Error approving token:", error);
            throw new Error(`Token approval failed: ${error.message}`);
        }
    }

    // =========================================================================
    // STEP 8: ADD LIQUIDITY (TOKEN + ETH)
    // =========================================================================
    async addLiquidityETH(tokenAddress: string, tokenAmount: BigNumber, ethAmount: BigNumber, slippagePercent = 2) {
        this.onStep("💧 STEP 6: Adding liquidity...");
        if (!this.userAddress || !this.signer) throw new Error("Manager not initialized");
        
        try {
            const minTokenAmount = tokenAmount.mul(100 - slippagePercent).div(100);
            const minEthAmount = ethAmount.mul(100 - slippagePercent).div(100);
            const deadline = Math.floor(Date.now() / 1000) + (20 * 60);
            
            this.onStep("📝 Sending addLiquidityETH transaction...");
            
            const tx = await this.contracts.router.addLiquidityETH(
                tokenAddress,
                tokenAmount,
                minTokenAmount,
                minEthAmount,
                this.userAddress,
                deadline,
                { value: ethAmount }
            );
            
            await tx.wait();
            this.onStep("✅ Liquidity added successfully!");
            return { success: true, transactionHash: tx.hash };
        } catch (error: any) {
            console.error("❌ Error adding liquidity:", error);
            throw new Error(`Failed to add liquidity: ${error.message}`);
        }
    }

    // =========================================================================
    // STEP 9: COMPLETE WORKFLOW
    // =========================================================================
    async completeWorkflow(params: {
        provider: ethers.providers.Web3Provider,
        tokenAddress: string,
        tokenAmountInEther: string,
        ethAmountInEther: string,
        slippage?: number,
        createPairIfNeeded?: boolean,
        onStep?: (message: string) => void
    }) {
        const {
            provider,
            tokenAddress,
            tokenAmountInEther,
            ethAmountInEther,
            slippage = 2,
            createPairIfNeeded = true,
            onStep
        } = params;
        
        try {
            await this.initialize(provider, onStep);
            await this.verifyContracts();
            
            const { exists } = await this.checkPairExists(tokenAddress, this.networkConfig.weth);
            
            if (!exists && createPairIfNeeded) {
                await this.createPair(tokenAddress, this.networkConfig.weth);
            } else if (!exists) {
                throw new Error("Pair does not exist and createPairIfNeeded is false");
            }
            
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
            const decimals = await tokenContract.decimals();
            const tokenAmount = ethers.utils.parseUnits(tokenAmountInEther, decimals);
            const ethAmount = ethers.utils.parseEther(ethAmountInEther);
            
            await this.approveToken(tokenAddress, tokenAmount);
            
            const result = await this.addLiquidityETH(tokenAddress, tokenAmount, ethAmount, slippage);
            
            this.onStep("🎉 WORKFLOW COMPLETED SUCCESSFULLY!");
            return result;
            
        } catch (error: any) {
            this.onStep(`❌ WORKFLOW FAILED: ${error.message}`);
            throw error;
        }
    }
    
    // =========================================================================
    // SWAP FUNCTIONS
    // =========================================================================
    
    async getAmountsOut(fromToken: string, toToken: string, amountIn: string): Promise<string> {
        if (!this.provider) throw new Error("Provider not initialized");
        const fromIsEth = fromToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
        const toIsEth = toToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

        const fromAddress = fromIsEth ? this.networkConfig.weth : fromToken;
        const toAddress = toIsEth ? this.networkConfig.weth : toToken;

        const fromContract = new ethers.Contract(fromAddress, ERC20_ABI, this.provider);
        const fromDecimals = await fromContract.decimals();
        const amountInParsed = ethers.utils.parseUnits(amountIn, fromDecimals);

        const amountsOut = await this.contracts.router.getAmountsOut(amountInParsed, [fromAddress, toAddress]);

        const toContract = new ethers.Contract(toAddress, ERC20_ABI, this.provider);
        const toDecimals = await toContract.decimals();

        return ethers.utils.formatUnits(amountsOut[1], toDecimals);
    }
    
    async swapExactETHForTokens(toTokenAddress: string, ethAmount: string) {
        if (!this.signer || !this.userAddress) throw new Error("Manager not initialized");
        const ethAmountParsed = ethers.utils.parseEther(ethAmount);
        
        const tx = await this.contracts.router.swapExactETHForTokens(
            0, // amountOutMin
            [this.networkConfig.weth, toTokenAddress],
            this.userAddress,
            Math.floor(Date.now() / 1000) + 60 * 20,
            { value: ethAmountParsed }
        );
        const receipt = await tx.wait();
        return { success: true, transactionHash: receipt.transactionHash };
    }

    async swapExactTokensForETH(fromTokenAddress: string, tokenAmount: string) {
         if (!this.signer || !this.userAddress) throw new Error("Manager not initialized");
        const tokenContract = new ethers.Contract(fromTokenAddress, ERC20_ABI, this.signer);
        const decimals = await tokenContract.decimals();
        const tokenAmountParsed = ethers.utils.parseUnits(tokenAmount, decimals);

        await this.approveToken(fromTokenAddress, tokenAmountParsed);

        const tx = await this.contracts.router.swapExactTokensForETH(
            tokenAmountParsed,
            0, // amountOutMin
            [fromTokenAddress, this.networkConfig.weth],
            this.userAddress,
            Math.floor(Date.now() / 1000) + 60 * 20
        );
        const receipt = await tx.wait();
        return { success: true, transactionHash: receipt.transactionHash };
    }
    
    async swapExactTokensForTokens(fromTokenAddress: string, toTokenAddress: string, tokenAmount: string) {
        if (!this.signer || !this.userAddress) throw new Error("Manager not initialized");
        const tokenContract = new ethers.Contract(fromTokenAddress, ERC20_ABI, this.signer);
        const decimals = await tokenContract.decimals();
        const tokenAmountParsed = ethers.utils.parseUnits(tokenAmount, decimals);

        await this.approveToken(fromTokenAddress, tokenAmountParsed);

        const tx = await this.contracts.router.swapExactTokensForTokens(
            tokenAmountParsed,
            0, // amountOutMin
            [fromTokenAddress, toTokenAddress],
            this.userAddress,
            Math.floor(Date.now() / 1000) + 60 * 20
        );
        const receipt = await tx.wait();
        return { success: true, transactionHash: receipt.transactionHash };
    }
}
