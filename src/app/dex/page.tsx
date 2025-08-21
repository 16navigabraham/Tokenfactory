
"use client";
import { DexInterface } from "@/components/dex-interface";
import { useWeb3 } from "@/hooks/use-web3";


export default function DexPage() {
    const { tokens } = useWeb3();
    return (
        <div className="w-full max-w-2xl mx-auto">
            <DexInterface tokens={tokens} />
        </div>
    );
}
