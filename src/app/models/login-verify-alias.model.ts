/** POST body for `RapidCMS/login/verify-alias`. */
export interface LoginVerifyAliasRequest {
  Alias: string;
  Password: string;
}

/** Response from `RapidCMS/login/verify-alias`. */
export interface LoginVerifyAliasResult {
  ok: boolean;
  userId: number | null;
  userEmail: string | null;
  userPhone: string | null;
  error: string | null;
}
