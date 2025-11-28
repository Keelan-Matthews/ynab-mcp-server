import * as ynab from 'ynab';
import { milliUnitsToUnits, unitsToMilliUnits, formatDateForYnab, sanitizeString } from '../utils/ynab-helpers.js';
import type { TransactionFilters, CreateTransactionRequest } from '../types/ynab.js';

export class YNABService {
  private api: ynab.API;
  private budgetId: string;

  constructor(apiToken: string, budgetId: string) {
    this.api = new ynab.API(apiToken);
    this.budgetId = budgetId;
  }

  async getTransactions(filters: TransactionFilters = {}) {
    const { searchText, accountId, categoryId, sinceDate, limit = 10 } = filters;
    
    try {
      // Get transactions
      const result = await this.api.transactions.getTransactions(this.budgetId, sinceDate);
      let transactions = result.data.transactions;

      // Apply filters
      if (searchText) {
        transactions = transactions.filter((tx: ynab.TransactionDetail) => 
          tx.payee_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          tx.memo?.toLowerCase().includes(searchText.toLowerCase())
        );
      }
      
      if (accountId) {
        transactions = transactions.filter((tx: ynab.TransactionDetail) => tx.account_id === accountId);
      }
      
      if (categoryId) {
        transactions = transactions.filter((tx: ynab.TransactionDetail) => tx.category_id === categoryId);
      }

      // Get enrichment data
      const [accountsResult, categoriesResult] = await Promise.all([
        this.api.accounts.getAccounts(this.budgetId),
        this.api.categories.getCategories(this.budgetId)
      ]);

      const accounts = new Map(accountsResult.data.accounts.map((acc: ynab.Account) => [acc.id, acc]));
      const categories = new Map(
        categoriesResult.data.category_groups
          .flatMap((group: ynab.CategoryGroupWithCategories) => group.categories)
          .map((cat: ynab.Category) => [cat.id, cat])
      );

      // Enrich and format transactions
      const enrichedTransactions = transactions
        .slice(0, limit)
        .map((tx: ynab.TransactionDetail) => ({
          id: tx.id,
          date: tx.date,
          amount: milliUnitsToUnits(tx.amount),
          amount_milliunits: tx.amount,
          payee_name: tx.payee_name,
          memo: tx.memo,
          cleared: tx.cleared,
          approved: tx.approved,
          flag_color: tx.flag_color,
          account: {
            id: tx.account_id,
            name: accounts.get(tx.account_id)?.name || 'Unknown Account'
          },
          category: tx.category_id ? {
            id: tx.category_id,
            name: categories.get(tx.category_id)?.name || 'Unknown Category'
          } : null,
          deleted: tx.deleted
        }));

      return {
        transactions: enrichedTransactions,
        server_knowledge: result.data.server_knowledge,
        total_count: transactions.length,
        returned_count: enrichedTransactions.length
      };
    } catch (error) {
      throw new Error(`Failed to fetch transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createTransaction(request: CreateTransactionRequest) {
    try {
      // Convert amount to milliunits and format date
      const transactionData: ynab.SaveTransaction = {
        account_id: request.account_id,
        category_id: request.category_id || null,
        payee_name: sanitizeString(request.payee_name) || null,
        amount: unitsToMilliUnits(request.amount),
        memo: sanitizeString(request.memo) || null,
        date: formatDateForYnab(request.date),
        cleared: request.cleared || ynab.TransactionDetail.ClearedEnum.Uncleared,
        approved: request.approved !== undefined ? request.approved : true,
        flag_color: request.flag_color || null
      };

      const result = await this.api.transactions.createTransaction(this.budgetId, {
        transaction: transactionData
      });

      const createdTx = result.data.transaction;
      
      if (!createdTx) {
        throw new Error('Transaction creation failed - no transaction returned');
      }
      
      // Get account and category info for response
      const [accountsResult, categoriesResult] = await Promise.all([
        this.api.accounts.getAccounts(this.budgetId),
        this.api.categories.getCategories(this.budgetId)
      ]);

      const accounts = new Map(accountsResult.data.accounts.map((acc: ynab.Account) => [acc.id, acc]));
      const categories = new Map(
        categoriesResult.data.category_groups
          .flatMap((group: ynab.CategoryGroupWithCategories) => group.categories)
          .map((cat: ynab.Category) => [cat.id, cat])
      );

      return {
        transaction: {
          id: createdTx.id,
          date: createdTx.date,
          amount: milliUnitsToUnits(createdTx.amount),
          amount_milliunits: createdTx.amount,
          payee_name: createdTx.payee_name,
          memo: createdTx.memo,
          cleared: createdTx.cleared,
          approved: createdTx.approved,
          flag_color: createdTx.flag_color,
          account: {
            id: createdTx.account_id,
            name: accounts.get(createdTx.account_id)?.name || 'Unknown Account'
          },
          category: createdTx.category_id ? {
            id: createdTx.category_id,
            name: categories.get(createdTx.category_id)?.name || 'Unknown Category'
          } : null
        },
        server_knowledge: result.data.server_knowledge
      };
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCategories(includeHidden = false, includeDetails = false) {
    try {
      const result = await this.api.categories.getCategories(this.budgetId);
      
      const categoryGroups = result.data.category_groups
        .filter((group: ynab.CategoryGroupWithCategories) => includeHidden || !group.deleted)
        .map((group: ynab.CategoryGroupWithCategories) => {
          const baseGroup = {
            id: group.id,
            name: group.name,
            categories: group.categories
              .filter((cat: ynab.Category) => includeHidden || !cat.deleted)
              .map((cat: ynab.Category) => {
                const baseCategory = {
                  id: cat.id,
                  name: cat.name
                };
                
                if (includeDetails) {
                  return {
                    ...baseCategory,
                    budgeted: milliUnitsToUnits(cat.budgeted),
                    activity: milliUnitsToUnits(cat.activity),
                    balance: milliUnitsToUnits(cat.balance),
                    hidden: cat.hidden,
                    deleted: cat.deleted,
                    goal_type: cat.goal_type,
                    goal_target: cat.goal_target ? milliUnitsToUnits(cat.goal_target) : null
                  };
                }
                
                return baseCategory;
              })
          };
          
          if (includeDetails) {
            return {
              ...baseGroup,
              hidden: group.hidden,
              deleted: group.deleted
            };
          }
          
          return baseGroup;
        });

      return {
        category_groups: categoryGroups,
        server_knowledge: result.data.server_knowledge
      };
    } catch (error) {
      throw new Error(`Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAccounts(includeDeleted = false) {
    try {
      const result = await this.api.accounts.getAccounts(this.budgetId);
      
      const accounts = result.data.accounts
        .filter((account: ynab.Account) => includeDeleted || !account.deleted)
        .map((account: ynab.Account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          balance: milliUnitsToUnits(account.balance),
          cleared_balance: milliUnitsToUnits(account.cleared_balance),
          uncleared_balance: milliUnitsToUnits(account.uncleared_balance),
          note: account.note,
          closed: account.closed,
          deleted: account.deleted
        }));

      return {
        accounts,
        server_knowledge: result.data.server_knowledge
      };
    } catch (error) {
      throw new Error(`Failed to fetch accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBudgetSummary() {
    try {
      const result = await this.api.budgets.getBudgetById(this.budgetId);
      const budget = result.data.budget;

      return {
        budget: {
          id: budget.id,
          name: budget.name,
          last_modified_on: budget.last_modified_on,
          first_month: budget.first_month,
          last_month: budget.last_month,
          currency_format: budget.currency_format
        },
        server_knowledge: result.data.server_knowledge
      };
    } catch (error) {
      throw new Error(`Failed to fetch budget summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPayees(searchText?: string) {
    try {
      const result = await this.api.payees.getPayees(this.budgetId);
      
      let payees = result.data.payees;
      
      if (searchText) {
        payees = payees.filter((payee: ynab.Payee) => 
          payee.name?.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      const formattedPayees = payees.map((payee: ynab.Payee) => ({
        id: payee.id,
        name: payee.name,
        transfer_account_id: payee.transfer_account_id,
        deleted: payee.deleted
      }));

      return {
        payees: formattedPayees,
        server_knowledge: result.data.server_knowledge
      };
    } catch (error) {
      throw new Error(`Failed to fetch payees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
