export type CrudAction = 'c' | 'r' | 'u' | 'd';

export interface MenuItem {
  ItemID: number;
  ItemKey: string;
  ItemName: string;
  ItemDescription: string | null;
  ItemCategory: string;
  ItemPrice: number;
  ItemPriceString: string | null;
  ItemCost: number | null;
  ItemImage: string | null;
  ItemBadge: string | null;
  IsAvailable: boolean;
  IsActive: boolean;
  PreparationTime: number | null;
  Calories: number | null;
}

export type MenuItemPayload = Partial<MenuItem> & { ItemID?: number };
