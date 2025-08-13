import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerYNABTools } from '../../../src/tools/ynab-tools';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Mock the YNAB service
vi.mock('../../../src/services/ynab-service', () => ({
  YNABService: vi.fn().mockImplementation(() => ({
    getTransactions: vi.fn().mockResolvedValue({
      transactions: [],
      total_count: 0,
      returned_count: 0
    }),
    createTransaction: vi.fn().mockResolvedValue({
      transaction: { id: 'test-123' }
    }),
    getCategories: vi.fn().mockResolvedValue({
      category_groups: []
    }),
    getAccounts: vi.fn().mockResolvedValue({
      accounts: []
    }),
    getBudgetSummary: vi.fn().mockResolvedValue({
      budget: { id: 'test-budget', name: 'Test Budget' }
    }),
    getPayees: vi.fn().mockResolvedValue({
      payees: []
    })
  }))
}));

describe('YNAB Tools Registration', () => {
  let mockServer: McpServer;
  let mockEnv: Env;
  let mockProps: any;

  beforeEach(() => {
    mockServer = {
      tool: vi.fn()
    } as any;

    mockEnv = {
      YNAB_API_TOKEN: 'test-token',
      YNAB_BUDGET_ID: 'test-budget-id'
    } as any;

    mockProps = {
      login: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      accessToken: 'test-access-token'
    };
  });

  it('should register all YNAB tools when environment variables are present', () => {
    registerYNABTools(mockServer, mockEnv, mockProps);

    // Verify that all 6 tools are registered
    expect(mockServer.tool).toHaveBeenCalledTimes(6);
    
    // Check that the tools are registered with correct names
    const toolCalls = (mockServer.tool as any).mock.calls;
    const toolNames = toolCalls.map((call: any) => call[0]);
    
    expect(toolNames).toContain('getTransactions');
    expect(toolNames).toContain('createTransaction');
    expect(toolNames).toContain('getCategories');
    expect(toolNames).toContain('getAccounts');
    expect(toolNames).toContain('getBudgetSummary');
    expect(toolNames).toContain('getPayees');
  });

  it('should not register tools when YNAB_API_TOKEN is missing', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    delete (mockEnv as any).YNAB_API_TOKEN;
    
    registerYNABTools(mockServer, mockEnv, mockProps);
    
    expect(mockServer.tool).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'YNAB_API_TOKEN or YNAB_BUDGET_ID not found in environment variables. YNAB tools will not be registered.'
    );
    
    consoleSpy.mockRestore();
  });

  it('should not register tools when YNAB_BUDGET_ID is missing', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    delete (mockEnv as any).YNAB_BUDGET_ID;
    
    registerYNABTools(mockServer, mockEnv, mockProps);
    
    expect(mockServer.tool).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'YNAB_API_TOKEN or YNAB_BUDGET_ID not found in environment variables. YNAB tools will not be registered.'
    );
    
    consoleSpy.mockRestore();
  });
});
