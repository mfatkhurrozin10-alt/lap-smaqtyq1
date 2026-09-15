const SUPABASE_URL = 'https://aqxqruzvvckveuaqusjw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeHFydXp2dmNrdmV1YXF1c2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTgwNTksImV4cCI6MjEwNDczNDA1OX0.55rYYicD0hELKo3oS_CXQBzrjDldoHxhUc6ZLnaMp4c';

export const getCurrentAcademicYear = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  return now.getMonth() >= 6 
    ? `${currentYear}/${currentYear + 1}` 
    : `${currentYear - 1}/${currentYear}`;
};

export const getCurrentMonthName = (): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[new Date().getMonth()];
};

const createRestClient = (baseUrl: string, apiKey: string) => {
  const defaultHeaders: Record<string, string> = {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  return {
    from: (table: string) => {
      const queryParams: string[] = [];
      let orderParam = '';
      let isCount = false;
      let rangeHeader = ''; // Tambahan untuk paginasi (mengakali limit 1000)

      const queryBuilder = {
        select: (columns: string = '*', options?: { count?: string }) => {
          queryParams.push(`select=${encodeURIComponent(columns)}`);
          if (options?.count === 'exact') isCount = true;
          return queryBuilder;
        },
        order: (column: string, { ascending = true } = {}) => {
          orderParam = `order=${column}.${ascending ? 'asc' : 'desc'}`;
          return queryBuilder;
        },
        eq: (column: string, value: any) => {
          queryParams.push(`${column}=eq.${encodeURIComponent(value)}`);
          return queryBuilder;
        },
        gte: (column: string, value: any) => {
          queryParams.push(`${column}=gte.${encodeURIComponent(value)}`);
          return queryBuilder;
        },
        lte: (column: string, value: any) => {
          queryParams.push(`${column}=lte.${encodeURIComponent(value)}`);
          return queryBuilder;
        },
        // --- TAMBAHAN BARU: range untuk paginasi ---
        range: (from: number, to: number) => {
          rangeHeader = `${from}-${to}`;
          return queryBuilder;
        },
        // -------------------------------------------
        insert: async (records: any[]) => {
          try {
            const res = await fetch(`${baseUrl}/rest/v1/${table}`, {
              method: 'POST',
              headers: { ...defaultHeaders, 'Prefer': 'return=representation' },
              body: JSON.stringify(records),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ message: res.statusText }));
              return { data: null, error: err };
            }
            const data = await res.json().catch(() => null);
            return { data, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
        update: (updates: any) => {
          return {
            eq: async (column: string, value: any) => {
              try {
                const res = await fetch(`${baseUrl}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
                  method: 'PATCH',
                  headers: { ...defaultHeaders, 'Prefer': 'return=representation' },
                  body: JSON.stringify(updates),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({ message: res.statusText }));
                  return { data: null, error: err };
                }
                const data = await res.json().catch(() => null);
                return { data, error: null };
              } catch (err: any) {
                return { data: null, error: err };
              }
            }
          };
        },
        delete: () => {
          return {
            eq: async (column: string, value: any) => {
              try {
                const res = await fetch(`${baseUrl}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
                  method: 'DELETE',
                  headers: { ...defaultHeaders, 'Prefer': 'return=representation' },
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({ message: res.statusText }));
                  return { data: null, error: err };
                }
                const data = await res.json().catch(() => null);
                return { data, error: null };
              } catch (err: any) {
                return { data: null, error: err };
              }
            }
          };
        },
        then: (onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null): Promise<any> => {
          const combinedParams = [...queryParams];
          if (orderParam) combinedParams.push(orderParam);
          const qs = combinedParams.length ? `?${combinedParams.join('&')}` : '';
          const headers: Record<string, string> = { ...defaultHeaders };
          
          if (isCount) headers['Prefer'] = 'count=exact';
          
          // Sisipkan Header Range jika dipanggil
          if (rangeHeader) {
            headers['Range-Unit'] = 'items';
            headers['Range'] = rangeHeader;
          }

          return fetch(`${baseUrl}/rest/v1/${table}${qs}`, { headers })
            .then(async (res) => {
              if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                return { data: null, error: err, count: 0 };
              }
              const contentRange = res.headers.get('content-range');
              let count: number | null = null;
              if (contentRange) {
                const total = contentRange.split('/')[1];
                if (total) count = parseInt(total, 10);
              }
              const data = await res.json().catch(() => []);
              return { data, error: null, count: count ?? (Array.isArray(data) ? data.length : 0) };
            })
            .catch((err) => ({ data: null, error: err, count: 0 }))
            .then(onfulfilled, onrejected);
        }
      };

      return queryBuilder;
    }
  };
};

export const supabase = createRestClient(SUPABASE_URL, SUPABASE_ANON_KEY);