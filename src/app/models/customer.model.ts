export interface Customer {
  UserId: number;
  UserAlias: string;
  UserName: string;
  DisplayName: string;
  PhoneNumber: string | null;
  IsActive: boolean;
  FirstName: string;
  MiddleInitial: string;
  LastName: string;
  City: string | null;
  State: string | null;
  Zip: string;
  EmailAddress: string;
  ReadPW: string;
}
