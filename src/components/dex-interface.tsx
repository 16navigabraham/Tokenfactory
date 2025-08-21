
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { ethers } from "ethers";

export function DexInterface({ tokens }: { tokens: Token[] }) {
  const { balance, addLiquidity, swapTokens, getSwapQuote } = useWeb3();
  const { toast } = useToast();
  
  // Swap State
  const [fromTokenAddress, setFromTokenAddress] = useState<string>("");
  const [toTokenAddress, setToTokenAddress] = useState<string>("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isGettingQuote, setIsGettingQuote] = useState(false);

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

  useEffect(() => {
    const fetchQuote = async () => {
        if (fromTokenAddress && toTokenAddress && fromAmount && parseFloat(fromAmount) > 0) {
            setIsGettingQuote(true);
            try {
                const quote = await getSwapQuote(fromTokenAddress, toTokenAddress, fromAmount);
                if(quote) {
                    setToAmount(quote);
                }
            } catch (error) {
                console.error("Failed to get quote", error);
                setToAmount("");
            } finally {
                setIsGettingQuote(false);
            }
        } else {
            setToAmount("");
        }
    };
    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [fromTokenAddress, toTokenAddress, fromAmount, getSwapQuote]);

  const handleAddLiquidity = async () => {
    if (!liquidityTokenAddress || !ethAmount) {
        toast({ variant: "destructive", title: "Missing Information", description: "Please select a token and enter an ETH amount." });
        return;
    }
    
    if (liquidityTokenAddress === ethToken.address) {
        toast({ variant: "destructive", title: "Invalid Pair", description: "Cannot pair ETH with itself." });
        return;
    }
    
    setIsAddingLiquidity(true);
    // The amount of the custom token to add is not defined by the user in this simplified UI.
    const success = await addLiquidity(liquidityTokenAddress, "1", parseFloat(ethAmount));
    if (success) {
      setLiquidityTokenAddress("");
      setEthAmount("");
    }
    setIsAddingLiquidity(false);
  };
  
  const handleSwap = async () => {
    if (!fromTokenAddress || !toTokenAddress || !fromAmount) {
        toast({ variant: "destructive", title: "Missing Information", description: "Please select both tokens and enter an amount." });
        return;
    }
    setIsSwapping(true);
    const success = await swapTokens(fromTokenAddress, toTokenAddress, fromAmount);
    if(success) {
        setFromAmount("");
        setToAmount("");
        setFromTokenAddress("");
        setToTokenAddress("");
    }
    setIsSwapping(false);
  }

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
        <Tabs defaultValue="swap">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="swap">Swap</TabsTrigger>
            <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
          </TabsList>
          <TabsContent value="swap">
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <TokenSelector value={fromTokenAddress} onChange={setFromTokenAddress} placeholder="From Token" otherSelectedToken={toTokenAddress} tokenList={allTokensForSelection}/>
                <Input id="from-token-amount" placeholder="0.0" type="number" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} />
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" size="icon" onClick={() => {
                    setFromTokenAddress(toTokenAddress);
                    setToTokenAddress(fromTokenAddress);
                    setFromAmount(toAmount);
                    setToAmount(fromAmount);
                }}>
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TokenSelector value={toTokenAddress} onChange={setToTokenAddress} placeholder="To Token" otherSelectedToken={fromTokenAddress} tokenList={allTokensForSelection}/>
                 <div className="relative">
                    <Input id="to-token-amount" placeholder="0.0" type="number" value={toAmount} readOnly />
                    {isGettingQuote && <Loader2 className="animate-spin absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
              <Button className="w-full" onClick={handleSwap} disabled={isSwapping || isGettingQuote || !toAmount}>
                {isSwapping ? <Loader2 className="animate-spin" /> : "Swap"}
              </Button>
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

    