-- ============================================================
-- Alter dbo.CallList_Master.Call_List_Era to VARCHAR(100)
-- Run on existing databases after deploying API validation
-- that matches this column width.
-- ============================================================

IF COL_LENGTH('dbo.CallList_Master', 'Call_List_Decade') IS NOT NULL
BEGIN
    ALTER TABLE dbo.CallList_Master
    ALTER COLUMN Call_List_Decade VARCHAR(20) NULL;
END
GO
