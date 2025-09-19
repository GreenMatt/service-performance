# Claude Brief — Service Performance Dashboard (React + Tailwind)

> You are **Claude**, acting as a senior full‑stack engineer and UI designer. Build a **Next.js (App Router)** + **React** + **Tailwind** site that renders a high‑signal, minimal‑friction dashboard for a Service Department. Priorities: **clarity, speed, aesthetics, zero guesswork.**

## 🎯 PROJECT STATUS (2025-09-18) - PRODUCTION READY ✅

### ✅ **COMPLETED FEATURES**
- **💯 Dashboard KPIs**: 10 comprehensive KPI cards in 2x5 grid layout
- **🔗 Live Data Connection**: Azure Synapse with Entra ID authentication
- **📊 Real-time Metrics**: Work orders, WIP values, parts costs, revenue
- **🎨 Dark Mode Support**: Full light/dark theme toggle across all pages
- **📱 Responsive Design**: Mobile-friendly with clean card layouts
- **🔄 Connection Management**: Auto-reconnect with keep-alive mechanism
- **🎯 Site Filtering**: Real-time filtering by service locations
- **💰 Financial KPIs**: Labour costs, parts costs, month-to-date revenue
- **📈 Performance Metrics**: Resolution times, gross margins, ageing analysis

### 🏗️ **CURRENT ARCHITECTURE**
- **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: Azure Synapse Analytics with D365 Finance & Operations data
- **Authentication**: Azure Entra ID (formerly Azure AD)
- **UI Components**: shadcn/ui + Framer Motion animations
- **Data Fetching**: SWR with intelligent caching and revalidation
- **Theme System**: next-themes with CSS variables

### 📊 **DATA SOURCES**
- **Work Orders**: `dbo.msdyn_workorder` with status codes 690970000-690970005
- **Inventory**: `bm.vw_ServiceInventorySnapshot_AU` for parts tracking
- **Sites**: Multi-site support (QLD, NSW, VIC, SA, WA, Fairbank, Bendigo, etc.)
- **Financial Data**: Labour costs, parts costs, WIP values, gross margins

## 0) Mission & Outcome
- Deliver a **production‑ready** dashboard that answers, at a glance:
  1) **Open Work Orders** (count, by status/priority/site)
  2) **Ageing of Work Orders** (bucketed and trend)
  3) **Parts Below Safety** (count and list)
  4) **Parts Below Safety with *No Supply*** (no PO/TO in horizon)
  5) A **Current Position Snapshot** that merges **Supply vs Demand** so planners know **exactly what to action or expedite**.
- Ship a beautiful, responsive UI using Tailwind; include tasteful micro‑interactions and loading skeletons; fast initial render.

## 1) Tech Guardrails (do not deviate)
- **Framework**: Next.js 14+ (App Router, RSC where helpful) + TypeScript.
- **Styling**: Tailwind CSS, custom CSS variables for theme tokens.
- **UI Kit**: shadcn/ui (Cards, Button, Table, Tabs, Dropdown, Tooltip, Dialog), lucide-react icons.
- **Charts**: Recharts (simple, performant), or lightweight SVG for mini‑sparklines.
- **Tables**: TanStack Table v8 with column pinning, sorting, filters, virtualization (react‑virtual).
- **State/Data**: Server Components + **SWR** on the client for revalidation; cache + optimistic updates for minor actions.
- **Animations**: Framer Motion (subtle only; prefer 150–200ms ease‑in‑out).
- **Quality**: ESLint, Prettier, Jest/RTL smoke tests for core components.

## 2) Information Architecture
- **/ (Dashboard Home)**: KPI strip + key charts + quick lists.
- **/work-orders**: Explorer table + ageing filters + drill‑through panel.
- **/inventory**: Parts below safety, and below safety with no supply; detail drawer shows POs/TOs and coverage.
- **/snapshot**: Comprehensive **Supply vs Demand** matrix with action badges (Expedite, Transfer, Reallocate).
- **/api/**: Mock endpoints that serve realistic JSON (can be swapped to real SQL/warehouse feeds later).

## 3) KPIs — Definitions (exact math)
> Use these formulas consistently across cards, charts, and tables.

### 3.1 Open Work Orders (OWO)
- **Count** of work orders with `Status ∈ {Open, InProgress, WaitingParts, Scheduled}`.
- Breakdowns: by **Site**, **Priority**, **Technician**, **ServiceType**.

### 3.2 Ageing of Work Orders (AWO)
- **AgeDays** = `DATEDIFF(day, CreatedDate, NOW)`; for closed WOs, cap AgeDays at ClosureDate.
- Buckets: `0–2d`, `3–7d`, `8–14d`, `15–30d`, `>30d` (configurable).
- KPI: total open by bucket + a 7‑day **trend** (line sparkline of opens vs closes).

### 3.3 Parts Below Safety (PBS)
- A part is **Below Safety** when `OnHand < SafetyStock` (per site/warehouse).
- KPI: count of unique `(ItemId, Site)` failing; card links to filtered inventory view.

### 3.4 Parts Below Safety **with No Supply** (PBS‑NS)
- From PBS subset, select items with **no inbound** supply inside the **planning horizon** (e.g., `ETA ≤ today + 30 days`) across **POs + Transfer Orders**.
- KPI: count + list with **Action** tag (Expedite PO / Raise TO / Reallocate).

### 3.5 Current Position Snapshot (CPS)
- A row per `(ItemId, Site)` that blends demand vs supply:
  - **Demand**: `Open Work Orders parts demand` + `Open Sales/Backorders` + `Reservations (internal)`.
  - **Supply**: `OnHand`, `InboundQty (PO/TO)` and **NextETA**.
  - **Gap**: `max(0, Demand - (OnHand + InboundWithinHorizon))`.
  - **CoverDays**: `(OnHand + InboundWithinHorizon) / AvgDailyDemand`.
  - **Action**:
    - If `Gap > 0` and `NextETA = null → Expedite / Raise PO`
    - If `Gap > 0` and `NextETA >> SLA → Expedite`
    - If `OnHand > 0` other site → `Transfer`

> **Horizon** default 30 days; expose a UI control. Safety and min should be visible columns.

## 4) Data Contracts (Mockable APIs)
> Provide **realistic JSON** so the UI can be built without the live warehouse. Each endpoint supports `?site=...&from=...&to=...&status=...` filters.

### 4.1 `/api/work-orders` (GET)
```ts
interface WorkOrder {
  WorkOrderId: string;
  Status: 'Open'|'InProgress'|'WaitingParts'|'Scheduled'|'Closed'|'Cancelled';
  Priority: 'Critical'|'High'|'Normal'|'Low';
  ServiceType: 'Internal'|'External'|'Warranty';
  Site: string;            // e.g., 'L-FBK', 'B-XYZ'
  Technician?: string;
  CreatedDate: string;     // ISO
  PromisedDate?: string;   // ISO
  ClosedDate?: string;     // ISO
  AgeDays: number;         // precomputed or compute client-side
  Parts: Array<{ ItemId: string; Qty: number }>;
}
```

### 4.2 `/api/inventory` (GET)
```ts
interface InventoryRow {
  ItemId: string;
  ItemName?: string;
  Site: string;
  Warehouse?: string;
  OnHand: number;
  SafetyStock: number;
  MinOnHand?: number;        // ROP
  AvgDailyDemand?: number;
}
```

### 4.3 `/api/supply` (GET)
```ts
interface SupplyRow {
  ItemId: string;
  Site: string;
  Source: 'PO'|'TransferOrder';
  Ref: string;               // PO/TO number
  Qty: number;
  ETA: string|null;          // ISO
}
```

### 4.4 `/api/demand` (GET)
```ts
interface DemandRow {
  ItemId: string;
  Site: string;
  DemandType: 'WorkOrder'|'Sales'|'Reservation'|'Internal';
  Ref?: string;              // WO/SO/Req id
  Qty: number;
  NeedBy?: string|null;      // ISO
}
```

### 4.5 `/api/snapshot` (GET)
- Returns the **joined** CPS rows so the UI’s heavy merge is server‑side.
```ts
interface SnapshotRow {
  ItemId: string; Site: string;
  OnHand: number; SafetyStock: number; MinOnHand?: number;
  InboundQty: number; NextETA: string|null;
  DemandQty: number; Gap: number; CoverDays?: number;
  Action: 'OK'|'Expedite'|'Transfer'|'RaisePO'|'Reallocate';
}
```

> For local dev, implement API routes that read `/data/*.json` and filter server‑side. Include **seed JSON** with ~200 WOs and ~500 SKUs for realistic performance testing.

## 5) UI/UX Spec
### 5.1 Layout
- **Header**: Logo/Title on left; Site selector (multi), Date range picker, Search; Avatar with "Last updated: hh:mm" tooltip.
- **KPI strip** (4 Cards):
  - Open WOs (chip breakdown by status)
  - Ageing (mini histogram + worst bucket value)
  - Parts Below Safety
  - Below Safety w/ No Supply
- **Charts**:
  - Ageing stacked bar (buckets × count), clickable to filter table.
  - Open WOs by priority/site (grouped bar).
- **Quick Lists**:
  - "Waiting for Parts" (top 10 oldest)
  - "Expedite Watch" (from CPS Action ≠ OK)

### 5.2 Current Position Snapshot Table
- Columns: `ItemId | Site | OnHand | Safety | Min | InboundQty | NextETA | Demand | Gap | CoverDays | Action`
- Row expand: show **PO/TO lines**, **WO/Sales demand lines**.
- Row badge color:
  - `OK` (muted), `Expedite` (amber), `Transfer` (cyan), `RaisePO` (rose), `Reallocate` (purple).
- Column pinning for identity columns; column resizing; CSV export.

### 5.3 Accessibility & Perf
- Keyboard traversal for tables; aria labels on charts; tooltips avoid hover‑only traps.
- Virtualize tables >100 rows; lazy‑load charts; use suspense fallbacks.

## 6) Visual Language
- **Theme tokens** (CSS vars): `--bg`, `--card`, `--text`, `--muted`, `--brand`, `--accent`.
- Base palette: near‑white cards on neutral background; **brand accent** for KPIs; soft shadows; `rounded-2xl` cards; generous spacing (`p-6` min).
- Micro‑interaction patterns: hover lift on cards; skeleton loaders; progress pills for bucket bars.

## 7) Component Inventory (build all)
- `<KpiCard />` with value, delta, caption, onClick.
- `<AgeingChart />` (stacked bar; props: buckets[]).
- `<BarBySite />` (grouped bar).
- `<SnapshotTable />` (TanStack + virtualization + expandable rows).
- `<Filters />` (site multi‑select, date range, status chips).
- `<ActionBadge />`.
- `<LastUpdated />`.

## 8) Sample Data (place under /data)
- `work-orders.json`: ~200 rows across 3 sites with varied statuses and ages.
- `inventory.json`: ~500 rows with OnHand/Safety/Min and AvgDailyDemand.
- `supply.json`: future ETAs, mixture of PO and TO; some null ETAs.
- `demand.json`: demand by type; include 1–2 big spikes.
- `snapshot.json`: precomputed CPS rows for the /snapshot page.

## 9) Folder Structure
```
app/
  layout.tsx
  page.tsx                      # dashboard home
  work-orders/page.tsx
  inventory/page.tsx
  snapshot/page.tsx
  api/
    work-orders/route.ts
    inventory/route.ts
    supply/route.ts
    demand/route.ts
    snapshot/route.ts
components/
  kpi-card.tsx
  ageing-chart.tsx
  bar-by-site.tsx
  snapshot-table/
    index.tsx
    columns.tsx
    row-detail.tsx
  filters.tsx
lib/
  fetcher.ts
  date.ts
  kpi.ts                        # shared KPI math (buckets, ageing)
public/
  logo.svg
  favicon.svg
styles/
  globals.css
  theme.css                     # CSS variables
```

## 10) Implementation Notes
- **Ageing buckets**: implement util returning `{bucketLabel,count}` and a color scale.
- **No Supply**: filter where *no* supply rows exist `ETA ≤ horizon` (30d default) for a given `(ItemId,Site)`.
- **CoverDays**: guard against div‑by‑zero; show `∞` if AvgDailyDemand ≈ 0 but OnHand>0.
- **Server‑side**: do heavy joins in `/api/snapshot` so the UI remains snappy.
- **SSR/ISR**: Home = server component with streaming; set revalidate to 300s by default.

## 11) Acceptance Criteria
- [ ] KPI values match the API (unit tests over kpi.ts for bucket math).
- [ ] Dashboard initial contentful paint < **2s** on mid‑range laptop.
- [ ] Table handles **10k rows** without jank (virtualized).
- [ ] A11y: meaningful labels, keyboard support, high contrast mode.
- [ ] "Below Safety with No Supply" filter yields **zero false positives** given the API join.

## 12) Developer Tasks (sequenced)
1. Scaffold Next.js + Tailwind + shadcn/ui + Recharts.
2. Implement mock APIs and seed data under `/data`.
3. Build **KPI strip** with correct numbers and links.
4. Build **AgeingChart** and **BarBySite**; wire filters.
5. Build **SnapshotTable**: columns, expand rows, virtualization, CSV export.
6. Style pass: cards, theming tokens, responsive checks.
7. Add tests for KPI math and snapshot joins.
8. Add loading states (skeletons) and empty states.

## 13) Stretch (if time allows)
- Saved views per user; shareable filter URLs.
- Export to Excel (server‑side).
- Inline actions: mark line as "Expedite sent" with note.
- "What changed since yesterday" diff strip.

---
**Deliver exactly this app**. Use clear, typed props and keep files lean. No lorem ipsum; populate realistic labels and seed data. When in doubt, prioritize **signal over decoration** and **speed over cleverness**.



---

## 14) D365FO + Synapse Data Layer (Canonical Views)
> Lock field names and grains behind **normalization views** so React never changes when the ERP does. These views reflect your working schema (warehouse‑level coverage via `ReqItemTable.covinventdimid → InventDim → InventLocationId`, InventSum rollups, WHS pick work). Swap table names if you’re using entity exports.

### 14.1 Canonical Views (create in SQL/Synapse)

**A) Default Order Settings per Site**
```sql
CREATE OR ALTER VIEW dbo.vw_DefaultOrderSettings AS
SELECT
  ios.ItemId,
  id.InventSiteId,
  /* Canonical names */
  COALESCE(ios.StdOrderQty, ios.StandardQty)   AS StdOrderQty,
  COALESCE(ios.MinOrderQty, ios.MinQty)        AS MinOrderQty,
  COALESCE(ios.MaxOrderQty, ios.MaxQty)        AS MaxOrderQty,
  COALESCE(ios.MultipleQty, ios.Multiple)      AS MultipleQty,
  ios.DefaultOrderType
FROM dbo.InventItemInventSetup ios
LEFT JOIN dbo.InventDim id
  ON id.InventDimId = ios.InventDimId AND id.DataAreaId = ios.DataAreaId
WHERE ios.DataAreaId = 'mau1';
```

**B) Item Coverage at Warehouse (via coverage dimension)**
```sql
CREATE OR ALTER VIEW dbo.vw_ItemCoverage AS
SELECT 
  r.ItemId,
  id.InventSiteId,
  id.InventLocationId,
  r.LeadTimePurchase      AS LeadTimeDays,
  r.MinInventOnHand       AS SafetyStockQty,   -- aligned to your view
  r.ReorderPoint          AS ReorderQty,
  r.MinInventOnHand       AS MinimumQty,       -- convenience alias
  r.MaxInventOnHand       AS MaximumQty,
  r.VendId                AS PrimaryVendor,
  r.ReqPOType             AS ReqPOType,
  ROW_NUMBER() OVER (
    PARTITION BY r.ItemId, id.InventLocationId
    ORDER BY r.RecId DESC
  ) AS rn
FROM dbo.ReqItemTable r
LEFT JOIN dbo.InventDim id
  ON id.InventDimId = r.CovInventDimId
WHERE r.DataAreaId = 'mau1';
```

**C) WHS Open Pick Work (Sales)**
```sql
CREATE OR ALTER VIEW dbo.vw_OpenPickWork AS
SELECT
  wt.ordernum AS SalesId,
  wt.DataAreaId,
  SUM(CASE WHEN wl.worktype IN (1) THEN wl.qtywork ELSE 0 END) AS PickWorkQty
FROM dbo.WHSWorkTable wt
JOIN dbo.WHSWorkLine  wl
  ON wl.WorkId = wt.WorkId AND wl.DataAreaId = wt.DataAreaId
WHERE wt.DataAreaId = 'mau1'
  AND wt.WorkStatus NOT IN (4,5)   -- Closed/Cancelled
  AND wt.worktranstype = 2         -- Sales order
GROUP BY wt.ordernum, wt.DataAreaId;
```

**D) Service Inventory Snapshot (warehouse grain) with inbound horizon**
```sql
CREATE OR ALTER VIEW dbo.vw_ServiceInventorySnapshot_AU AS
WITH Params AS (
  SELECT CAST(30 AS int) AS HorizonDays, CAST('mau1' AS sysname) AS DataAreaId
),
-- Demand (Service orders only)
SalesAnalysis AS (
  SELECT SL.ItemId AS ItemNumber,
         CAST(SL.ShippingDateRequested AS date) AS ReqDate,
         SL.SalesQty AS OrderedQty,
         ID.InventSiteId, ID.InventLocationId, ID.DataAreaId
  FROM dbo.SalesLine SL
  JOIN dbo.SalesTable ST ON ST.SalesId=SL.SalesId AND ST.DataAreaId=SL.DataAreaId
  LEFT JOIN dbo.InventDim ID ON ID.InventDimId=SL.InventDimId AND ID.DataAreaId=SL.DataAreaId
  LEFT JOIN dbo.inventitemgroupitem IG ON IG.ItemId=SL.ItemId AND IG.ItemDataAreaId=SL.DataAreaId
  CROSS JOIN Params P
  WHERE SL.SalesStatus<>5 AND ST.hsoordertypeid='Service' AND IG.ItemGroupId IN ('10','15','20')
    AND LOWER(ST.DataAreaId)=LOWER(P.DataAreaId)
),
DemandStatsByWarehouse AS (
  SELECT SA.ItemNumber, SA.InventLocationId,
         COUNT(*) AS OrderFrequency,
         AVG(SA.OrderedQty) AS AvgDemandPerOrder,
         SUM(SA.OrderedQty) AS TotalDemand,
         STDEV(SA.OrderedQty) AS DemandStdDev,
         DATEDIFF(DAY, MIN(SA.ReqDate), MAX(SA.ReqDate)) AS AnalysisPeriodDays,
         CASE WHEN DATEDIFF(DAY, MIN(SA.ReqDate), MAX(SA.ReqDate))>0
              THEN SUM(SA.OrderedQty)/CAST(DATEDIFF(DAY, MIN(SA.ReqDate), MAX(SA.ReqDate)) AS float)
              ELSE 0 END AS AvgDailyDemand
  FROM SalesAnalysis SA
  GROUP BY SA.ItemNumber, SA.InventLocationId
),
-- Inventory rollup
InventoryByWarehouse AS (
  SELECT s.ItemId, s.InventLocationId,
         SUM(s.PhysicalInvent) AS OnHandQty,
         SUM(s.ReservPhysical) AS ReservedQty,
         SUM(s.AvailPhysical)  AS AvailableQty
  FROM dbo.InventSum s
  CROSS JOIN Params P
  WHERE LOWER(s.DataAreaId)=LOWER(P.DataAreaId)
  GROUP BY s.ItemId, s.InventLocationId
),
-- Inbound within horizon (PO + Transfer)
InboundPO AS (
  SELECT PL.ItemId, ID.InventLocationId,
         SUM(COALESCE(PL.RemainPurchPhysical,0)) AS InboundQtyHorizon,
         MIN(COALESCE(PL.ConfirmedDlvDate, PL.RequestedDlvDate, PL.DeliveryDate)) AS NextETA
  FROM dbo.PurchLine PL
  JOIN dbo.InventDim ID ON ID.InventDimId=PL.InventDimId AND ID.DataAreaId=PL.DataAreaId
  CROSS JOIN Params P
  WHERE PL.DataAreaId=P.DataAreaId AND COALESCE(PL.RemainPurchPhysical,0)>0
    AND COALESCE(PL.ConfirmedDlvDate, PL.RequestedDlvDate, PL.DeliveryDate)
        <= DATEADD(DAY, P.HorizonDays, CAST(GETDATE() AS date))
  GROUP BY PL.ItemId, ID.InventLocationId
),
InboundTO AS (
  SELECT ITL.ItemId, ITL.ToInventLocationId AS InventLocationId,
         SUM(COALESCE(ITL.QtyRemainReceive,0)) AS InboundQtyHorizon,
         MIN(COALESCE(ITL.ConfirmedDlvDate, ITL.DlvDate)) AS NextETA
  FROM dbo.InventTransferLine ITL
  JOIN dbo.InventTransferTable ITT ON ITT.InventTransferId=ITL.InventTransferId
  CROSS JOIN Params P
  WHERE ITL.DataAreaId=P.DataAreaId AND COALESCE(ITL.QtyRemainReceive,0)>0
    AND COALESCE(ITL.ConfirmedDlvDate, ITL.DlvDate)
        <= DATEADD(DAY, P.HorizonDays, CAST(GETDATE() AS date))
  GROUP BY ITL.ItemId, ITL.ToInventLocationId
),
InboundHorizon AS (
  SELECT ItemId, InventLocationId,
         SUM(InboundQtyHorizon) AS InboundQtyWithinHorizon,
         MIN(NextETA) AS NextETAWithinHorizon
  FROM (
    SELECT * FROM InboundPO
    UNION ALL
    SELECT * FROM InboundTO
  ) u
  GROUP BY ItemId, InventLocationId
),
AllKeys AS (
  SELECT DISTINCT ItemId AS ItemNumber, InventLocationId FROM InventoryByWarehouse
  UNION SELECT ItemNumber, InventLocationId FROM DemandStatsByWarehouse
  UNION SELECT ItemId, InventLocationId FROM InboundHorizon
  UNION SELECT ItemId, InventLocationId FROM dbo.vw_ItemCoverage WHERE rn=1
)
SELECT
  k.ItemNumber,
  id.InventSiteId AS SiteID,
  k.InventLocationId AS WarehouseID,
  -- Inventory
  ISNULL(iw.OnHandQty,0)     AS WarehouseOnHand,
  ISNULL(iw.AvailableQty,0)  AS WarehouseAvailable,
  ISNULL(iw.ReservedQty,0)   AS WarehouseReserved,
  -- Coverage (warehouse)
  COALESCE(NULLIF(cov.LeadTimeDays,0),15) AS LeadTimeDays,
  cov.PrimaryVendor,
  cov.ReqPOType,
  cov.SafetyStockQty       AS CurrentSafetyStock,
  cov.ReorderQty           AS CurrentReorderQty,
  cov.MinimumQty           AS CurrentMinOnHand,
  cov.MaximumQty           AS CurrentMaxOnHand,
  -- Demand stats
  ISNULL(ds.AvgDailyDemand,0) AS WarehouseAvgDailyDemand,
  ISNULL(ds.DemandStdDev,0)   AS WarehouseDemandStdDev,
  ISNULL(ds.TotalDemand,0)    AS WarehouseTotalDemand,
  ISNULL(ds.OrderFrequency,0) AS WarehouseOrderFrequency,
  -- Horizon supply
  ISNULL(ih.InboundQtyWithinHorizon,0) AS InboundQtyWithinHorizon,
  ih.NextETAWithinHorizon,
  -- KPI flags
  CASE WHEN ISNULL(iw.AvailableQty,0) < COALESCE(NULLIF(cov.SafetyStockQty,0), NULLIF(cov.MinimumQty,0), 0)
       THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS PartsBelowSafety,
  CASE WHEN ISNULL(ih.InboundQtyWithinHorizon,0) > 0 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS HasInboundWithinHorizon,
  CASE WHEN (ISNULL(iw.AvailableQty,0) < COALESCE(NULLIF(cov.SafetyStockQty,0), NULLIF(cov.MinimumQty,0), 0))
            AND ISNULL(ih.InboundQtyWithinHorizon,0) = 0
       THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS BelowSafety_NoSupply
FROM AllKeys k
LEFT JOIN InventoryByWarehouse iw ON iw.ItemId=k.ItemNumber AND iw.InventLocationId=k.InventLocationId
LEFT JOIN DemandStatsByWarehouse ds ON ds.ItemNumber=k.ItemNumber AND ds.InventLocationId=k.InventLocationId
LEFT JOIN InboundHorizon ih ON ih.ItemId=k.ItemNumber AND ih.InventLocationId=k.InventLocationId
LEFT JOIN dbo.vw_ItemCoverage cov ON cov.ItemId=k.ItemNumber AND cov.InventLocationId=k.InventLocationId AND cov.rn=1
LEFT JOIN dbo.InventLocation il ON il.InventLocationId=k.InventLocationId
LEFT JOIN dbo.InventSite id ON id.InventSiteId=il.InventSiteId;
```

### 14.2 Synapse Guardrails
- Always filter to **current rows** if using entity exports (e.g., `IsDeleted = 0`, or validity windows).
- Be explicit about `DataAreaId`, and always resolve **Site/Warehouse** via `InventDim` where needed.
- Avoid enum magic numbers; centralize lookups.

---

## 15) API: Production Mapping (from Views)
Wire API routes to the views so UI gets stable fields.

- `/api/snapshot` → `vw_ServiceInventorySnapshot_AU`
- `/api/inventory` → join `InventSum` (or the view above) with `vw_ItemCoverage` for current min/safety.
- `/api/work-orders` → existing service WOs feed
- `/api/supply` → union of PO/TO inbound (can proxy `InboundHorizon` CTE as its own view)
- `/api/demand` → service WO line demands + open backorders if needed

**SnapshotRow (updated)**
```ts
interface SnapshotRow {
  ItemId: string; Site: string; Warehouse: string;
  OnHand: number; Available: number; Reserved: number;
  LeadTimeDays: number;
  CurrentSafetyStock: number; CurrentReorderQty: number; CurrentMinOnHand?: number; CurrentMaxOnHand?: number;
  AvgDailyDemand?: number; DemandStdDev?: number; TotalDemand?: number; OrderFrequency?: number;
  InboundQtyWithinHorizon: number; NextETAWithinHorizon: string | null;
  PartsBelowSafety: boolean; HasInboundWithinHorizon: boolean; BelowSafety_NoSupply: boolean;
}
```

Expose **query params**:
- `?site=L-FBK&horizon=30`  → pass through to SQL (parameterize in the data layer)
- `?onlyExceptions=true`    → `WHERE BelowSafety_NoSupply=1 OR PartsBelowSafety=1`

---

## 16) KPI SQL (source‑of‑truth)
- **Open Work Orders**: `COUNT(*) WHERE Status IN ('Open','InProgress','WaitingParts','Scheduled')`.
- **Ageing**: `DATEDIFF(day, CreatedDate, COALESCE(ClosedDate, GETDATE()))` with buckets `0–2,3–7,8–14,15–30,>30`.
- **Parts Below Safety**: `Available < COALESCE(SafetyStock, MinimumQty, 0)`.
- **Below Safety & No Supply**: condition above **AND** `InboundQtyWithinHorizon = 0`.
- **Current Position Snapshot**: row per `(ItemId, Site, Warehouse)` with fields from `vw_ServiceInventorySnapshot_AU`.

---

## 17) Runtime Config & Params
Add a small server config used by API routes:
```ts
export const settings = {
  dataAreaId: 'mau1',
  defaultHorizonDays: 30,
  ageingBuckets: [2, 7, 14, 30],
  itemGroups: ['10','15','20'],
};
```
Map request params → SQL parameters; validate and clamp ranges.

---

## 18) Acceptance Criteria — Data Correctness
- [ ] Views compile against **current Synapse schema** and return rows for at least 3 sites.
- [ ] API fields exactly match `SnapshotRow` (typed), no `any` leaks.
- [ ] **BelowSafety_NoSupply** on UI equals the view result for 20 sampled SKUs.
- [ ] Horizon parameter in UI changes counts consistently (UI ↔ SQL parity tests).
- [ ] No cross‑site leakage: site filter returns only targeted site’s warehouses.

---

## 19) Daily Exceptions & Stand‑up
Add a dedicated page **/exceptions** that pre‑filters `onlyExceptions=true` and sorts by:
1) `BelowSafety_NoSupply DESC`
2) `PartsBelowSafety DESC`
3) `Available ASC`

Show inline actions: **Expedite**, **Raise PO**, **Transfer from (suggested)** with a link‑out to ERP.

---

# 📖 USER MANUAL & DOCUMENTATION

## 🚀 Getting Started

### System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen Resolution**: Minimum 1280x720 (optimized for 1920x1080)
- **Network**: Stable internet connection for real-time data updates
- **Authentication**: Valid Azure AD account with access to D365 data

### First Time Setup
1. **Access the Dashboard**: Navigate to the application URL
2. **Site Selection**: Choose your service location from the dropdown
3. **Theme Preference**: Use the sun/moon toggle for light/dark mode
4. **Data Loading**: Allow 5-10 seconds for initial data synchronization

---

## 🎛️ Dashboard Overview

### Main Dashboard Layout
The dashboard is organized into **2 rows of 5 KPI cards** each, providing comprehensive service performance metrics:

#### **Row 1: Operational Metrics**
1. **Open Work Orders** (Blue) - Total count with weekly trend indicator
2. **Avg Resolution Time** (Indigo) - Days from start to completion
3. **Open WIP Value** (Purple) - Total cost of work in progress (shows as **$145K** format)
4. **Labour and Other Costs** (Cyan) - Labour cost value with percentage (shows as **$32K** format)
5. **Parts Cost** (Emerald) - Parts cost value with percentage (shows as **$114K** format)

#### **Row 2: Financial & Inventory Metrics**
1. **Month-to-Date Revenue** (Purple) - Revenue from completed orders (shows as **$125K** format)
2. **Average Gross Margin** (Green) - Percentage for posted orders with monthly average
3. **Ageing (Worst)** (Amber) - Largest age bucket with interactive mini-chart
4. **Parts Below Safety** (Orange) - Inventory items requiring attention
5. **Critical Items** (Red) - Items needing immediate action

### 🎨 Theme System
- **Light Mode**: Clean white background with dark text
- **Dark Mode**: Dark background with light text and enhanced contrast
- **Toggle**: Click the sun/moon icon in any page header
- **Persistence**: Theme preference saved across sessions

---

## 📊 KPI Definitions & Calculations

### Work Order Metrics

#### **Open Work Orders**
- **Calculation**: Count of work orders with status: Unscheduled, InProgress, Scheduled, Completed
- **Excludes**: Posted and Cancelled orders
- **Trend**: Shows weekly net change (opens - closes)
- **Color Coding**:
  - Green arrow ↓ = More closures than opens (good)
  - Red arrow ↑ = More opens than closures (attention needed)

#### **Average Resolution Time**
- **Calculation**: Average days from start date to completion date
- **Scope**: Only Posted work orders (truly completed)
- **Formula**: `AVG(DATEDIFF(StartDate, ClosedDate))`
- **Display**: Whole number of days

#### **Ageing Analysis**
- **Buckets**: 0-2 days, 3-7 days, 8-14 days, 15-30 days, >30 days
- **Calculation**: `DATEDIFF(CreatedDate, TODAY)` for open orders
- **Interactive Chart**: Click chart bars to filter by age bucket

### Financial Metrics

#### **Open WIP Value**
- **Source**: `msdyn_productsservicescost` field from D365
- **Scope**: Unscheduled + InProgress + Scheduled + Completed orders
- **Excludes**: Posted orders (no longer WIP)
- **Format**: Compact currency (e.g., $145K instead of $144,708)

#### **Labour and Other Costs**
- **Source**: `itw_totalcostlabour` field from D365
- **Scope**: All WIP orders (same as WIP Value)
- **Percentage**: Labour cost as percentage of total WIP
- **Format**: Compact currency with percentage subtitle

#### **Parts Cost**
- **Source**: `itw_totalcostpart` field from D365
- **Scope**: All WIP orders (same as WIP Value)
- **Percentage**: Parts cost as percentage of total WIP
- **Format**: Compact currency with percentage subtitle
- **Note**: Labour % + Parts % = 100% of WIP

#### **Month-to-Date Revenue**
- **Source**: `msdyn_totalamount` field from D365
- **Scope**: Posted work orders closed in current month
- **Calculation**: `SUM(msdyn_totalamount) WHERE Status='Posted' AND ClosedDate >= START_OF_MONTH`
- **Format**: Compact currency (e.g., $125K)
- **Resets**: Automatically on 1st of each month

#### **Average Gross Margin**
- **Source**: `itw_grossmargin2` field from D365
- **Scope**: Posted work orders only
- **Display**: Percentage with current month average
- **Calculation**: `AVG(itw_grossmargin2) WHERE Status='Posted'`

### Inventory Metrics

#### **Parts Below Safety**
- **Calculation**: `OnHand < SafetyStock` per warehouse
- **Source**: `bm.vw_ServiceInventorySnapshot_AU`
- **Action Required**: Items need replenishment
- **Link**: Clicking opens filtered inventory view

#### **Critical Items**
- **Calculation**: Parts below safety WITH no inbound supply within 30 days
- **Logic**: `(OnHand < SafetyStock) AND (InboundQtyWithinHorizon = 0)`
- **Urgency**: Immediate action required (expedite/raise PO)

---

## 🏗️ Navigation & Pages

### Header Navigation
- **Dashboard**: Main KPI overview page
- **Work Orders**: Detailed work order table with filters
- **Current Position**: Inventory snapshot with supply/demand analysis
- **Site Selector**: Dropdown to filter data by service location
- **Theme Toggle**: Sun/moon icon for light/dark mode switching
- **Status Indicators**: Database connection and last updated timestamps

### Page Descriptions

#### **Dashboard (/)**
- **Purpose**: High-level service performance overview
- **Content**: 10 KPI cards + mini ageing chart
- **Refresh**: Real-time data with SWR caching
- **Interactions**: Clickable cards link to detailed views

#### **Work Orders (/work-orders)**
- **Purpose**: Detailed work order analysis
- **Features**:
  - Sortable/filterable table
  - Status-based filtering
  - Age-based grouping
  - Export capabilities
- **Data**: Real-time work order details

#### **Current Position (/snapshot)**
- **Purpose**: Inventory supply vs demand analysis
- **Features**:
  - Parts below safety identification
  - Inbound supply tracking
  - Action recommendations
  - Warehouse-level detail

---

## 🔧 Advanced Features

### Site Filtering
- **Purpose**: Focus on specific service locations
- **Locations**: QLD, NSW, VIC, SA, WA, Fairbank, Bendigo, Sunshine, etc.
- **Impact**: All KPIs automatically filter to selected site
- **Persistence**: Selection saved in URL and localStorage

### Data Refresh & Caching
- **Strategy**: SWR (Stale-While-Revalidate) with intelligent caching
- **Frequency**:
  - Active tab: 2-minute cache
  - Background: No auto-refresh
  - Manual: Refresh on focus/site change
- **Connection Management**: Auto-reconnect with 4-minute keep-alive

### Responsive Design
- **Desktop**: Full 2x5 grid layout
- **Tablet**: 2x3 responsive grid
- **Mobile**: Single column stack
- **Breakpoints**: Tailwind CSS standard breakpoints

### Performance Optimization
- **Loading States**: Skeleton loaders during data fetch
- **Error Handling**: Graceful degradation with error messages
- **Virtualization**: Large tables virtualized for smooth scrolling
- **Animations**: Subtle Framer Motion effects (150-200ms)

---

## 🐛 Troubleshooting

### Common Issues

#### **"No data showing"**
- **Check**: Site selection dropdown
- **Fix**: Select a site from the dropdown menu
- **Reason**: Dashboard requires site selection for data security

#### **"Database connection failed"**
- **Check**: Network connectivity and Azure AD authentication
- **Fix**: Refresh page or contact IT for Azure AD permissions
- **Indicator**: Red status dot in header

#### **"KPIs showing zero"**
- **Check**: Selected site has work orders
- **Check**: Date range filters (if applicable)
- **Verify**: Site name matches exactly (case-sensitive)

#### **"Dark mode not working"**
- **Check**: Browser localStorage permissions
- **Fix**: Clear browser cache and cookies
- **Alternative**: Use incognito/private browsing mode

#### **"Slow loading"**
- **Check**: Network connection stability
- **Expected**: Initial load 5-10 seconds, subsequent loads <2 seconds
- **Optimize**: Close other browser tabs using bandwidth

### Browser Compatibility
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (MacOS 10.15+)
- **Edge**: Full support
- **Internet Explorer**: Not supported

### Mobile Limitations
- **Screen Size**: Minimum 375px width
- **Touch**: All interactions touch-optimized
- **Performance**: May be slower on older devices
- **Data Usage**: Approximately 1-2MB per session

---

## 📞 Support & Maintenance

### Getting Help
- **Technical Issues**: Contact IT support team
- **Data Questions**: Contact Service Department management
- **Feature Requests**: Submit through normal business channels
- **Bug Reports**: Include browser version, site selection, and error messages

### Maintenance Windows
- **Database**: Nightly between 2-4 AM (minimal impact)
- **Application**: Deployed during business hours with notifications
- **Azure**: Microsoft-managed, notifications via Azure portal

### Data Security
- **Authentication**: Azure AD integration with MFA
- **Authorization**: Role-based access to site data
- **Encryption**: All data encrypted in transit and at rest
- **Audit**: All access logged for compliance

---

## 🔄 Changelog & Updates

### Version History
- **v2.0.0** (2025-09-18): Dark mode support, compact number formatting
- **v1.9.0** (2025-09-17): Month-to-date revenue KPI, 2x5 grid layout
- **v1.8.0** (2025-09-15): Connection keep-alive, improved error handling
- **v1.7.0** (2025-09-14): Site filtering corrections, KPI calculation fixes
- **v1.6.0** (2025-09-13): Labour and parts cost KPIs, gross margin tracking
- **v1.5.0** (2025-09-12): Real-time data integration with Azure Synapse
- **v1.0.0** (2025-09-10): Initial production release

### Upcoming Features
- **Export to Excel**: Download KPI data for offline analysis
- **Email Reports**: Scheduled daily/weekly summary reports
- **Mobile App**: Native iOS/Android application
- **Advanced Filtering**: Date range and custom filter combinations
- **Drill-down Analytics**: Click KPIs to see detailed breakdowns

---

*For technical documentation, see sections 14-19 below.*

