"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import type { FC } from "react";
import type { Token } from "@/types";
import { useWeb3 } from "@/hooks/use-web3";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GasFeeEstimatorDialog } from "./gas-fee-estimator-dialog";
import { Loader2 } from "lucide-react";

interface TokenManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: Token;
}

const mintSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive."),
});

const transferSchema = z.object({
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address."),
  amount: z.coerce.number().positive("Amount must be positive."),
});

type ActionType = "mint" | "transfer";

export const TokenManagementDialog: FC<TokenManagementDialogProps> = ({ open, onOpenChange, token }) => {
  const { mintTokens, transferTokens, refreshTokens } = useWeb3();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: ActionType; data: any } | null>(null);

  const mintForm = useForm<z.infer<typeof mintSchema>>({
    resolver: zodResolver(mintSchema),
    defaultValues: { amount: 1000 },
  });

  const transferForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { recipient: "", amount: 100 },
  });

  const handleClose = () => {
    mintForm.reset();
    transferForm.reset();
    onOpenChange(false);
  }

  const handleMintSubmit = (values: z.infer<typeof mintSchema>) => {
    setPendingAction({ type: "mint", data: values });
    setIsEstimatorOpen(true);
  };

  const handleTransferSubmit = (values: z.infer<typeof transferSchema>) => {
    setPendingAction({ type: "transfer", data: values });
    setIsEstimatorOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsSubmitting(true);
    const { type, data } = pendingAction;
    let success = false;
    let title = "";

    try {
      if (type === "mint") {
        title = "Minting Tokens";
        success = await mintTokens(token.address, data.amount);
      } else if (type === "transfer") {
        title = "Transferring Tokens";
        success = await transferTokens(token.address, data.recipient, data.amount);
      }

      if (success) {
        refreshTokens();
        handleClose();
      } else {
        throw new Error("Transaction failed or was rejected.");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: `${title} Failed`,
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
    }
  };
  
  const getTransactionType = () => {
    if(!pendingAction) return "";
    return pendingAction.type === "mint" ? "Mint Tokens" : "Transfer Tokens";
  }


  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {token.name}</DialogTitle>
            <DialogDescription>Mint new tokens or transfer them to others.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="mint" className="pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mint">Mint</TabsTrigger>
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
            </TabsList>
            <TabsContent value="mint">
              <Form {...mintForm}>
                <form onSubmit={mintForm.handleSubmit(handleMintSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={mintForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Mint</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                     {isSubmitting && pendingAction?.type === 'mint' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Mint Tokens
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="transfer">
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit(handleTransferSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={transferForm.control}
                    name="recipient"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Address</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Transfer</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && pendingAction?.type === 'transfer' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Transfer Tokens
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {pendingAction && (
        <GasFeeEstimatorDialog
            open={isEstimatorOpen}
            onOpenChange={setIsEstimatorOpen}
            onConfirm={handleConfirmAction}
            transactionType={getTransactionType()}
        />
      )}
    </>
  );
};
