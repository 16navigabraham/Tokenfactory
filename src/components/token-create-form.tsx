"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useWeb3 } from "@/hooks/use-web3";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GasFeeEstimatorDialog } from "./gas-fee-estimator-dialog";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50),
  symbol: z.string().min(2, "Symbol must be at least 2 characters.").max(10),
  initialSupply: z.coerce.number().positive("Initial supply must be a positive number."),
  decimals: z.coerce.number().int().min(0, "Decimals must be 0 or more.").max(18, "Decimals cannot exceed 18."),
});

type FormValues = z.infer<typeof formSchema>;

export function TokenCreateForm() {
  const { createToken } = useWeb3();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      symbol: "",
      initialSupply: 1000000,
      decimals: 18,
    },
  });

  const onSubmit = (values: FormValues) => {
    setFormData(values);
    setIsEstimatorOpen(true);
  };
  
  const handleConfirmCreation = async () => {
    if (!formData) return;
    
    setIsSubmitting(true);
    try {
      const success = await createToken(formData.name, formData.symbol, formData.initialSupply, formData.decimals);
      if (success) {
        toast({
          title: "Transaction Submitted",
          description: "Your token is being created. It may take a moment to appear in your list.",
        });
        form.reset();
      }
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false);
      setFormData(null);
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Create a New Token</CardTitle>
              <CardDescription>
                Fill out the details below to forge your own ERC20 token.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. My Awesome Token" {...field} />
                    </FormControl>
                    <FormDescription>The full name of your token.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MAT" {...field} />
                    </FormControl>
                    <FormDescription>The ticker symbol for your token.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Supply</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 1000000" {...field} />
                    </FormControl>
                    <FormDescription>The number of tokens to mint upon creation.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="decimals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decimals</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>The number of decimal places for your token (0-18).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Create Token"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      {formData && (
        <GasFeeEstimatorDialog
          open={isEstimatorOpen}
          onOpenChange={setIsEstimatorOpen}
          onConfirm={handleConfirmCreation}
          transactionType="Token Creation"
        />
      )}
    </>
  );
}
