
"use client";

import { TokenCreateForm } from "@/components/token-create-form";
import { Header } from "@/components/header";
import { useWeb3 } from "@/hooks/use-web3";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Network, TriangleAlert } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Coins, PlusCircle, ArrowLeftRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function CreateTokenPage() {
  const { address, chainId, switchNetwork } = useWeb3();
  const isConnected = !!address;
  const isWrongNetwork = isConnected && chainId && !SUPPORTED_CHAINS.some(c => c.id === chainId);

  return (
     <SidebarProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <div className="flex flex-1">
             {isConnected && !isWrongNetwork && <DashboardSidebar />}
             <SidebarInset>
                <main className="flex-grow container mx-auto px-4 py-8">
                     <div className="w-full max-w-2xl mx-auto">
                        <TokenCreateForm />
                    </div>
                </main>
            </SidebarInset>
          </div>
        </div>
    </SidebarProvider>
  );
}
