export interface Token {
  name: string;
  symbol: string;
  address: string;
  balance: string;
  decimals: number;
  isNative?: boolean;
}
