"use client";

import { useState } from "react";
import type { Token } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Plus } from "lucide-react";

interface DexInterfaceProps {
  tokens: Token[];
}

export function DexInterface({ tokens }: DexInterfaceProps) {
  const [swapFromToken, setSwapFromToken] = useState<string>("");
  const [swapToToken, setSwapToToken] = useState<string>("");
  const [liquidityTokenA, setLiquidityTokenA] = useState<string>("");
  const [liquidityTokenB, setLiquidityTokenB] = useState<string>("");

  const TokenSelector = ({ value, onChange, placeholder, otherSelectedToken }: { value: string, onChange: (value: string) => void, placeholder: string, otherSelectedToken?: string }) => (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {tokens.filter(t => t.address !== otherSelectedToken).map((token) => (
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
                <TokenSelector value={swapFromToken} onChange={setSwapFromToken} placeholder="From Token" otherSelectedToken={swapToToken} />
                <Input id="from-token-amount" placeholder="0.0" type="number" />
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" size="icon">
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TokenSelector value={swapToToken} onChange={setSwapToToken} placeholder="To Token" otherSelectedToken={swapFromToken} />
                <Input id="to-token-amount" placeholder="0.0" type="number" readOnly />
              </div>
              <Button className="w-full" disabled>Swap (Coming Soon)</Button>
            </div>
          </TabsContent>
          <TabsContent value="liquidity">
            <div className="space-y-4 pt-4">
               <div className="space-y-2">
                <Label>Token A</Label>
                <div className="grid grid-cols-2 gap-2">
                   <TokenSelector value={liquidityTokenA} onChange={setLiquidityTokenA} placeholder="Select Token" otherSelectedToken={liquidityTokenB}/>
                   <Input id="token-a-amount" placeholder="0.0" type="number" />
                </div>
              </div>
              <div className="flex justify-center">
                  <Plus className="h-6 w-6 text-muted-foreground"/>
              </div>
               <div className="space-y-2">
                <Label>Token B</Label>
                <div className="grid grid-cols-2 gap-2">
                  <TokenSelector value={liquidityTokenB} onChange={setLiquidityTokenB} placeholder="Select Token" otherSelectedToken={liquidityTokenA}/>
                  <Input id="token-b-amount" placeholder="0.0" type="number" />
                </div>
              </div>
              <Button className="w-full" disabled>Add Liquidity (Coming Soon)</Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
