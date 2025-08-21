"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight } from "lucide-react";

export function DexInterface() {
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
              <div className="space-y-2">
                <Label htmlFor="from-token">From</Label>
                <Input id="from-token" placeholder="0.0" type="number" disabled />
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" size="icon" disabled>
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-token">To</Label>
                <Input id="to-token" placeholder="0.0" type="number" disabled />
              </div>
              <Button className="w-full" disabled>Swap (Coming Soon)</Button>
            </div>
          </TabsContent>
          <TabsContent value="liquidity">
            <div className="space-y-4 pt-4">
               <div className="space-y-2">
                <Label htmlFor="token-a">Token A</Label>
                <Input id="token-a" placeholder="0.0" type="number" disabled />
              </div>
               <div className="space-y-2">
                <Label htmlFor="token-b">Token B</Label>
                <Input id="token-b" placeholder="0.0" type="number" disabled />
              </div>
              <Button className="w-full" disabled>Add Liquidity (Coming Soon)</Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
