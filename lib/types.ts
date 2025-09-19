// Data contract types from CLAUDE.md section 4
import React from 'react'

export interface WorkOrder {
  WorkOrderId: string;
  Status: 'Open' | 'InProgress' | 'WaitingParts' | 'Scheduled' | 'Completed' | 'Posted' | 'Closed' | 'Cancelled';
  Priority: 'Critical' | 'High' | 'Normal' | 'Low';
  ServiceType: 'Internal' | 'External' | 'Warranty';
  Site: string;
  Technician?: string;
  CreatedDate: string; // ISO
  PromisedDate?: string; // ISO
  ClosedDate?: string; // ISO
  StartDate?: string; // ISO - when work actually started (msdyn_firstarrivedon)
  WIPValue: number; // msdyn_productsservicescost - cost of products and services used
  TotalPartsCost: number; // itw_totalcostpart - total parts cost
  TotalLabourCost: number; // itw_totalcostlabour - total labour cost
  GrossMargin: number; // itw_grossmargin2 - gross margin percentage
  TotalAmount: number; // msdyn_totalamount - total revenue amount
  AgeDays: number;
  Parts: Array<{ ItemId: string; Qty: number }>;
}

export interface InventoryRow {
  ItemId: string;
  ItemName?: string;
  Site: string;
  Warehouse?: string;
  OnHand: number;
  SafetyStock: number;
  MinOnHand?: number;
  AvgDailyDemand?: number;
}

export interface SupplyRow {
  ItemId: string;
  Site: string;
  Source: 'PO' | 'TransferOrder';
  Ref: string;
  Qty: number;
  ETA: string | null; // ISO
}

export interface DemandRow {
  ItemId: string;
  Site: string;
  DemandType: 'WorkOrder' | 'Sales' | 'Reservation' | 'Internal';
  Ref?: string;
  Qty: number;
  NeedBy?: string | null; // ISO
}

export interface WorkOrderProduct {
  WorkOrderId: string;
  ProductId: string;
  ProductName?: string;
  QtyUsed: number;
  QtyAllocated: number;
  UnitCost: number;
  LineValue: number;
  LineStatus: 'Estimated' | 'Used' | 'Canceled' | 'Unknown';
}

export interface WorkOrderService {
  WorkOrderId: string;
  ServiceTaskType: string;
  Duration: number;
  EstimatedDuration: number;
  TaskStatus: 'Estimated' | 'Open' | 'Completed' | 'Canceled' | 'Unknown';
  PercentComplete: number;
  IsApproved: boolean;
}

export interface SnapshotRow {
  ItemId: string;
  Site: string;
  Warehouse?: string;
  OnHand: number;
  Available?: number;
  SafetyStock: number;
  MinOnHand?: number;
  InboundQty: number;
  NextETA: string | null;
  DemandQty: number;
  Gap: number;
  CoverDays?: number;
  Action: 'OK' | 'Expedite' | 'Transfer' | 'RaisePO' | 'Reallocate';
}

// KPI calculation types
export interface AgeingBucket {
  label: string;
  count: number;
  minDays: number;
  maxDays?: number;
}

export interface KpiCardData {
  value: number;
  delta?: number;
  deltaType?: 'increase' | 'decrease';
  caption?: string;
  breakdown?: Record<string, number>;
  customContent?: React.ReactNode;
}

// Filter types
export interface ApiFilters {
  site?: string | string[];
  from?: string;
  to?: string;
  status?: string | string[];
  priority?: string | string[];
  onlyExceptions?: boolean;
  horizon?: number;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}
