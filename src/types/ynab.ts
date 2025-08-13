// Re-export YNAB types for convenience
export type {
  TransactionDetail,
  Category,
  Account,
  BudgetSummary,
  Payee,
  SaveTransaction,
} from 'ynab';

// Custom types for our MCP tools
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

export interface ToolConfig {
  name: string;
  description: string;
  inputSchema: any;
  handler: string; // Method name on the service class
}

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
  cleared?: 'cleared' | 'uncleared' | 'reconciled';
  approved?: boolean;
  flag_color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null;
}
