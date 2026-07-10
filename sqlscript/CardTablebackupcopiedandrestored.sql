/* ============================================================
   Backup dbo.Cards Table
   Creates a timestamped backup table and copies all data
   ============================================================ */

DECLARE @BackupTableName sysname;
DECLARE @SQL nvarchar(max);

SET @BackupTableName =
    'Cards_Backup_' +
    CONVERT(varchar(8), GETDATE(), 112) + '_' +
    REPLACE(CONVERT(varchar(8), GETDATE(), 108), ':', '');

SET @SQL = '
SELECT *
INTO dbo.' + QUOTENAME(@BackupTableName) + '
FROM dbo.Cards;
';

PRINT @SQL;
EXEC sp_executesql @SQL;


----------------------------

SELECT COUNT(*) AS OriginalCount
FROM dbo.Cards;

SELECT COUNT(*) AS BackupCount
FROM dbo.Cards_Backup_20260428_223845;

-----------------------------

DELETE FROM dbo.Cards;

SET IDENTITY_INSERT dbo.Cards ON;

INSERT INTO dbo.Cards
(
    Card_ID,
    Game_ID,
    Card_Date_Create,
    Card_PlayerName,
    Card_PlayerEmail,
    PlayCount,
    Card_IsWinner,
    Card_SeedKey,
    Card_PrintedAt,
    Sq_B1, Sq_B1_Called,
    Sq_B2, Sq_B2_Called,
    Sq_B3, Sq_B3_Called,
    Sq_B4, Sq_B4_Called,
    Sq_B5, Sq_B5_Called,
    Sq_I1, Sq_I1_Called,
    Sq_I2, Sq_I2_Called,
    Sq_I3, Sq_I3_Called,
    Sq_I4, Sq_I4_Called,
    Sq_I5, Sq_I5_Called,
    Sq_N1, Sq_N1_Called,
    Sq_N2, Sq_N2_Called,
    Sq_N3, Sq_N3_Called,
    Sq_N4, Sq_N4_Called,
    Sq_N5, Sq_N5_Called,
    Sq_G1, Sq_G1_Called,
    Sq_G2, Sq_G2_Called,
    Sq_G3, Sq_G3_Called,
    Sq_G4, Sq_G4_Called,
    Sq_G5, Sq_G5_Called,
    Sq_O1, Sq_O1_Called,
    Sq_O2, Sq_O2_Called,
    Sq_O3, Sq_O3_Called,
    Sq_O4, Sq_O4_Called,
    Sq_O5, Sq_O5_Called
)
SELECT
    Card_ID,
    Game_ID,
    Card_Date_Create,
    Card_PlayerName,
    Card_PlayerEmail,
    PlayCount,
    Card_IsWinner,
    Card_SeedKey,
    Card_PrintedAt,
    Sq_B1, Sq_B1_Called,
    Sq_B2, Sq_B2_Called,
    Sq_B3, Sq_B3_Called,
    Sq_B4, Sq_B4_Called,
    Sq_B5, Sq_B5_Called,
    Sq_I1, Sq_I1_Called,
    Sq_I2, Sq_I2_Called,
    Sq_I3, Sq_I3_Called,
    Sq_I4, Sq_I4_Called,
    Sq_I5, Sq_I5_Called,
    Sq_N1, Sq_N1_Called,
    Sq_N2, Sq_N2_Called,
    Sq_N3, Sq_N3_Called,
    Sq_N4, Sq_N4_Called,
    Sq_N5, Sq_N5_Called,
    Sq_G1, Sq_G1_Called,
    Sq_G2, Sq_G2_Called,
    Sq_G3, Sq_G3_Called,
    Sq_G4, Sq_G4_Called,
    Sq_G5, Sq_G5_Called,
    Sq_O1, Sq_O1_Called,
    Sq_O2, Sq_O2_Called,
    Sq_O3, Sq_O3_Called,
    Sq_O4, Sq_O4_Called,
    Sq_O5, Sq_O5_Called
FROM dbo.Cards_Backup_YYYYMMDD_HHMMSS;

SET IDENTITY_INSERT dbo.Cards OFF;