
"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import { ethers } from "ethers";
import type { Token } from "@/types";
import { SUPPORTED_CHAINS, TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, TOKEN_ABI, UNISWAP_V2_ROUTER_ABI } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextType {
  address: string | null;
  chainId: number | null;
  balance: string;
  isConnecting: boolean;
  tokens: Token[];
  loadingTokens: boolean;
  network: typeof SUPPORTED_CHAINS[number] | null;
  provider: ethers.providers.Web3Provider | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  createToken: (name: string, symbol: string, initialSupply: number) => Promise<boolean>;
  mintTokens: (tokenAddress: string, amount: number) => Promise<boolean>;
  transferTokens: (tokenAddress: string, recipient: string, amount: number) => Promise<boolean>;
  addLiquidity: (tokenA: Token, tokenB: Token, amountA: number, amountB: number) => Promise<boolean>;
  getGasPrice: () => Promise<number | null>;
  refreshTokens: () => void;
}

export const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isConnecting, setIsConnecting] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const { toast } = useToast();

  const network = useMemo(() => SUPPORTED_CHAINS.find(c => c.id === chainId) || null, [chainId]);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setBalance("0");
    setChainId(null);
    setTokens([]);
    setProvider(null);
    toast({ title: "Wallet Disconnected" });
  }, [toast]);

  const updateBalance = useCallback(async (prov: ethers.providers.Web3Provider, addr: string) => {
    try {
      const balanceWei = await prov.getBalance(addr);
      setBalance(ethers.utils.formatEther(balanceWei));
    } catch (error) {
      console.error("Failed to get balance:", error);
      setBalance("0");
    }
  }, []);
  
  const handleStateUpdate = useCallback((newProvider: ethers.providers.Web3Provider, newAddress: string, newChainId: number) => {
      setProvider(newProvider);
      setAddress(newAddress);
      setChainId(newChainId);
      updateBalance(newProvider, newAddress);
  },[updateBalance]);

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      toast({ variant: "destructive", title: "MetaMask not found", description: "Please install MetaMask to use this app." });
      return;
    }
    
    setIsConnecting(true);
    try {
      const newProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
      
      await newProvider.send("eth_requestAccounts", []);
      const signer = newProvider.getSigner();
      const newAddress = await signer.getAddress();
      const networkInfo = await newProvider.getNetwork();

      handleStateUpdate(newProvider, newAddress, networkInfo.chainId);

    } catch (error: any) {
      console.error("Failed to connect wallet", error);
      if (error.code === 4001) {
         toast({ variant: "destructive", title: "Connection rejected", description: "You rejected the connection request in MetaMask." });
      } else {
        toast({ variant: "destructive", title: "Connection failed", description: "Could not connect to MetaMask. Please try again." });
      }
      disconnectWallet();
    } finally {
      setIsConnecting(false);
    }
  }, [toast, disconnectWallet, handleStateUpdate]);

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length > 0) {
        const newProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
        const signer = newProvider.getSigner();
        const newAddress = await signer.getAddress();
        const networkInfo = await newProvider.getNetwork();
        handleStateUpdate(newProvider, newAddress, networkInfo.chainId);
    } else {
      disconnectWallet();
    }
  }, [disconnectWallet, handleStateUpdate]);

  const handleChainChanged = useCallback(() => {
    window.location.reload();
  }, []);
  
  const switchNetwork = useCallback(async (newChainId: number) => {
    if (!provider) return;
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${newChainId.toString(16)}` }]);
    } catch (error: any) {
      if (error.code === 4902) {
        toast({ variant: "destructive", title: "Network not added", description: "Please add the network to your MetaMask wallet." });
      } else {
        toast({ variant: "destructive", title: "Failed to switch network", description: "Please try switching networks from your wallet." });
      }
      console.error("Failed to switch network", error);
    }
  }, [provider, toast]);


  const refreshTokens = useCallback(async () => {
    if (!address || !provider || !network) return;
    setLoadingTokens(true);
    try {
        const factoryAddress = TOKEN_FACTORY_ADDRESS[network.id];
        if(!factoryAddress) {
            setTokens([]);
            setLoadingTokens(false);
            return;
        };
        const signer = provider.getSigner();
        const factory = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, signer);
        const ownedTokenAddresses = await factory.getMyTokens();

        const tokenDataPromises = ownedTokenAddresses.map(async (tokenAddress: string) => {
          try {
            const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
            const [name, symbol, balance, decimals] = await Promise.all([
                tokenContract.name(),
                tokenContract.symbol(),
                tokenContract.balanceOf(address),
                tokenContract.decimals()
            ]);
            return {
                name,
                symbol,
                address: tokenAddress,
                balance: ethers.utils.formatUnits(balance, decimals),
                decimals
            };
          } catch (error) {
            console.error(`Failed to fetch data for token ${tokenAddress}:`, error);
            return null;
          }
        });

        const settledTokenData = await Promise.all(tokenDataPromises);
        const validTokenData = settledTokenData.filter((data): data is Token => data !== null);

        setTokens(validTokenData);
    } catch (error) {
        console.error("Failed to refresh tokens:", error);
        toast({ variant: "destructive", title: "Error fetching tokens", description: "Could not fetch your token list." });
    } finally {
        setLoadingTokens(false);
    }
  }, [address, provider, network, toast]);
  
  const createToken = async (name: string, symbol: string, initialSupply: number): Promise<boolean> => {
     if (!provider || !address || !network) return false;
    
    const factoryAddress = TOKEN_FACTORY_ADDRESS[network.id];
    if(!factoryAddress) {
        toast({ variant: "destructive", title: "Unsupported Network", description: "The token factory is not deployed on this network." });
        return false;
    }
    
    try {
      const signer = provider.getSigner();
      const factory = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, signer);
      
      const supply = ethers.utils.parseUnits(initialSupply.toString(), 18); // Assuming 18 decimals for new tokens
      const tx = await factory.createToken(name, symbol, supply);
      
      toast({ title: "Transaction Submitted", description: "Waiting for confirmation..." });
      await tx.wait();
      toast({ title: "Success!", description: "Token created successfully." });

      refreshTokens();
      return true;
    } catch(error: any) {
      console.error("Token creation failed:", error);
      const message = error.reason || error.message || "An unknown error occurred.";
      toast({ variant: "destructive", title: "Creation Failed", description: message });
      return false;
    }
  };

  const mintTokens = async (tokenAddress: string, amount: number): Promise<boolean> => {
    if (!provider || !address) return false;

    try {
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
        const decimals = await tokenContract.decimals();
        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals);

        const tx = await tokenContract.mint(address, parsedAmount);
        toast({ title: "Transaction Submitted", description: "Waiting for confirmation..." });
        await tx.wait();
        toast({ title: "Success!", description: "Tokens minted successfully." });
        refreshTokens();
        return true;
    } catch (error: any) {
        const message = error.reason || error.message || "An unknown error occurred.";
        toast({ variant: "destructive", title: "Minting Failed", description: message });
        return false;
    }
  };

  const transferTokens = async (tokenAddress: string, recipient: string, amount: number): Promise<boolean> => {
    if (!provider || !address) return false;

    try {
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
        const decimals = await tokenContract.decimals();
        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals);

        const tx = await tokenContract.transfer(recipient, parsedAmount);
        toast({ title: "Transaction Submitted", description: "Waiting for confirmation..." });
        await tx.wait();
        toast({ title: "Success!", description: "Tokens transferred successfully." });
        refreshTokens();
        return true;
    } catch (error: any) {
        const message = error.reason || error.message || "An unknown error occurred.";
        toast({ variant: "destructive", title: "Transfer Failed", description: message });
        return false;
    }
  };
  
  const addLiquidity = async (tokenA: Token, tokenB: Token, amountA: number, amountB: number): Promise<boolean> => {
    if (!provider || !address || !network || !network.dexRouter) {
      toast({ variant: "destructive", title: "Setup Error", description: "DEX router is not configured for this network." });
      return false;
    }

    let txToast: { id: string; dismiss: () => void; update: (props: any) => void; } | undefined;

    try {
      const signer = provider.getSigner();
      const router = new ethers.Contract(network.dexRouter, UNISWAP_V2_ROUTER_ABI, signer);

      const token = tokenA.isNative ? tokenB : tokenA;
      const tokenAmount = tokenA.isNative ? amountB : amountA;
      const ethAmount = tokenA.isNative ? amountA : amountB;
      
      const checksummedTokenAddress = ethers.utils.getAddress(token.address);

      const tokenContract = new ethers.Contract(checksummedTokenAddress, TOKEN_ABI, signer);
      const parsedTokenAmount = ethers.utils.parseUnits(tokenAmount.toString(), token.decimals);
      const parsedEthAmount = ethers.utils.parseEther(ethAmount.toString());

      const slippageBps = 500; // 500 basis points = 5%
      const amountTokenMin = parsedTokenAmount.sub(parsedTokenAmount.mul(slippageBps).div(10000));
      const amountETHMin = parsedEthAmount.sub(parsedEthAmount.mul(slippageBps).div(10000));
      
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

      // Approve router to spend token
      txToast = toast({ title: "Approving Token...", description: "Please confirm the transaction in your wallet." });
      const approveTx = await tokenContract.approve(network.dexRouter, parsedTokenAmount);
      
      if (txToast) {
        txToast.update({id: txToast.id, title: "Waiting for Approval...", description: "Your approval transaction is being confirmed."});
      }
      await approveTx.wait(); // Wait for the approval to be mined
      
      if (txToast) {
        txToast.update({id: txToast.id, title: "Approval Confirmed!", description: "Now adding liquidity..."});
      }

      const addLiquidityTx = await router.addLiquidityETH(
        checksummedTokenAddress,
        parsedTokenAmount,
        amountTokenMin,
        amountETHMin,
        address,
        deadline,
        { value: parsedEthAmount }
      );
      
      if (txToast) {
        txToast.update({id: txToast.id, title: "Transaction Submitted", description: "Waiting for final confirmation..." });
      }
      await addLiquidityTx.wait();
      
      if (txToast) {
        txToast.update({id: txToast.id, title: "Success!", description: "Liquidity added successfully."});
      }
      
      refreshTokens();
      return true;

    } catch (error: any) {
      console.error("Add liquidity failed:", error);
      const message = error.reason || (error.data ? error.data.message : null) || error.message || "An unknown error occurred.";
      const finalMessage = message.length > 100 ? message.substring(0, 100) + "..." : message;
      if (txToast) {
        txToast.update({id: txToast.id, variant: "destructive", title: "Add Liquidity Failed", description: finalMessage });
      } else {
        toast({ variant: "destructive", title: "Add Liquidity Failed", description: finalMessage });
      }
      return false;
    }
  };
  
  const getGasPrice = useCallback(async (): Promise<number | null> => {
    if (!provider) return null;
    try {
        const gasPrice = await provider.getGasPrice();
        const gwei = ethers.utils.formatUnits(gasPrice, "gwei");
        return Number(gwei);
    } catch (error) {
        console.error("Failed to get gas price:", error);
        return null;
    }
  }, [provider]);

  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        setIsConnecting(true);
        try {
          const newProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
          const accounts = await newProvider.listAccounts();
          if (accounts.length > 0) {
            const signer = newProvider.getSigner();
            const newAddress = await signer.getAddress();
            const networkInfo = await newProvider.getNetwork();

            handleStateUpdate(newProvider, newAddress, networkInfo.chainId);
          }
        } catch (e) {
            console.log("Could not auto-connect", e)
        }
        setIsConnecting(false);
      }
    }
    
    autoConnect();

    if(window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
    };
  }, [handleAccountsChanged, handleChainChanged, handleStateUpdate]);


  useEffect(() => {
    if(address && provider && network) {
      refreshTokens();
      updateBalance(provider, address);
    } else if(!address) {
      setTokens([]);
      setBalance("0");
    }
  }, [address, provider, network, refreshTokens, updateBalance]);

  const value = useMemo(() => ({
    address,
    chainId,
    balance,
    isConnecting,
    tokens,
    loadingTokens,
    network,
    provider,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    createToken,
    mintTokens,
    transferTokens,
    getGasPrice,
    refreshTokens,
    addLiquidity,
  }), [address, chainId, balance, isConnecting, tokens, loadingTokens, network, provider, connectWallet, disconnectWallet, switchNetwork, createToken, mintTokens, transferTokens, getGasPrice, refreshTokens, addLiquidity]);

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
