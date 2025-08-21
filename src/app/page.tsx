
"use client";

import { Header } from "@/components/header";
import { useWeb3 } from "@/hooks/use-web3";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Network, TriangleAlert } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Box, Coins, PlusCircle, ArrowLeftRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function DashboardSidebar() {
    const pathname = usePathname();
    return (
        <Sidebar>
            <SidebarContent>
                <SidebarHeader>
                    {/* Optional Header Content */}
                </SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/'}>
                             <Link href="/">
                                <BookOpen />
                                Learn
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/create'}>
                            <Link href="/create">
                                <PlusCircle />
                                Create Token
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/my-tokens'}>
                            <Link href="/my-tokens">
                                <Coins />
                                My Tokens
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton asChild isActive={pathname === '/dex'}>
                            <Link href="/dex">
                                <ArrowLeftRight />
                                DEX
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    )
}

function WelcomeContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Welcome to TokenForge</CardTitle>
                <CardContent className="pt-4">
                    <p className="text-muted-foreground mb-6">Your all-in-one solution for creating, managing, and trading ERC20 tokens on the Base network. Use the navigation on the left to get started, or read through our quick guides below to learn more.</p>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>What is an ERC20 Token?</AccordionTrigger>
                            <AccordionContent>
                            An ERC20 token is a standard for creating and issuing smart contracts on the Ethereum blockchain. Think of it as a blueprint that defines a common list of rules that a token must follow. This standardization allows different tokens to interact with each other seamlessly within the larger ecosystem, including wallets, decentralized exchanges (like the one here!), and other applications. With TokenForge, you can create your own ERC20-compliant token in minutes.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>The Basics of Token Creation</AccordionTrigger>
                            <AccordionContent>
                            Creating a token involves deploying a smart contract to the blockchain. This contract keeps track of who owns how many tokens. Key parameters include the token's name (e.g., "My Awesome Token"), its symbol (e.g., "MAT"), and the initial supply (the total number of tokens that exist at creation). Our "Create Token" page simplifies this process, handling the smart contract deployment for you.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>Understanding Liquidity Pools</AccordionTrigger>
                            <AccordionContent>
                            A liquidity pool is a collection of two different tokens locked in a smart contract, creating a market for those two tokens. For example, you could pair your new token with ETH. By providing liquidity, you enable others to trade your token. In return, liquidity providers earn a small fee from every swap that happens in the pool. You can add liquidity to your tokens on our "DEX" page.
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="item-4">
                            <AccordionTrigger>What is a DEX?</AccordionTrigger>
                            <AccordionContent>
                            DEX stands for Decentralized Exchange. Unlike traditional exchanges, a DEX operates without a central authority. Trades are executed directly between users (peer-to-peer) through smart contracts. The "DEX" page in this app is a simple interface that interacts with a decentralized exchange on the Base network, allowing you to create liquidity pools and eventually swap tokens.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </CardHeader>
        </Card>
    );
}


export default function Home() {
  const { address, chainId, switchNetwork } = useWeb3();
  const isConnected = !!address;
  const isWrongNetwork = isConnected && chainId && !SUPPORTED_CHAINS.some(c => c.id === chainId);
  const pathname = usePathname();

  const renderContent = () => {
    switch(pathname) {
      case '/':
        return <WelcomeContent />;
      // The other pages now handle their own content rendering
      default:
        return null; // Or a 404 component
    }
  }


  return (
    <SidebarProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <div className="flex flex-1">
             {isConnected && !isWrongNetwork && <DashboardSidebar />}
             <SidebarInset>
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
                    <>
                     {pathname === '/' ? <WelcomeContent /> : null}
                    </>
                )}
              </main>
            </SidebarInset>
          </div>
        </div>
    </SidebarProvider>
  );
}
