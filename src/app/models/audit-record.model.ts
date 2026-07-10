export interface AuditRecord {
  AuditID: number;
  UserId: string;
  Origin: string;
  EventType: string;
  ErrorCode: string | null;
  CommentShort: string;
  DateTimeStamp: string;
  SeverityCode: number;
}

export interface AuditRecordsResponse {
  AuditRecords: AuditRecord[];
}
