import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';

// Ensure Azure CLI is in PATH for Azure SDK to find it
if (process.platform === 'win32' && !process.env.PATH?.includes('Microsoft SDKs\\Azure\\CLI2\\wbin')) {
  process.env.PATH = process.env.PATH + ';C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin';
}

// Runtime configuration from CLAUDE.md
export const settings = {
  dataAreaId: 'mau1',
  defaultHorizonDays: 30,
  ageingBuckets: [2, 7, 14, 30],
  itemGroups: ['10', '15', '20'],
};

// Get Azure access token for Synapse authentication
async function getAccessToken(): Promise<string> {
  try {
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://database.windows.net/');
    return tokenResponse.token;
  } catch (error) {
    console.error('Failed to get Azure access token:', error);
    throw new Error('Authentication failed - ensure you are logged into Azure CLI or have proper Azure credentials configured');
  }
}

// Azure Synapse connection configuration with Entra ID authentication
async function getSynapseConfig(): Promise<sql.config> {
  const accessToken = await getAccessToken();

  return {
    server: process.env.SYNAPSE_SERVER || '',
    port: parseInt(process.env.SYNAPSE_PORT || '1433'),
    database: process.env.SYNAPSE_DATABASE || undefined,
    // Don't specify database in connection - we'll switch to it after connecting
    authentication: {
      type: 'azure-active-directory-access-token',
      options: {
        token: accessToken,
      },
    },
    options: {
      encrypt: true, // Azure requires encryption
      trustServerCertificate: false,
      enableArithAbort: true,
      requestTimeout: 60000,
      connectionTimeout: 30000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

let pool: sql.ConnectionPool | null = null;
let poolPromise: Promise<sql.ConnectionPool> | null = null;

export async function getDatabase(): Promise<sql.ConnectionPool> {
  if (process.env.USE_MOCK_DATA === 'true') {
    throw new Error('Mock data mode enabled - use mock APIs instead');
  }

  // Fast path
  if (pool) return pool;

  // Serialize concurrent initial connections across API calls
  if (!poolPromise) {
    poolPromise = (async () => {
      try {
        const config = await getSynapseConfig();
        const p = new sql.ConnectionPool(config);
        await p.connect();
        console.log(`Connected to Azure Synapse (db: ${process.env.SYNAPSE_DATABASE || '(default)'} ) with Entra ID authentication`);

        pool = p;
        return p;
      } catch (error) {
        // Reset promise on failure so subsequent calls can retry
        poolPromise = null;
        console.error('Failed to connect to Azure Synapse:', error);
        throw error;
      }
    })();
  }

  const p = await poolPromise;
  // Clear the promise after fulfillment; keep the actual pool for reuse
  poolPromise = null;
  return p;
}

// Helper function to execute queries with parameters
export async function executeQuery<T = any>(
  query: string,
  parameters: Record<string, any> = {}
): Promise<T[]> {
  let database: sql.ConnectionPool;

  try {
    database = await getDatabase();

    // Check if connection is still valid
    if (!database.connected) {
      console.log('Database connection lost, attempting to reconnect...');
      pool = null; // Reset pool to force reconnection
      database = await getDatabase();
    }

    const request = database.request();

    // Add parameters to request
    Object.entries(parameters).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('Database query error:', error);

    // If connection error, reset pool and retry once
    if (error instanceof Error && (error.message.includes('Connection is closed') || error.message.includes('ECONNCLOSED'))) {
      console.log('Connection closed, resetting pool and retrying...');
      pool = null;
      database = await getDatabase();
      const request = database.request();

      Object.entries(parameters).forEach(([key, value]) => {
        request.input(key, value);
      });

      const result = await request.query(query);
      return result.recordset;
    }

    throw error;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Database connection closed');
  }
}

// Types for the canonical views from CLAUDE.md
export interface DefaultOrderSettings {
  ItemId: string;
  InventSiteId: string;
  StdOrderQty: number;
  MinOrderQty: number;
  MaxOrderQty: number;
  MultipleQty: number;
  DefaultOrderType: string;
}

export interface ItemCoverage {
  ItemId: string;
  InventSiteId: string;
  InventLocationId: string;
  LeadTimeDays: number;
  SafetyStockQty: number;
  ReorderQty: number;
  MinimumQty: number;
  MaximumQty: number;
  PrimaryVendor: string;
  ReqPOType: string;
  rn: number;
}

export interface ServiceInventorySnapshot {
  ItemNumber: string;
  SiteID: string;
  WarehouseID: string;
  WarehouseOnHand: number;
  WarehouseAvailable: number;
  WarehouseReserved: number;
  LeadTimeDays: number;
  PrimaryVendor: string;
  ReqPOType: string;
  CurrentSafetyStock: number;
  CurrentReorderQty: number;
  CurrentMinOnHand: number;
  CurrentMaxOnHand: number;
  WarehouseAvgDailyDemand: number;
  WarehouseDemandStdDev: number;
  WarehouseTotalDemand: number;
  WarehouseOrderFrequency: number;
  InboundQtyWithinHorizon: number;
  NextETAWithinHorizon: string | null;
  PartsBelowSafety: boolean;
  HasInboundWithinHorizon: boolean;
  BelowSafety_NoSupply: boolean;
}
