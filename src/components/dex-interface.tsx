
"use client";

import { useState, useMemo } from "react";
import type { Token } from "@/types";
import { useWeb3 } from "@/hooks/use-web3";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


export function DexInterface({ tokens }: { tokens: Token[] }) {
  const { balance, addLiquidity } = useWeb3();
  const { toast } = useToast();
  
  // Swap State
  const [swapFromToken, setSwapFromToken] = useState<string>("");
  const [swapToToken, setSwapToToken] = useState<string>("");

  // Liquidity State
  const [liquidityTokenAddress, setLiquidityTokenAddress] = useState<string>("");
  const [ethAmount, setEthAmount] = useState("");
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);

  const ethToken: Token = useMemo(() => ({
    name: "Ethereum",
    symbol: "ETH",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    balance: balance,
    decimals: 18,
    isNative: true,
  }), [balance]);

  const allTokensForSelection = useMemo(() => [ethToken, ...tokens], [ethToken, tokens]);

  const handleAddLiquidity = async () => {
    if (!liquidityTokenAddress || !ethAmount) {
        toast({ variant: "destructive", title: "Missing Information", description: "Please select a token and enter an ETH amount." });
        return;
    }
    
    if (liquidityTokenAddress === ethToken.address) {
        toast({ variant: "destructive", title: "Invalid Pair", description: "Cannot pair ETH with itself." });
        return;
    }

    const selectedToken = allTokensForSelection.find(t => t.address === liquidityTokenAddress);

    if(!selectedToken) {
        toast({ variant: "destructive", title: "Error", description: "Could not find selected token data." });
        return;
    }
    
    setIsAddingLiquidity(true);
    // The amount of the custom token to add is not defined by the user in this simplified UI.
    // We will need to implement logic to calculate the optimal amount based on the current pool price,
    // or for simplicity, we can just use a fixed amount for now, like 1 token.
    // The BaseLiquidityManager expects the amounts in wei, so we need to parse them.
    const success = await addLiquidity(selectedToken, parseFloat(ethAmount));
    if (success) {
      setLiquidityTokenAddress("");
      setEthAmount("");
    }
    setIsAddingLiquidity(false);
  };
  
  const TokenSelector = ({ value, onChange, placeholder, otherSelectedToken, tokenList }: { value: string, onChange: (value: string) => void, placeholder: string, otherSelectedToken?: string, tokenList: Token[] }) => (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {tokenList.filter(t => t.address !== otherSelectedToken).map((token) => (
          <SelectItem key={token.address} value={token.address}>
            {token.symbol}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>DEX Interface</CardTitle>
        <CardDescription>Swap tokens and manage liquidity pools.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="liquidity">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="swap">Swap</TabsTrigger>
            <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
          </TabsList>
          <TabsContent value="swap">
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <TokenSelector value={swapFromToken} onChange={setSwapFromToken} placeholder="From Token" otherSelectedToken={swapToToken} tokenList={allTokensForSelection}/>
                <Input id="from-token-amount" placeholder="0.0" type="number" />
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" size="icon">
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TokenSelector value={swapToToken} onChange={setSwapToToken} placeholder="To Token" otherSelectedToken={swapFromToken} tokenList={allTokensForSelection}/>
                <Input id="to-token-amount" placeholder="0.0" type="number" readOnly />
              </div>
              <Button className="w-full" disabled>Swap (Coming Soon)</Button>
            </div>
          </TabsContent>
          <TabsContent value="liquidity">
            <div className="space-y-4 pt-4">
               <div className="space-y-2">
                <Label>Token</Label>
                 <TokenSelector value={liquidityTokenAddress} onChange={setLiquidityTokenAddress} placeholder="Select Token" tokenList={tokens}/>
              </div>
              <div className="flex justify-center">
                  <Plus className="h-6 w-6 text-muted-foreground"/>
              </div>
               <div className="space-y-2">
                <Label>ETH Amount</Label>
                <Input id="eth-amount" placeholder="0.0" type="number" value={ethAmount} onChange={(e) => setEthAmount(e.target.value)}/>
              </div>
              <Button className="w-full" onClick={handleAddLiquidity} disabled={isAddingLiquidity}>
                {isAddingLiquidity ? <Loader2 className="animate-spin" /> : "Add Liquidity"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

    