import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { YNABService } from '../services/ynab-service.js';
import { Props } from "../types";
import { z } from "zod";
import * as ynab from 'ynab';

/**
 * Register YNAB tools with the MCP server
 */
export function registerYNABTools(server: McpServer, env: Env, props: Props) {
  if (!env.YNAB_API_TOKEN || !env.YNAB_BUDGET_ID) {
    console.warn('YNAB_API_TOKEN or YNAB_BUDGET_ID not found in environment variables. YNAB tools will not be registered.');
    return;
  }

  const service = new YNABService(env.YNAB_API_TOKEN, env.YNAB_BUDGET_ID);

  // Tool 1: Get Transactions
  server.tool(
    "getTransactions",
    "Fetch transactions with optional filtering by search text, date range, account, or category",
    {
      searchText: z.string().optional().describe('Text to search for in payee names or memos'),
      accountId: z.string().optional().describe('Filter by specific account ID'),
      categoryId: z.string().optional().describe('Filter by specific category ID'),
      sinceDate: z.string().optional().describe('Start date for transaction range (YYYY-MM-DD format)'),
      limit: z.number().int().min(1).max(100).default(10).describe('Maximum number of transactions to return')
    },
    async (args) => {
      try {
        const result = await service.getTransactions(args);
        return {
          content: [
            {
              type: "text",
              text: `**Transactions Retrieved**\n\n**Results:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n**Summary:** Retrieved ${result.returned_count} of ${result.total_count} transactions`
            }
          ]
        };
      } catch (error) {
        console.error('getTransactions error:', error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to fetch transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
              isError: true
            }
          ]
        };
      }
    }
  );

  // Tool 2: Create Transaction
  server.tool(
    "createTransaction",
    "Create a new transaction in YNAB",
    {
      account_id: z.string().describe('ID of the account for the transaction'),
      amount: z.number().describe('Transaction amount (positive for inflow, negative for outflow) in milliunits (123930 -> R123.93)'),
      payee_name: z.string().optional().describe('Name of the payee'),
      category_id: z.string().optional().describe('ID of the category (optional for transfer transactions)'),
      memo: z.string().optional().describe('Transaction memo/note'),
      date: z.string().optional().describe('Transaction date in YYYY-MM-DD format (defaults to today)'),
      cleared: z.nativeEnum(ynab.TransactionDetail.ClearedEnum).optional().describe('Transaction cleared status'),
      approved: z.boolean().optional().describe('Whether the transaction is approved'),
      flag_color: z.nativeEnum(ynab.TransactionDetail.FlagColorEnum).optional().describe('Flag color for the transaction')
    },
    async (args) => {
      try {
        const result = await service.createTransaction(args);
        return {
          content: [
            {
              type: "text",
              text: `**Transaction Created Successfully**\n\n**Results:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n**Created by:** ${props.login} (${props.name})`
            }
          ]
        };
      } catch (error) {
        console.error('createTransaction error:', error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
              isError: true
            }
          ]
        };
      }
    }
  );

  // Tool 3: Get Categories
  server.tool(
    "getCategories",
    "Get all budget categories organized by category groups",
    {
      includeHidden: z.boolean().default(false).describe('Include hidden/deleted categories')
    },
    async (args) => {
      try {
        const result = await service.getCategories(args.includeHidden);
        return {
          content: [
            {
              type: "text",
              text: `**Budget Categories**\n\n**Results:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n**Total category groups:** ${result.category_groups.length}`
            }
          ]
        };
      } catch (error) {
        console.error('getCategories error:', error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
              isError: true
            }
          ]
        };
      }
    }
  );

  // Tool 4: Get Accounts
  server.tool(
    "getAccounts",
    "Get all accounts in the budget",
    {
      includeDeleted: z.boolean().default(false).describe('Include deleted/closed accounts')
    },
    async (args) => {
      try {
        const result = await service.getAccounts(args.includeDeleted);
        return {
          content: [
            {
              type: "text",
              text: `**Budget Accounts**\n\n**Results:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n**Total accounts:** ${result.accounts.length}`
            }
          ]
        };
      } catch (error) {
        console.error('getAccounts error:', error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to fetch accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
              isError: true
            }
          ]
        };
      }
    }
  );

  // Tool 5: Get Budget Summary
  server.tool(
    "getBudgetSummary",
    "Get overall budget information and summary",
    {},
    async () => {
      try {
        const result = await service.getBudgetSummary();
        return {
          content: [
            {
              type: "text",
              text: `**Budget Summary**\n\n**Results:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
            }
          ]
        };
      } catch (error) {
        console.error('getBudgetSummary error:', error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to fetch budget summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
              isError: true
            }
          ]
        };
      }
    }
  );

  // Tool 6: Get Payees
  server.tool(
    "getPayees",
    "Get all payees in the budget",
    {
      searchText: z.string().optional().describe('Filter payees by name')
    },
    async (args) => {
      try {
        const result = await service.getPayees(args.searchText);
        return {
          content: [
            {
              type: "text",
              text: `**Budget Payees**\n\n**Results:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n**Total payees:** ${result.payees.length}`
            }
          ]
        };
      } catch (error) {
        console.error('getPayees error:', error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to fetch payees: ${error instanceof Error ? error.message : 'Unknown error'}`,
              isError: true
            }
          ]
        };
      }
    }
  );

  console.log(`✅ Registered 6 YNAB tools`);
}
