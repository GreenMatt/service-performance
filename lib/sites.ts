// Site code/name mapping to bridge differences between sources
// Extend this map as new sites appear in your environment.

type SiteEntry = {
  code: string;      // e.g., 'L-QLD'
  name: string;      // e.g., 'QLD SALES & SERVICE'
  aliases?: string[];// optional alternate labels
};

export const SITE_MAP: SiteEntry[] = [
  { code: 'L-QLD', name: 'QLD SALES & SERVICE', aliases: ['QLD SALES AND SERVICE', 'QLD SERVICE'] },
  { code: 'L-VIC', name: 'VICTORIA SALES & SERVICE', aliases: ['VIC SALES & SERVICE', 'VICTORIA SERVICE'] },
  { code: 'L-NSW', name: 'NSW SALES & SERVICE', aliases: ['NEW SOUTH WALES SALES & SERVICE', 'NSW SERVICE'] },
  { code: 'L-FBK', name: 'FAIRBANK SALES & SERVICE', aliases: ['FAIRBANK SALES AND SERVICE', 'FAIRBANK SERVICE'] },
  { code: 'L-SAU', name: 'SA SALES & SERVICE', aliases: ['SA SALES AND SERVICE', 'SOUTH AUSTRALIA SALES & SERVICE', 'SA SERVICE'] },
  { code: 'L-BEN', name: 'BENDIGO SALES & SERVICE', aliases: ['BENDIGO SALES AND SERVICE', 'BENDIGO SERVICE'] },
  { code: 'L-SUN', name: 'SUNSHINE SALES & SERVICE', aliases: ['SUNSHINE', 'SUNSHINE SERVICE', 'SUNSHINE SALES AND SERVICE'] },
  { code: 'L-WAU', name: 'WA SALES & SERVICE', aliases: ['WA SALES', 'WESTERN AUSTRALIA SALES & SERVICE', 'WA SALES AND SERVICE', 'WA SERVICE'] },
  // Reinforce variants for existing sites
  { code: 'L-VIC', name: 'VICTORIA SALES & SERVICE', aliases: ['VICTORIA SALES AND SERVICE', 'VIC SALES AND SERVICE'] },
  { code: 'L-NSW', name: 'NSW SALES & SERVICE', aliases: ['NSW SALES AND SERVICE'] },
];

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+&\s+/g, ' & ').replace(/\s+/g, ' ');
}

export function toSiteCode(value: string): string {
  const v = normalize(value);
  const found = SITE_MAP.find(e =>
    normalize(e.code) === v || normalize(e.name) === v || (e.aliases || []).some(a => normalize(a) === v)
  );
  // Heuristic: if looks like a code (has dash and uppercase letters), pass through
  if (!found) return value;
  return found.code;
}

export function toSiteName(value: string): string {
  const v = normalize(value);
  const found = SITE_MAP.find(e =>
    normalize(e.code) === v || normalize(e.name) === v || (e.aliases || []).some(a => normalize(a) === v)
  );
  if (!found) return value;
  return found.name;
}

export function mapSitesToCodes(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  return values.map(toSiteCode);
}

export function mapSitesToNames(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  return values.map(toSiteName);
}

export function getSiteOptions(): Array<{ code: string; name: string }> {
  return SITE_MAP.map(({ code, name }) => ({ code, name }))
}
