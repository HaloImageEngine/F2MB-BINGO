/** Ad slot on printed cards: AD1, AD2, AD3. */
export type MarketingQrAdPosition = 'AD1' | 'AD2' | 'AD3';

/**
 * Request body for `POST …/Marketing/qr-sponsors/upsert`.
 * @example
 * {
 *   "QRID": 0,
 *   "Title": "HillTop Truck Park",
 *   "URL": "https://www.hilltoptruckpark.com/",
 *   "EnterDate": "2026-05-29T22:46:25.977Z",
 *   "ActiveStartDate": "2026-05-29T22:46:25.977Z",
 *   "ActiveEndDate": "2026-05-29T22:46:25.977Z",
 *   "Contact": "Trooper",
 *   "Phone": "972-983-1919",
 *   "ContactURL": "https://www.hilltoptruckpark.com",
 *   "AdPosition": "AD2"
 * }
 */
export interface MarketingQrSponsorUpsert {
  QRID: number;
  Title: string;
  URL: string;
  EnterDate: string;
  ActiveStartDate: string;
  ActiveEndDate: string;
  Contact?: string | null;
  Phone?: string | null;
  ContactURL?: string | null;
  AdPosition?: string | null;
}

/** One row from `GET …/Marketing/qr-sponsors?qrid=0`. */
export interface MarketingQrSponsor {
  QRID: number;
  Title: string;
  URL: string;
  EnterDate: string;
  ActiveStartDate: string;
  ActiveEndDate: string;
  Contact: string | null;
  Phone: string | null;
  ContactURL: string | null;
  AdPosition: MarketingQrAdPosition | string | null;
}

/** Response from `POST …/Marketing/qr-sponsors/upsert`. */
export interface MarketingQrSponsorUpsertResult {
  NewQRID: number;
  RowsAffected: number;
  IsInsert: boolean;
}
