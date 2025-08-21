"use client";

import { Header } from "@/components/header";
import { TokenCreateForm } from "@/components/token-create-form";
import { MyTokensList } from "@/components/my-tokens-list";
import { DexInterface } from "@/components/dex-interface";
import { useWeb3 } from "@/hooks/use-web3";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Network, TriangleAlert } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export default function Home() {
  const { address, chainId, switchNetwork } = useWeb3();
  const isConnected = !!address;
  const isWrongNetwork = isConnected && chainId && !SUPPORTED_CHAINS.some(c => c.id === chainId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {!isConnected ? (
          <Card className="max-w-md mx-auto mt-20 text-center shadow-lg">
            <CardContent className="p-8">
              <Image src="https://placehold.co/400x200.png" alt="TokenForge hero image" width={400} height={200} className="rounded-md mb-6" data-ai-hint="blockchain token" />
              <h1 className="text-3xl font-bold mb-2 text-primary">Welcome to TokenForge</h1>
              <p className="text-muted-foreground mb-6">Your one-stop platform to create, manage, and trade tokens on the Base network. Connect your wallet to begin.</p>
              <p className="text-sm text-muted-foreground/50">Please connect your MetaMask wallet to continue.</p>
            </CardContent>
          </Card>
        ) : isWrongNetwork ? (
          <div className="flex justify-center items-center h-full mt-20">
            <Alert variant="destructive" className="max-w-lg">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Wrong Network Detected</AlertTitle>
              <AlertDescription>
                Your wallet is connected to an unsupported network. Please switch to a supported network.
                <div className="flex gap-4 mt-4">
                  {SUPPORTED_CHAINS.map(chain => (
                    <Button key={chain.id} onClick={() => switchNetwork(chain.id)} variant="outline">
                      <Network className="mr-2 h-4 w-4" /> Switch to {chain.name}
                    </Button>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col gap-8">
              <TokenCreateForm />
              <DexInterface />
            </div>
            <div>
              <MyTokensList />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
