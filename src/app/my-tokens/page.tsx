
"use client";

import { MyTokensList } from "@/components/my-tokens-list";
import { Header } from "@/components/header";
import { useWeb3 } from "@/hooks/use-web3";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Network, TriangleAlert } from "lucide-react";
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Coins, PlusCircle, ArrowLeftRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Moved to web3-provider.tsx to centralize chain configuration
// const SUPPORTED_CHAINS = [...]

function DashboardSidebar() {
    const pathname = usePathname();
    return (
        <Sidebar>
            <SidebarContent>
                <SidebarHeader />
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

export default function MyTokensPage() {
    const { address, chainId, switchNetwork, network } = useWeb3();
    const isConnected = !!address;
    const isWrongNetwork = isConnected && !network;

    return (
         <SidebarProvider>
            <div className="flex flex-col min-h-screen bg-background">
              <Header />
              <div className="flex flex-1">
                 {isConnected && !isWrongNetwork && <DashboardSidebar />}
                 <SidebarInset>
                    <main className="flex-grow container mx-auto px-4 py-8">
                         <div className="w-full">
                            <MyTokensList />
                        </div>
                    </main>
                </SidebarInset>
              </div>
            </div>
        </SidebarProvider>
    );
}

    