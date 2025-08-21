"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import type { Token } from "@/types";
import { SUPPORTED_CHAINS, TOKEN_FACTORY_ADDRESS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

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
  connectWallet: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  createToken: (name: string, symbol: string, initialSupply: number) => Promise<boolean>;
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
  const { toast } = useToast();

  const network = useMemo(() => SUPPORTED_CHAINS.find(c => c.id === chainId) || null, [chainId]);

  const updateBalance = useCallback(async (addr: string) => {
    if (typeof window.ethereum === 'undefined') return;
    try {
      const balanceHex = await window.ethereum.request<string>({
        method: 'eth_getBalance',
        params: [addr, 'latest'],
      });
      if (balanceHex) {
        setBalance(formatBalance(balanceHex));
      }
    } catch (error) {
      console.error("Failed to get balance:", error);
      setBalance("0");
    }
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length > 0) {
      const newAddress = accounts[0];
      setAddress(newAddress);
      updateBalance(newAddress);
    } else {
      setAddress(null);
      setBalance("0");
      setChainId(null);
      setTokens([]);
    }
  }, [updateBalance]);

  const handleChainChanged = useCallback((hexChainId: string) => {
    const newChainId = parseInt(hexChainId, 16);
    setChainId(newChainId);
  }, []);

  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    window.ethereum.on('accountsChanged', handleAccountsChanged as any);
    window.ethereum.on('chainChanged', handleChainChanged as any);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged as any);
      window.ethereum?.removeListener('chainChanged', handleChainChanged as any);
    };
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
    if (typeof window.ethereum === 'undefined') return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${newChainId.toString(16)}` }],
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to switch network", description: error.message });
    }
  }, [toast]);

  // --- MOCKED CONTRACT INTERACTIONS ---

  const refreshTokens = useCallback(async () => {
    if (!address) return;
    setLoadingTokens(true);
    // In a real app, this would call TOKEN_FACTORY_ADDRESS to get tokens
    // For now, we just simulate a delay and use local state.
    setTimeout(() => {
      setLoadingTokens(false);
    }, 1000);
  }, [address]);
  
  const createToken = async (name: string, symbol: string, initialSupply: number): Promise<boolean> => {
    console.log(`MOCK: Creating token ${name} (${symbol}) with supply ${initialSupply}`);
    toast({ title: "Simulating Transaction...", description: "Please wait."});
    
    return new Promise(resolve => {
      setTimeout(() => {
        const newToken: Token = {
          name,
          symbol,
          address: `0x${[...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          balance: initialSupply.toString(),
        };
        setTokens(prev => [...prev, newToken]);
        resolve(true);
      }, 2000);
    });
  };

  const mintTokens = async (tokenAddress: string, amount: number): Promise<boolean> => {
    console.log(`MOCK: Minting ${amount} tokens for ${tokenAddress}`);
     toast({ title: "Simulating Transaction...", description: "Please wait."});

    return new Promise(resolve => {
      setTimeout(() => {
        setTokens(prev => prev.map(t => 
          t.address === tokenAddress 
            ? { ...t, balance: (parseInt(t.balance) + amount).toString() }
            : t
        ));
        resolve(true);
      }, 2000);
    });
  };

  const transferTokens = async (tokenAddress: string, recipient: string, amount: number): Promise<boolean> => {
    console.log(`MOCK: Transferring ${amount} of ${tokenAddress} to ${recipient}`);
     toast({ title: "Simulating Transaction...", description: "Please wait."});
     
    return new Promise(resolve => {
      setTimeout(() => {
         setTokens(prev => prev.map(t => 
          t.address === tokenAddress 
            ? { ...t, balance: (parseInt(t.balance) - amount).toString() }
            : t
        ));
        resolve(true);
      }, 2000);
    });
  };
  
  const getGasPrice = useCallback(async (): Promise<number | null> => {
    if (typeof window.ethereum === 'undefined') return null;
    try {
        const gasPriceHex = await window.ethereum.request<string>({ method: 'eth_gasPrice' });
        if(!gasPriceHex) return null;
        const gwei = BigInt(gasPriceHex) / BigInt(1e9);
        return Number(gwei);
    } catch (error) {
        console.error("Failed to get gas price:", error);
        return null;
    }
  }, []);

  const value = {
    address,
    chainId,
    balance,
    isConnecting,
    tokens,
    loadingTokens,
    network,
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
