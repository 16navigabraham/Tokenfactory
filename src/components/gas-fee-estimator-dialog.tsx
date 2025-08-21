"use client";

import { useState, useEffect } from "react";
import type { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { estimateGasFees, type EstimateGasFeesOutput } from "@/ai/flows/estimate-gas-fees";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Flame, BrainCircuit, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GasFeeEstimatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  transactionType: string;
}

export const GasFeeEstimatorDialog: FC<GasFeeEstimatorDialogProps> = ({ open, onOpenChange, onConfirm, transactionType }) => {
  const { getGasPrice, network } = useWeb3();
  const [estimation, setEstimation] = useState<EstimateGasFeesOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const fetchEstimation = async () => {
        setLoading(true);
        setError(null);
        setEstimation(null);
        try {
          const gasPriceGwei = await getGasPrice();
          if (gasPriceGwei === null || !network) {
            setError("Could not retrieve network data. Please try again.");
            setLoading(false);
            return;
          }
          
          const result = await estimateGasFees({
            transactionType,
            network: network.name,
            currentGasPrice: gasPriceGwei,
          });
          setEstimation(result);
        } catch (e) {
          setError("Failed to estimate gas fees. The AI model may be unavailable.");
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchEstimation();
    }
  }, [open, getGasPrice, network, transactionType]);

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };
  
  const LoadingSkeleton = () => (
    <div className="space-y-4 pt-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="pt-4 space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="text-primary" /> Gas Fee Estimation
          </DialogTitle>
          <DialogDescription>
            Review the estimated fee for your '{transactionType}' transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {loading && <LoadingSkeleton />}
          {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {estimation && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="flex justify-between items-center bg-secondary p-3 rounded-lg">
                <span className="text-muted-foreground">Estimated Fee</span>
                <span className="text-lg font-bold text-primary">{estimation.estimatedGasFees.toFixed(6)} ETH</span>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><BrainCircuit size={18} /> AI Reasoning</h3>
                <p className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">{estimation.reasoning}</p>
              </div>

              {estimation.optimizationSuggestions && (
                 <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-2"><Sparkles size={18} /> Optimization Tips</h3>
                    <p className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">{estimation.optimizationSuggestions}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={loading || !!error}>
            Confirm Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
