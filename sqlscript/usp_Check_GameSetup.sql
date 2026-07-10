USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_Check_GameSetup]    Script Date: 5/29/2026 12:40:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*****************************************************************************
 Stored Procedure : usp_Check_GameSetup

 Description :
         Validates the complete setup and data integrity for a Music Bingo game
         across all related tables.

         Table Relationships:
         -   Game        (User_ID, Game_ID, Call_List_ID)
         -   CallList_Master (Call_List_ID, InningNumber)
         -   CallList_Songs  (Call_List_ID, Inning)
         -   Cards       (Game_ID, Call_List_ID, Inning)

 Parameters :
         @Game_ID INT (Optional) - The Game ID to validate. If NULL, uses MAX Game_ID

 Returns :
         Multiple result sets showing validation status and data integrity

 Usage Examples :
         EXEC usp_Check_GameSetup @Game_ID = 33;
         EXEC usp_Check_GameSetup;   -- Uses most recent Game_ID

 Author      : William D Beaty
 Date Created: 2026-05-29
 Modified    : 2026-05-29 - Removed GameNight references (table does not exist).
                            Fixed @Call_List_ID lookup to pull from Game table.
                            Removed Game_ID column from CallList_Master result set.
*****************************************************************************/

ALTER PROCEDURE [dbo].[usp_Check_GameSetup]
        @Game_ID INT = NULL
AS
BEGIN
        SET NOCOUNT ON;

        -- If no Game_ID provided, get the maximum (most recent) Game_ID
        IF @Game_ID IS NULL
        BEGIN
                SELECT @Game_ID = MAX(Game_ID) FROM [dbo].[Game];
        END

        -- Declare variables for lookups
        DECLARE @User_ID        INT = NULL;
        DECLARE @Call_List_ID   INT = NULL;

        -- Get User_ID and Call_List_ID from Game table
        SELECT  @User_ID        = User_ID,
                @Call_List_ID   = Call_List_ID
        FROM    [dbo].[Game]
        WHERE   Game_ID = @Game_ID;


        -- =====================================================================
        -- RESULT SET 1: Header Information
        -- =====================================================================
        SELECT
                @Game_ID        AS Game_ID_Checked,
                @User_ID        AS User_ID_Found,
                @User_ID        AS GN_ID_Found,          -- API backward compatibility
                @Call_List_ID   AS Call_List_ID_Found,
                GETDATE()       AS Check_Timestamp;


        -- =====================================================================
        -- RESULT SET 2: User Games Check (replaces GameNight)
        -- Shows all games belonging to this User_ID
        -- =====================================================================
        SELECT
                'Game (User)'   AS Table_Name,
                Game_ID,
                @User_ID        AS User_ID,
                @User_ID        AS GN_ID,                -- API maps GameNightRows
                Game_Number,
                Game_Name,
                Game_Status,
                Game_StartTime,
                Game_CreatedAt,
                CASE WHEN Game_ID = @Game_ID THEN 'CURRENT' ELSE 'OTHER' END AS Status
        FROM
                [dbo].[Game]
        WHERE
                User_ID = @User_ID
        ORDER BY
                Game_CreatedAt DESC;


        -- =====================================================================
        -- RESULT SET 3: Game Table Check
        -- =====================================================================
        SELECT
                'Game'          AS Table_Name,
                Game_ID,
                User_ID,
                User_ID         AS GN_ID,                -- API maps GameRows
                Call_List_ID,
                Game_Number,
                Game_Inning,
                Game_Name,
                Game_Status,
                Game_WinPattern,
                Game_StartTime,
                Game_EndTime,
                CASE WHEN Game_ID = @Game_ID THEN 'FOUND' ELSE 'NOT FOUND' END AS Status
        FROM
                [dbo].[Game]
        WHERE
                Game_ID = @Game_ID;


        -- =====================================================================
        -- RESULT SET 4: CallList_Master Check (by InningNumber)
        -- =====================================================================
        SELECT
                'CallList_Master'       AS Table_Name,
                Call_List_ID,
                @Game_ID                AS Game_ID,
                InningNumber            AS Inning,
                Call_List_Name,
                Call_List_Genre,
                Call_List_Decade,
                Call_List_Era,
                Call_List_SongCount,
                Call_List_IsActive,
                CASE WHEN Call_List_ID = @Call_List_ID THEN 'MATCH' ELSE 'MISMATCH' END AS Status
        FROM
                [dbo].[CallList_Master]
        WHERE
                Call_List_ID = @Call_List_ID
        ORDER BY
                InningNumber;


        -- =====================================================================
        -- RESULT SET 5: CallList_Songs by Inning
        -- =====================================================================
        SELECT
                'CallList_Songs'        AS Table_Name,
                Inning,
                COUNT(*)                AS Song_Count,
                COUNT(DISTINCT genre)   AS Genre_Count,
                COUNT(DISTINCT decade)  AS Decade_Count,
                MIN(title)              AS First_Song,
                MAX(title)              AS Last_Song,
                SUM(CASE WHEN explicit = 1 THEN 1 ELSE 0 END) AS Explicit_Count
        FROM
                [dbo].[CallList_Songs]
        WHERE
                Call_List_ID = @Call_List_ID
        GROUP BY
                Inning
        ORDER BY
                Inning;


        -- =====================================================================
        -- RESULT SET 6: Cards by Inning
        -- =====================================================================
        SELECT
                'Cards'                         AS Table_Name,
                Inning,
                COUNT(*)                        AS Total_Cards,
                COUNT(DISTINCT Card_ID)         AS Unique_Card_IDs,
                COUNT(DISTINCT Card_PlayerName) AS Unique_Players,
                SUM(CASE WHEN Card_IsWinner = 1 THEN 1 ELSE 0 END) AS Winner_Count,
                MIN(Card_Date_Create)           AS First_Card_Created,
                MAX(Card_Date_Create)           AS Last_Card_Created
        FROM
                [dbo].[Cards]
        WHERE
                Game_ID         = @Game_ID
                AND Call_List_ID = @Call_List_ID
        GROUP BY
                Inning
        ORDER BY
                Inning;


        -- =====================================================================
        -- RESULT SET 7: Inning-by-Inning Comparison
        -- =====================================================================
        WITH AllInnings AS (
                SELECT DISTINCT InningNumber AS Inning
                FROM [dbo].[CallList_Master]
                WHERE Call_List_ID = @Call_List_ID

                UNION

                SELECT DISTINCT Inning
                FROM [dbo].[CallList_Songs]
                WHERE Call_List_ID = @Call_List_ID

                UNION

                SELECT DISTINCT Inning
                FROM [dbo].[Cards]
                WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID
        )
        SELECT
                ai.Inning,
                CASE WHEN EXISTS (
                        SELECT 1 FROM [dbo].[CallList_Master]
                        WHERE Call_List_ID = @Call_List_ID AND InningNumber = ai.Inning
                ) THEN 'YES' ELSE 'NO' END AS Has_CallList_Master,
                CASE WHEN EXISTS (
                        SELECT 1 FROM [dbo].[CallList_Songs]
                        WHERE Call_List_ID = @Call_List_ID AND Inning = ai.Inning
                ) THEN 'YES' ELSE 'NO' END AS Has_Songs,
                (SELECT COUNT(*) FROM [dbo].[CallList_Songs]
                 WHERE Call_List_ID = @Call_List_ID AND Inning = ai.Inning) AS Song_Count,
                CASE WHEN EXISTS (
                        SELECT 1 FROM [dbo].[Cards]
                        WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID AND Inning = ai.Inning
                ) THEN 'YES' ELSE 'NO' END AS Has_Cards,
                (SELECT COUNT(*) FROM [dbo].[Cards]
                 WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID AND Inning = ai.Inning) AS Card_Count,
                CASE
                        WHEN EXISTS (SELECT 1 FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID AND InningNumber = ai.Inning)
                          AND EXISTS (SELECT 1 FROM [dbo].[CallList_Songs]  WHERE Call_List_ID = @Call_List_ID AND Inning = ai.Inning)
                          AND EXISTS (SELECT 1 FROM [dbo].[Cards]           WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID AND Inning = ai.Inning)
                        THEN 'COMPLETE'
                        ELSE 'INCOMPLETE'
                END AS Inning_Status
        FROM
                AllInnings ai
        ORDER BY
                ai.Inning;


        -- =====================================================================
        -- RESULT SET 8: Overall Summary
        -- =====================================================================
        SELECT
                @Game_ID        AS Game_ID,
                @User_ID        AS User_ID,
                @User_ID        AS GN_ID,                -- API maps OverallSummary
                @Call_List_ID   AS Call_List_ID,
                (SELECT COUNT(*) FROM [dbo].[Game] WHERE User_ID = @User_ID)                                            AS User_Game_Count,
                (SELECT COUNT(*) FROM [dbo].[Game] WHERE User_ID = @User_ID)                                            AS GameNight_Records,
                (SELECT COUNT(*) FROM [dbo].[Game] WHERE Game_ID = @Game_ID)                                            AS Game_Records,
                (SELECT COUNT(DISTINCT InningNumber) FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID)   AS CallList_Master_Innings,
                (SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID)          AS Songs_Innings,
                (SELECT COUNT(DISTINCT Inning) FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID) AS Cards_Innings,
                (SELECT COUNT(*) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID)                        AS Total_Songs,
                (SELECT COUNT(*) FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID)          AS Total_Cards,
                CASE
                        WHEN (SELECT COUNT(DISTINCT InningNumber) FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID) =
                             (SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID)
                          AND
                             (SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID) =
                             (SELECT COUNT(DISTINCT Inning) FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID)
                        THEN 'ALL INNINGS IN SYNC'
                        ELSE 'INNING MISMATCH DETECTED'
                END AS Inning_Sync_Status;


        -- =====================================================================
        -- RESULT SET 9: Detailed Validation Report
        -- =====================================================================
        SELECT
                ROW_NUMBER() OVER (ORDER BY Sort_Order) AS Check_Number,
                Component,
                Status,
                Message
        FROM (
                SELECT 1 AS Sort_Order, 'User_ID Lookup' AS Component,
                        CASE WHEN @User_ID IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS Status,
                        CASE WHEN @User_ID IS NOT NULL
                                THEN 'Found User_ID ' + CAST(@User_ID AS VARCHAR) + ' from Game table'
                                ELSE 'ERROR: Could not find User_ID for Game_ID ' + CAST(@Game_ID AS VARCHAR) END AS Message

                UNION ALL

                SELECT 2, 'User Has Games',
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Game] WHERE User_ID = @User_ID)
                                THEN 'PASS' ELSE 'FAIL' END,
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Game] WHERE User_ID = @User_ID)
                                THEN CAST((SELECT COUNT(*) FROM [dbo].[Game] WHERE User_ID = @User_ID) AS VARCHAR) + ' game(s) found for User_ID ' + CAST(@User_ID AS VARCHAR)
                                ELSE 'ERROR: No games found for User_ID ' + CAST(ISNULL(@User_ID, 0) AS VARCHAR) END

                UNION ALL

                SELECT 3, 'Game Record',
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Game] WHERE Game_ID = @Game_ID)
                                THEN 'PASS' ELSE 'FAIL' END,
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Game] WHERE Game_ID = @Game_ID)
                                THEN 'Game record found for Game_ID ' + CAST(@Game_ID AS VARCHAR)
                                ELSE 'ERROR: No Game record found for Game_ID ' + CAST(@Game_ID AS VARCHAR) END

                UNION ALL

                SELECT 4, 'Call_List_ID Lookup',
                        CASE WHEN @Call_List_ID IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
                        CASE WHEN @Call_List_ID IS NOT NULL
                                THEN 'Found Call_List_ID ' + CAST(@Call_List_ID AS VARCHAR) + ' for Game_ID ' + CAST(@Game_ID AS VARCHAR)
                                ELSE 'ERROR: No Call_List_ID found for Game_ID ' + CAST(@Game_ID AS VARCHAR) END

                UNION ALL

                SELECT 5, 'CallList_Master Records',
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID)
                                THEN 'PASS' ELSE 'FAIL' END,
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID)
                                THEN CAST((SELECT COUNT(*) FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID) AS VARCHAR) +
                                     ' CallList_Master record(s) found covering ' +
                                     CAST((SELECT COUNT(DISTINCT InningNumber) FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID) AS VARCHAR) + ' inning(s)'
                                ELSE 'ERROR: No CallList_Master records found for Call_List_ID ' + CAST(ISNULL(@Call_List_ID, 0) AS VARCHAR) END

                UNION ALL

                SELECT 6, 'CallList_Songs',
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID)
                                THEN 'PASS' ELSE 'FAIL' END,
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID)
                                THEN CAST((SELECT COUNT(*) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID) AS VARCHAR) +
                                     ' song(s) found across ' +
                                     CAST((SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID) AS VARCHAR) + ' inning(s)'
                                ELSE 'ERROR: No songs found for Call_List_ID ' + CAST(ISNULL(@Call_List_ID, 0) AS VARCHAR) END

                UNION ALL

                SELECT 7, 'Cards',
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID)
                                THEN 'PASS' ELSE 'FAIL' END,
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID)
                                THEN CAST((SELECT COUNT(*) FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID) AS VARCHAR) +
                                     ' card(s) found across ' +
                                     CAST((SELECT COUNT(DISTINCT Inning) FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID) AS VARCHAR) + ' inning(s)'
                                ELSE 'ERROR: No cards found for Game_ID ' + CAST(@Game_ID AS VARCHAR) + ' and Call_List_ID ' + CAST(ISNULL(@Call_List_ID, 0) AS VARCHAR) END

                UNION ALL

                SELECT 8, 'Inning Consistency',
                        CASE
                                WHEN (SELECT COUNT(DISTINCT InningNumber) FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID) =
                                     (SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID)
                                  AND
                                     (SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID) =
                                     (SELECT COUNT(DISTINCT Inning) FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID)
                                THEN 'PASS'
                                ELSE 'WARNING'
                        END,
                        'CallList_Master: ' + CAST((SELECT COUNT(DISTINCT InningNumber) FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID) AS VARCHAR) +
                        ' innings, Songs: ' + CAST((SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID) AS VARCHAR) +
                        ' innings, Cards: ' + CAST((SELECT COUNT(DISTINCT Inning) FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID) AS VARCHAR) + ' innings'

                UNION ALL

                SELECT 9, 'OVERALL STATUS',
                        CASE
                                WHEN @User_ID IS NOT NULL
                                  AND EXISTS (SELECT 1 FROM [dbo].[Game] WHERE Game_ID = @Game_ID)
                                  AND @Call_List_ID IS NOT NULL
                                  AND EXISTS (SELECT 1 FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID)
                                  AND EXISTS (SELECT 1 FROM [dbo].[CallList_Songs]  WHERE Call_List_ID = @Call_List_ID)
                                  AND EXISTS (SELECT 1 FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID)
                                THEN 'READY'
                                ELSE 'NOT READY'
                        END,
                        CASE
                                WHEN @User_ID IS NOT NULL
                                  AND EXISTS (SELECT 1 FROM [dbo].[Game] WHERE Game_ID = @Game_ID)
                                  AND @Call_List_ID IS NOT NULL
                                  AND EXISTS (SELECT 1 FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID)
                                  AND EXISTS (SELECT 1 FROM [dbo].[CallList_Songs]  WHERE Call_List_ID = @Call_List_ID)
                                  AND EXISTS (SELECT 1 FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID)
                                THEN 'All tables are populated and synchronized - GAME READY TO PLAY'
                                ELSE 'One or more tables are missing data - SETUP INCOMPLETE'
                        END
        ) AS ValidationResults
        ORDER BY Sort_Order;

END
