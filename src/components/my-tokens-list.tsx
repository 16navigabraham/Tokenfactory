"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/hooks/use-web3";
import type { Token } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Settings, PlusCircle, ArrowRight, Package, Landmark, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TokenManagementDialog } from "./token-management-dialog";

export function MyTokensList() {
  const { tokens, loadingTokens, refreshTokens } = useWeb3();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    refreshTokens();
  }, [refreshTokens]);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard!",
      description: "The token address has been copied.",
    });
  };
  
  const openManagementDialog = (token: Token) => {
    setSelectedToken(token);
    setIsDialogOpen(true);
  };

  const TokenCard = ({ token }: { token: Token }) => (
    <div className="p-4 bg-secondary/30 rounded-lg flex justify-between items-center transition-all hover:bg-secondary/60">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/20 rounded-full">
          <Coins className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-bold text-lg text-foreground">{token.name} <span className="text-sm text-muted-foreground font-mono">{token.symbol}</span></p>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-muted-foreground">{`${token.address.slice(0, 8)}...${token.address.slice(-6)}`}</p>
            <button onClick={() => handleCopyToClipboard(token.address)} className="text-muted-foreground hover:text-primary">
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-xl font-semibold">{token.balance}</p>
        <Button variant="ghost" size="sm" onClick={() => openManagementDialog(token)} className="text-muted-foreground">
          <Settings size={14} className="mr-2" /> Manage
        </Button>
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 bg-secondary/30 rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="space-y-2 text-right">
             <Skeleton className="h-6 w-20 ml-auto" />
             <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Card className="shadow-lg h-full">
        <CardHeader>
          <CardTitle>My Tokens</CardTitle>
          <CardDescription>A list of all tokens you have created.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingTokens ? (
              <LoadingSkeleton />
            ) : tokens.length > 0 ? (
              tokens.map((token, index) => (
                <TokenCard key={token.address} token={token} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-4" />
                <p>You haven't created any tokens yet.</p>
                <p className="text-sm">Use the form on the left to forge your first token.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {selectedToken && (
        <TokenManagementDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          token={selectedToken}
        />
      )}
    </>
  );
}
