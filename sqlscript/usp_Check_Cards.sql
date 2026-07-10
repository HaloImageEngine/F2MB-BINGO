USE [haloimag_djgogi]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*****************************************************************************
 Stored Procedure : usp_Check_Cards

 Description :
         Validates card data for a user (optionally scoped to one game / call list).
         Production REST route: GET …/Bingo/Bingo/Check_Cards_byUser_ID/{User_ID}

 Parameters :
         @User_ID        INT — required
         @Game_ID        INT = NULL — when NULL, uses latest Game_ID for the user
         @Call_List_ID   INT = NULL — when NULL, uses Call_List_ID from Game

 Returns (5 result sets — align API mapper to BingoCheckCardsResult):
         1 Header
         2 CardsByInning
         3 InningComparisons
         4 OverallSummary
         5 ValidationReport

 Usage :
         EXEC usp_Check_Cards @User_ID = 1039;
         EXEC usp_Check_Cards @User_ID = 1039, @Game_ID = 1, @Call_List_ID = 42;
*****************************************************************************/

CREATE OR ALTER PROCEDURE [dbo].[usp_Check_Cards]
        @User_ID        INT,
        @Game_ID        INT = NULL,
        @Call_List_ID   INT = NULL
AS
BEGIN
        SET NOCOUNT ON;

        IF @User_ID IS NULL OR @User_ID <= 0
        BEGIN
                RAISERROR('User_ID is required.', 16, 1);
                RETURN;
        END

        IF @Game_ID IS NULL
        BEGIN
                SELECT @Game_ID = MAX(Game_ID) FROM [dbo].[Game] WHERE User_ID = @User_ID;
        END

        IF @Call_List_ID IS NULL AND @Game_ID IS NOT NULL
        BEGIN
                SELECT @Call_List_ID = Call_List_ID FROM [dbo].[Game] WHERE Game_ID = @Game_ID;
        END

        DECLARE @Total_Cards INT = (
                SELECT COUNT(*)
                FROM [dbo].[Cards] c
                INNER JOIN [dbo].[Game] g ON g.Game_ID = c.Game_ID
                WHERE g.User_ID = @User_ID
                  AND (@Game_ID IS NULL OR c.Game_ID = @Game_ID)
                  AND (@Call_List_ID IS NULL OR c.Call_List_ID = @Call_List_ID)
        );

        -- =====================================================================
        -- RESULT SET 1: Header
        -- =====================================================================
        SELECT
                @User_ID        AS User_ID_Checked,
                @Game_ID        AS Game_ID_Checked,
                @Call_List_ID   AS Call_List_ID_Found,
                @Total_Cards    AS Total_Cards_Found,
                GETDATE()       AS Check_Timestamp;


        -- =====================================================================
        -- RESULT SET 2: Cards by Inning
        -- =====================================================================
        SELECT
                'Cards'                         AS Table_Name,
                c.Inning,
                COUNT(*)                        AS Total_Cards,
                COUNT(DISTINCT c.Card_ID)       AS Unique_Card_IDs,
                COUNT(DISTINCT c.Card_PlayerName) AS Unique_Players,
                SUM(CASE WHEN c.Card_IsWinner = 1 THEN 1 ELSE 0 END) AS Winner_Count,
                MIN(c.Card_Date_Create)         AS First_Card_Created,
                MAX(c.Card_Date_Create)         AS Last_Card_Created
        FROM
                [dbo].[Cards] c
                INNER JOIN [dbo].[Game] g ON g.Game_ID = c.Game_ID
        WHERE
                g.User_ID = @User_ID
                AND (@Game_ID IS NULL OR c.Game_ID = @Game_ID)
                AND (@Call_List_ID IS NULL OR c.Call_List_ID = @Call_List_ID)
        GROUP BY
                c.Inning
        ORDER BY
                c.Inning;


        -- =====================================================================
        -- RESULT SET 3: Inning comparisons (when Call_List_ID known)
        -- =====================================================================
        IF @Call_List_ID IS NOT NULL AND @Game_ID IS NOT NULL
        BEGIN
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
        END
        ELSE
        BEGIN
                SELECT TOP 0
                        CAST(NULL AS INT) AS Inning,
                        CAST(NULL AS VARCHAR(3)) AS Has_CallList_Master,
                        CAST(NULL AS VARCHAR(3)) AS Has_Songs,
                        CAST(NULL AS INT) AS Song_Count,
                        CAST(NULL AS VARCHAR(3)) AS Has_Cards,
                        CAST(NULL AS INT) AS Card_Count,
                        CAST(NULL AS VARCHAR(20)) AS Inning_Status;
        END


        -- =====================================================================
        -- RESULT SET 4: Overall summary
        -- =====================================================================
        SELECT
                @User_ID        AS User_ID,
                @Game_ID        AS Game_ID,
                @Call_List_ID   AS Call_List_ID,
                (SELECT COUNT(DISTINCT g.Call_List_ID)
                 FROM [dbo].[Game] g
                 WHERE g.User_ID = @User_ID
                   AND g.Call_List_ID IS NOT NULL) AS Total_CallLists,
                @Total_Cards    AS Total_Cards,
                (SELECT COUNT(DISTINCT c.Inning)
                 FROM [dbo].[Cards] c
                 INNER JOIN [dbo].[Game] g ON g.Game_ID = c.Game_ID
                 WHERE g.User_ID = @User_ID
                   AND (@Game_ID IS NULL OR c.Game_ID = @Game_ID)
                   AND (@Call_List_ID IS NULL OR c.Call_List_ID = @Call_List_ID)) AS Cards_Innings,
                (SELECT SUM(CASE WHEN c.Card_IsWinner = 1 THEN 1 ELSE 0 END)
                 FROM [dbo].[Cards] c
                 INNER JOIN [dbo].[Game] g ON g.Game_ID = c.Game_ID
                 WHERE g.User_ID = @User_ID
                   AND (@Game_ID IS NULL OR c.Game_ID = @Game_ID)
                   AND (@Call_List_ID IS NULL OR c.Call_List_ID = @Call_List_ID)) AS Total_Winners,
                (SELECT SUM(CASE WHEN c.Card_PrintedAt IS NOT NULL THEN 1 ELSE 0 END)
                 FROM [dbo].[Cards] c
                 INNER JOIN [dbo].[Game] g ON g.Game_ID = c.Game_ID
                 WHERE g.User_ID = @User_ID
                   AND (@Game_ID IS NULL OR c.Game_ID = @Game_ID)
                   AND (@Call_List_ID IS NULL OR c.Call_List_ID = @Call_List_ID)) AS Total_Printed,
                CASE
                        WHEN @Call_List_ID IS NULL OR @Game_ID IS NULL THEN 'SCOPE: ALL USER CARDS'
                        WHEN (SELECT COUNT(DISTINCT InningNumber) FROM [dbo].[CallList_Master] WHERE Call_List_ID = @Call_List_ID) =
                             (SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID)
                          AND
                             (SELECT COUNT(DISTINCT Inning) FROM [dbo].[CallList_Songs] WHERE Call_List_ID = @Call_List_ID) =
                             (SELECT COUNT(DISTINCT Inning) FROM [dbo].[Cards] WHERE Game_ID = @Game_ID AND Call_List_ID = @Call_List_ID)
                        THEN 'ALL INNINGS IN SYNC'
                        ELSE 'INNING MISMATCH DETECTED'
                END AS Inning_Sync_Status;


        -- =====================================================================
        -- RESULT SET 5: Validation report
        -- =====================================================================
        SELECT
                ROW_NUMBER() OVER (ORDER BY Sort_Order) AS Check_Number,
                Component,
                Status,
                Message
        FROM (
                SELECT 1 AS Sort_Order, 'User_ID' AS Component,
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Game] WHERE User_ID = @User_ID)
                                THEN 'PASS' ELSE 'FAIL' END AS Status,
                        CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Game] WHERE User_ID = @User_ID)
                                THEN CAST((SELECT COUNT(*) FROM [dbo].[Game] WHERE User_ID = @User_ID) AS VARCHAR) + ' game(s) for User_ID ' + CAST(@User_ID AS VARCHAR)
                                ELSE 'No games found for User_ID ' + CAST(@User_ID AS VARCHAR) END AS Message

                UNION ALL

                SELECT 2, 'Game_ID',
                        CASE WHEN @Game_ID IS NOT NULL AND EXISTS (SELECT 1 FROM [dbo].[Game] WHERE Game_ID = @Game_ID AND User_ID = @User_ID)
                                THEN 'PASS' ELSE 'WARNING' END,
                        CASE WHEN @Game_ID IS NULL
                                THEN 'No Game_ID resolved for user'
                                WHEN EXISTS (SELECT 1 FROM [dbo].[Game] WHERE Game_ID = @Game_ID AND User_ID = @User_ID)
                                THEN 'Using Game_ID ' + CAST(@Game_ID AS VARCHAR)
                                ELSE 'Game_ID ' + CAST(@Game_ID AS VARCHAR) + ' not owned by User_ID ' + CAST(@User_ID AS VARCHAR) END

                UNION ALL

                SELECT 3, 'Cards',
                        CASE WHEN @Total_Cards > 0 THEN 'PASS' ELSE 'FAIL' END,
                        CASE WHEN @Total_Cards > 0
                                THEN CAST(@Total_Cards AS VARCHAR) + ' card(s) found for user scope'
                                ELSE 'No cards found for User_ID ' + CAST(@User_ID AS VARCHAR) END

                UNION ALL

                SELECT 4, 'Call_List_ID',
                        CASE WHEN @Call_List_ID IS NOT NULL THEN 'PASS' ELSE 'WARNING' END,
                        CASE WHEN @Call_List_ID IS NOT NULL
                                THEN 'Call_List_ID ' + CAST(@Call_List_ID AS VARCHAR)
                                ELSE 'Call_List_ID not resolved — inning comparison skipped' END

                UNION ALL

                SELECT 5, 'OVERALL STATUS',
                        CASE WHEN @Total_Cards > 0 THEN 'READY' ELSE 'NOT READY' END,
                        CASE WHEN @Total_Cards > 0
                                THEN 'Cards present for user'
                                ELSE 'No cards — generate or import cards before play' END
        ) AS ValidationResults
        ORDER BY Sort_Order;

END
GO
