export interface ThumbnailImage {
  ImageId: number;
  ImageType: string;
  ImageLocation: string;
  ImageLocationTN: string;
  UserAlias: string | null;
  UserId: number;
  CreateDate: string;
  Active: boolean;
  Size: number | null;
  DimWidth: number | null;
  DimHeight: number | null;
  ImageOrientation: string | null;
  Approved: boolean;
}

export interface ThumbnailApprovalResponse {
  ok: boolean;
  imageId: number;
  approved: boolean;
  message: string;
}
