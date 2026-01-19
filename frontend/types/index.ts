export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  tenantId: string;
  businessName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Lot {
  _id: string;
  lotNumber: string;
  items: {
    color: string;
    sizes: {
      size: string;
      quantity: number;
      remainingQuantity: number;
      purchaseCostPerPiece: number;
      sellCostPerPiece: number;
    }[];
  }[];
  totalInvestment: number;
  totalRevenue: number;
  totalProfit: number;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

export interface Transaction {
  _id: string;
  lotId: {
    _id: string;
    lotNumber: string;
  };
  soldItems: {
    color: string;
    size: string;
    quantity: number;
    sellPricePerPiece: number;
    totalAmount: number;
  }[];
  totalRevenue: number;
  soldBy: {
    name: string;
    email: string;
  };
  customerName?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalInvestment: number;
  totalRevenue: number;
  totalProfit: number;
  activeLots: number;
  lotsWithStock: number;
}

export interface RevenueTrendData {
  date: string;
  revenue: number;
  profit: number;
  transactions: number;
}

export interface SalesByLotData {
  lotNumber: string;
  revenue: number;
  profit: number;
  investment: number;
}

export interface InventoryStatusData {
  lotNumber: string;
  total: number;
  sold: number;
  remaining: number;
  soldPercentage: number;
}

export interface ChartData {
  revenueTrend: RevenueTrendData[];
  salesByLot: SalesByLotData[];
  inventoryStatus: InventoryStatusData[];
}
