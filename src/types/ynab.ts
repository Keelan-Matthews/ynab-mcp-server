import type { TransactionDetail, SaveTransaction } from 'ynab';

// YNAB-specific types for our MCP tools
export interface TransactionFilters {
  searchText?: string;
  accountId?: string;
  categoryId?: string;
  sinceDate?: string;
  limit?: number;
}

export interface CreateTransactionRequest {
  account_id: string;
  category_id?: string | null;
  payee_name?: string | null;
  amount: number;
  memo?: string | null;
  date?: string;
  cleared?: TransactionDetail.ClearedEnum;
  approved?: boolean;
  flag_color?: TransactionDetail.FlagColorEnum | null;
}
