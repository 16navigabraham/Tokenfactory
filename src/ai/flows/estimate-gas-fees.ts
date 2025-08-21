'use server';

/**
 * @fileOverview A gas fee estimation AI agent.
 *
 * - estimateGasFees - A function that estimates gas fees for a given transaction.
 * - EstimateGasFeesInput - The input type for the estimateGasFees function.
 * - EstimateGasFeesOutput - The return type for the estimateGasFees function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateGasFeesInputSchema = z.object({
  transactionType: z
    .string()
    .describe('The type of transaction to estimate gas fees for (e.g., token creation, minting, transfer, swap, adding liquidity).'),
  network: z
    .string()
    .describe('The blockchain network the transaction will be performed on (e.g., Base Mainnet, Base Sepolia Testnet).'),
  currentGasPrice: z
    .number()
    .describe('The current gas price on the network in gwei.'),
  data: z
    .string()
    .optional()
    .describe('Optional transaction data, like function signatures and encoded parameters.'),
});
export type EstimateGasFeesInput = z.infer<typeof EstimateGasFeesInputSchema>;

const EstimateGasFeesOutputSchema = z.object({
  estimatedGasFees: z
    .number()
    .describe('The estimated gas fees for the transaction in ETH.'),
  reasoning: z
    .string()
    .describe('The AI reasoning for its gas fee estimation.'),
  optimizationSuggestions: z
    .string()
    .optional()
    .describe('Optional suggestions for optimizing gas fees.'),
});
export type EstimateGasFeesOutput = z.infer<typeof EstimateGasFeesOutputSchema>;

export async function estimateGasFees(input: EstimateGasFeesInput): Promise<EstimateGasFeesOutput> {
  return estimateGasFeesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateGasFeesPrompt',
  input: {schema: EstimateGasFeesInputSchema},
  output: {schema: EstimateGasFeesOutputSchema},
  prompt: `You are an AI-powered gas fee estimator for blockchain transactions. Given the transaction type,
  the blockchain network, and the current gas price, you will estimate the gas fees for the transaction in ETH.

  Transaction Type: {{{transactionType}}}
  Network: {{{network}}}
  Current Gas Price (Gwei): {{{currentGasPrice}}}
  Transaction Data: {{{data}}}

  Provide a well-reasoned explanation for your estimate. If possible, suggest ways to optimize gas fees for this transaction.

  Ensure your estimate is accurate and reflects current network conditions.
`,
});

const estimateGasFeesFlow = ai.defineFlow(
  {
    name: 'estimateGasFeesFlow',
    inputSchema: EstimateGasFeesInputSchema,
    outputSchema: EstimateGasFeesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
