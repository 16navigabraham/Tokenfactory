"use client";

import { useWeb3 } from "@/hooks/use-web3";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, LogIn, CheckCircle, XCircle, Box, CircleDollarSign } from "lucide-react";

export function Header() {
  const { connectWallet, address, balance, network, isConnecting } = useWeb3();

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatBalance = (bal: string) => parseFloat(bal).toFixed(4);

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Box className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">TokenForge</h1>
        </div>
        <div>
          {address ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                 <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                 <span className="font-mono text-foreground">{formatBalance(balance)} ETH</span>
              </div>
              <Badge variant="outline" className="hidden sm:flex items-center gap-2 text-sm">
                {network?.name || 'Unknown Network'}
                {network ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              </Badge>
              <Button variant="secondary" disabled>
                <Wallet className="mr-2 h-4 w-4" />
                {formatAddress(address)}
              </Button>
            </div>
          ) : (
            <Button onClick={connectWallet} disabled={isConnecting}>
              <LogIn className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
