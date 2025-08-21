"use client";

import { useWeb3 } from "@/hooks/use-web3";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, LogIn, CheckCircle, XCircle, Box, CircleDollarSign, ChevronDown, Network, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SUPPORTED_CHAINS } from "@/lib/constants";

export function Header() {
  const { connectWallet, disconnectWallet, address, balance, network, isConnecting, switchNetwork } = useWeb3();

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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden sm:flex items-center gap-2 text-sm">
                    {network ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {network.name}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        Unsupported Network
                      </>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {SUPPORTED_CHAINS.map((chain) => (
                     <DropdownMenuItem key={chain.id} onClick={() => switchNetwork(chain.id)}>
                       <Network className="mr-2 h-4 w-4" />
                       {chain.name}
                     </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="secondary">
                      <Wallet className="mr-2 h-4 w-4" />
                      {formatAddress(address)}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={disconnectWallet}>
                       <LogOut className="mr-2 h-4 w-4" />
                       Disconnect
                     </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
