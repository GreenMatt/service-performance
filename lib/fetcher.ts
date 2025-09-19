// SWR fetcher and data fetching utilities

export const fetcher = async (url: string) => {
  // Avoid browser HTTP cache writes that can fail with large payloads
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
};

// Helper to build query string from filters
export function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else {
        params.set(key, value.toString());
      }
    }
  });
  
  return params.toString();
}

// SWR keys for consistent cache management
export const SWR_KEYS = {
  workOrders: (filters?: Record<string, any>) => 
    `/api/work-orders${filters ? '?' + buildQueryString(filters) : ''}`,
  sites: () => `/api/sites`,
  inventory: (filters?: Record<string, any>) => 
    `/api/inventory${filters ? '?' + buildQueryString(filters) : ''}`,
  supply: (filters?: Record<string, any>) => 
    `/api/supply${filters ? '?' + buildQueryString(filters) : ''}`,
  demand: (filters?: Record<string, any>) => 
    `/api/demand${filters ? '?' + buildQueryString(filters) : ''}`,
  snapshot: (filters?: Record<string, any>) =>
    `/api/snapshot${filters ? '?' + buildQueryString(filters) : ''}`,
  workOrderProducts: (filters?: Record<string, any>) =>
    `/api/work-order-products${filters ? '?' + buildQueryString(filters) : ''}`,
  workOrderServices: (filters?: Record<string, any>) =>
    `/api/work-order-services${filters ? '?' + buildQueryString(filters) : ''}`,
} as const;
