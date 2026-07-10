export type OrderStatus = 'pending' | 'complete' | 'confirmed' | 'ready' | 'preparing';

export interface OrderListItem {
  OrderID: number;
  OrderNumber: string;
  StatusCode: string;
  StatusName: string | null;
  CustomerName: string;
  CustomerPhone: string;
  CustomerEmail: string;
  OrderType: string;
  OrderNotes: string;
  SubTotal: number;
  TaxAmount: number;
  DiscountAmount: number;
  TotalAmount: number;
  ItemCount: number;
  ItemID: number;
  ItemName: string | null;
  ItemCategory: string | null;
  UnitPrice: number;
  Quantity: number;
  LineTotal: number;
  ConfirmedAt: string | null;
  CompletedAt: string | null;
  CancelledAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  SpecialInstructions: string | null;
}

export interface OrderHeadDetail {
  OrderID: number;
  OrderNumber: string;
  StatusCode: string;
  StatusName: string | null;
  CustomerName: string;
  CustomerPhone: string;
  CustomerEmail: string;
  OrderType: string;
  OrderNotes: string;
  SubTotal: number;
  TaxAmount: number;
  DiscountAmount: number;
  TotalAmount: number;
  ItemCount: number;
  RequestedReadyTime: string | null;
  ConfirmedAt: string | null;
  CompletedAt: string | null;
  CancelledAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface OrderLineItem {
  OrderDetailID: number;
  OrderID: number;
  ItemID: number;
  ItemName: string;
  ItemCategory: string;
  UnitPrice: number;
  Quantity: number;
  LineTotal: number;
  SpecialInstructions: string | null;
  DisplayOrder: number;
  CreatedAt: string;
}

export interface OrderFullDetailResponse {
  Head: OrderHeadDetail;
  OrderDetailsList: OrderLineItem[];
}
