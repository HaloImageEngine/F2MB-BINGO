/** POST body for `RapidCMS/login/create`. */
export interface LoginCreateRequest {
  FirstName: string;
  MiddleInitial: string;
  LastName: string;
  Email: string;
  UserAlias: string;
  Password: string;
  UserType: string;
  Zip: string;
  PhoneNum: string;
}

/** Response from `RapidCMS/login/create`. */
export interface LoginCreateResult {
  ok: boolean;
  userId: number | null;
  userInfoId: number | null;
  error: string | null;
}
