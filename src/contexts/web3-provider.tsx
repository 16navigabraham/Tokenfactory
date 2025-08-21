
"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import { ethers, BigNumber } from "ethers";
import type { Token } from "@/types";
import { SUPPORTED_CHAINS, TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, TOKEN_ABI } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Helper to format ETH balance
const formatBalance = (hex: string): string => {
  const wei = BigInt(hex);
  const eth = Number(wei) / 1e18;
  return eth.toString();
};

interface Web3ContextType {
  address: string | null;
  chainId: number | null;
  balance: string;
  isConnecting: boolean;
  tokens: Token[];
  loadingTokens: boolean;
  network: { id: number; name: string } | null;
  provider: ethers.providers.Web3Provider | null;
  connectWallet: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  createToken: (name: string, symbol: string, initialSupply: number, decimals: number) => Promise<boolean>;
  mintTokens: (tokenAddress: string, amount: number) => Promise<boolean>;
  transferTokens: (tokenAddress: string, recipient: string, amount: number) => Promise<boolean>;
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

  const updateBalance = useCallback(async (addr: string) => {
    if (!provider) return;
    try {
      const balanceWei = await provider.getBalance(addr);
      setBalance(ethers.utils.formatEther(balanceWei));
    } catch (error) {
      console.error("Failed to get balance:", error);
      setBalance("0");
    }
  }, [provider]);

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length > 0) {
      const newAddress = accounts[0];
      setAddress(newAddress);
      if (provider) {
        updateBalance(newAddress);
      }
    } else {
      setAddress(null);
      setBalance("0");
      setChainId(null);
      setTokens([]);
      setProvider(null);
    }
  }, [provider, updateBalance]);

  const handleChainChanged = useCallback((hexChainId: string) => {
    const newChainId = parseInt(hexChainId, 16);
    setChainId(newChainId);
    if(window.ethereum) {
       setProvider(new ethers.providers.Web3Provider(window.ethereum));
    }
  }, []);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);

        web3Provider.listAccounts().then(accounts => {
            if (accounts.length > 0) {
                handleAccountsChanged(accounts);
            }
        });

        web3Provider.getNetwork().then(network => {
            setChainId(network.chainId);
        });
        
        window.ethereum.on('accountsChanged', handleAccountsChanged as any);
        window.ethereum.on('chainChanged', handleChainChanged as any);

        return () => {
            window.ethereum?.removeListener('accountsChanged', handleAccountsChanged as any);
            window.ethereum?.removeListener('chainChanged', handleChainChanged as any);
        };
    }
  }, [handleAccountsChanged, handleChainChanged]);
  
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      toast({ variant: "destructive", title: "MetaMask not found", description: "Please install MetaMask to use this app." });
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request<string[]>({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        handleAccountsChanged(accounts);
        const hexChainId = await window.ethereum.request<string>({ method: 'eth_chainId' });
        if(hexChainId) handleChainChanged(hexChainId);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Connection failed", description: error.message });
    } finally {
      setIsConnecting(false);
    }
  }, [toast, handleAccountsChanged, handleChainChanged]);
  
  const switchNetwork = useCallback(async (newChainId: number) => {
    if (!provider) return;
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${newChainId.toString(16)}` }]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to switch network", description: error.message });
    }
  }, [provider, toast]);


  const refreshTokens = useCallback(async () => {
    if (!address || !provider || !network) return;
    setLoadingTokens(true);
    try {
        const factoryAddress = TOKEN_FACTORY_ADDRESS[network.id];
        if(!factoryAddress) {
            setTokens([]);
            return;
        };

        const factory = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);
        const ownedTokenAddresses = await factory.getTokensOfOwner(address);

        const tokenData = await Promise.all(ownedTokenAddresses.map(async (tokenAddress: string) => {
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
        }));
        setTokens(tokenData);
    } catch (error) {
        console.error("Failed to refresh tokens:", error);
        toast({ variant: "destructive", title: "Error fetching tokens", description: "Could not fetch token data." });
    } finally {
        setLoadingTokens(false);
    }
  }, [address, provider, network, toast]);
  
  const createToken = async (name: string, symbol: string, initialSupply: number, decimals: number): Promise<boolean> => {
     if (!provider || !address || !network) return false;
    
    const factoryAddress = TOKEN_FACTORY_ADDRESS[network.id];
    if(!factoryAddress) {
        toast({ variant: "destructive", title: "Unsupported Network", description: "The token factory is not deployed on this network." });
        return false;
    }
    
    try {
      const signer = provider.getSigner();
      const factory = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, signer);
      
      const supply = ethers.utils.parseUnits(initialSupply.toString(), decimals);
      const tx = await factory.createToken(name, symbol, supply, decimals);
      
      toast({ title: "Transaction Submitted", description: "Waiting for confirmation..." });
      await tx.wait();
      toast({ title: "Success!", description: "Token created successfully." });

      refreshTokens();
      return true;
    } catch(error: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: error.message });
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
        toast({ variant: "destructive", title: "Minting Failed", description: error.message });
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
        toast({ variant: "destructive", title: "Transfer Failed", description: error.message });
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
    if(address && provider && network) {
      refreshTokens();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, provider, network?.id]);

  const value = {
    address,
    chainId,
    balance,
    isConnecting,
    tokens,
    loadingTokens,
    network,
    provider,
    connectWallet,
    switchNetwork,
    createToken,
    mintTokens,
    transferTokens,
    getGasPrice,
    refreshTokens,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
