export interface CreateConversionLogInput {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
}

export interface IExchangeConversionLogRepository {
  /** Fire-and-forget append — never fails the calling request if logging fails. */
  log(input: CreateConversionLogInput): Promise<void>;
  countInRange(from: Date, to: Date): Promise<number>;
}
