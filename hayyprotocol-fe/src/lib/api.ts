// API client for HayyProtocol backend
// Use environment variable for API base URL (for different environments)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface Position {
  suiAddress: string;
  stxCollateral: number;
  sbtcCollateral: number;
  usdcBorrowed: number;
  isLiquidatable: boolean;
  borrowPower: number;
  objectId: string;
}

export interface LookupResponse {
  success: boolean;
  stacksAddress?: string;
  position?: Position;
  message?: string;
}

export interface SuggestResponse {
  success: boolean;
  message: string;
  currentAddress: string;
  position?: Position;
  suggestions?: Array<{
    stacksAddress: string;
    suiAddress: string;
    stxCollateral: number;
    borrowPower: number;
  }>;
}

export interface PositionsResponse {
  success: boolean;
  positions: Array<Position & { stacksAddress: string }>;
  total: number;
}

export interface WithdrawRequest {
  suiAddress: string;
  amount: number;
}

export interface WithdrawResponse {
  success: boolean;
  message?: string;
  warning?: string;
  suiAddress?: string;
  stacksAddress?: string;
  amount?: number;
  transactions?: {
    sui: string;
    stacks: string | null;
  };
}

class HayyProtocolAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Get the current API base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }

  async lookupByStacksAddress(stacksAddress: string): Promise<LookupResponse> {
    const response = await fetch(`${this.baseUrl}/lookup/${stacksAddress}`);
    return response.json();
  }

  async suggestForSuiAddress(suiAddress: string): Promise<SuggestResponse> {
    const response = await fetch(`${this.baseUrl}/suggest/${suiAddress}`);
    return response.json();
  }

  async getAllPositions(): Promise<PositionsResponse> {
    const response = await fetch(`${this.baseUrl}/positions`);
    return response.json();
  }

  async getPositionBySuiAddress(suiAddress: string): Promise<LookupResponse> {
    const response = await fetch(`${this.baseUrl}/position/${suiAddress}`);
    return response.json();
  }

  async getAddressMappings(): Promise<{ success: boolean; mappings: Record<string, string> }> {
    const response = await fetch(`${this.baseUrl}/mappings`);
    return response.json();
  }

  async healthCheck(): Promise<{ success: boolean; message: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  async withdraw(request: WithdrawRequest): Promise<WithdrawResponse> {
    const response = await fetch(`${this.baseUrl}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return response.json();
  }
}

export const hayyProtocolAPI = new HayyProtocolAPI();
export default hayyProtocolAPI;