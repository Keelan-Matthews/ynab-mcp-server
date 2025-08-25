declare module '@everapi/freecurrencyapi-js' {
  interface LatestOptions {
    base_currency: string;
    currencies?: string;
  }

  class Freecurrencyapi {
    constructor(apiKey: string);
    latest(opts: LatestOptions): Promise<any>;
  }

  export default Freecurrencyapi;
}
