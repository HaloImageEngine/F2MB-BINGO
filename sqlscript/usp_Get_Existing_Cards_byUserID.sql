-- ============================================================
-- Stored Procedure : usp_Get_Existing_Cards_byUserID
-- Database         : [YourDatabaseName]
-- Schema           : dbo
-- Author           : [Author Name]
-- Create Date      : 2026-05-28
-- ============================================================
-- Description:
--   Retrieves reporting data for all BINGO cards associated
--   with a given User_ID from the [dbo].[Cards] table.
--   Returns FOUR result sets useful for dashboard display:
--
--   Result Set 1 – User Summary
--     High-level totals and key metrics for all cards owned
--     by this user across all call lists and innings.
--
--   Result Set 2 – Inning Breakdown
--     One row per inning showing card counts, winner counts,
--     print rates, and engagement metrics for this user.
--
--   Result Set 3 – Inning List
--     Distinct list of innings present for this user,
--     ordered ascending — useful for populating dropdowns/tabs.
--
--   Result Set 4 – Card Detail
--     Full header-level row per card (no square/called-state
--     columns), ordered newest-first.
--
-- Parameters:
--   @User_ID  INT  - The unique identifier of the user whose
--                    cards are to be reported on. Required.
--
-- Result Set 1 – Summary Columns:
--     User_ID             - The user being reported on
--     Total_Cards         - Total number of cards issued
--     Total_CallLists     - Number of distinct call lists used
--     Total_Innings       - Number of distinct innings played
--     Total_Winners       - Cards flagged as winners
--     Total_NonWinners    - Cards not yet winning
--     Win_Rate_Pct        - Winners as a % of total cards
--     Total_Printed       - Cards that have been printed at least once
--     Print_Rate_Pct      - Printed cards as a % of total cards
--     Total_Named_Players - Cards that have a player name on record
--     Total_PlayCount     - Sum of all play counts across all cards
--     Avg_PlayCount       - Average play count per card
--     Max_PlayCount       - Highest play count on a single card
--     First_Card_Created  - Earliest Card_Date_Create
--     Last_Card_Created   - Most recent Card_Date_Create
--     Last_Printed        - Most recent Card_PrintedAt value
--
-- Result Set 2 – Inning Breakdown Columns:
--     Inning              - The inning number
--     Card_Count          - Total cards in this inning
--     Winner_Count        - Cards flagged as winners
--     NonWinner_Count     - Cards not yet winning
--     Win_Rate_Pct        - Winners as a % of inning cards
--     Printed_Count       - Cards printed in this inning
--     Print_Rate_Pct      - Printed cards as a % of inning cards
--     Named_Player_Count  - Cards with a player name
--     Total_PlayCount     - Sum of play counts for this inning
--     Avg_PlayCount       - Average play count for this inning
--     Max_PlayCount       - Highest play count in this inning
--     First_Card_Created  - Earliest card in this inning
--     Last_Card_Created   - Most recent card in this inning
--
-- Result Set 3 – Inning List Columns:
--     Inning              - Distinct inning value, ordered ASC
--
-- Result Set 4 – Card Detail Columns:
--     Card_ID, User_ID, Call_List_ID, Inning, Card_Date_Create,
--     Card_PlayerName, Card_PlayerEmail, PlayCount, Card_IsWinner,
--     Card_SeedKey, Card_PrintedAt
--
-- Usage Examples:
--   -- Full report for User 42
--   EXEC dbo.usp_Get_Existing_Cards_byUserID @User_ID = 42;
--
--   -- Via variable
--   DECLARE @UID INT = 42;
--   EXEC dbo.usp_Get_Existing_Cards_byUserID @User_ID = @UID;
--
-- Notes:
--   - All four result sets return empty (not errors) when no cards
--     exist for the supplied @User_ID.
--   - Win_Rate_Pct and Print_Rate_Pct are rounded to 2 decimal
--     places and return 0.00 when Total_Cards is 0.
--   - Summary includes Total_CallLists so you can see how many
--     different call lists this user has cards across.
--   - To report by call list instead of user, see
--     usp_Get_Existing_Cards_ByCLI.
--
-- Compatibility:
--   SQL Server 2008 and later (uses IF EXISTS DROP + CREATE pattern)
--
-- Change History:
--   2026-05-28  [Author Name]  Initial creation
--   2026-05-28  [Author Name]  Updated to return 4 result sets:
--                              summary, inning breakdown, inning
--                              list, and card detail
-- ============================================================

IF OBJECT_ID('dbo.usp_Get_Existing_Cards_byUserID', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[usp_Get_Existing_Cards_byUserID];
GO

CREATE PROCEDURE [dbo].[usp_Get_Existing_Cards_byUserID]
    @User_ID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- --------------------------------------------------------
    -- Result Set 1: User Summary
    -- --------------------------------------------------------
    SELECT
         c.[User_ID]

        -- Volume
        ,COUNT(*)                                                    AS [Total_Cards]
        ,COUNT(DISTINCT c.[Call_List_ID])                            AS [Total_CallLists]
        ,COUNT(DISTINCT c.[Inning])                                  AS [Total_Innings]

        -- Winners
        ,SUM(CAST(c.[Card_IsWinner] AS INT))                         AS [Total_Winners]
        ,SUM(CASE WHEN c.[Card_IsWinner] = 0 THEN 1 ELSE 0 END)     AS [Total_NonWinners]
        ,CASE
            WHEN COUNT(*) = 0 THEN 0.00
            ELSE ROUND(
                     SUM(CAST(c.[Card_IsWinner] AS FLOAT))
                     / COUNT(*) * 100, 2)
         END                                                         AS [Win_Rate_Pct]

        -- Print activity
        ,COUNT(c.[Card_PrintedAt])                                   AS [Total_Printed]
        ,CASE
            WHEN COUNT(*) = 0 THEN 0.00
            ELSE ROUND(
                     CAST(COUNT(c.[Card_PrintedAt]) AS FLOAT)
                     / COUNT(*) * 100, 2)
         END                                                         AS [Print_Rate_Pct]

        -- Player engagement
        ,COUNT(c.[Card_PlayerName])                                  AS [Total_Named_Players]
        ,SUM(c.[PlayCount])                                          AS [Total_PlayCount]
        ,ROUND(AVG(CAST(c.[PlayCount] AS FLOAT)), 2)                 AS [Avg_PlayCount]
        ,MAX(c.[PlayCount])                                          AS [Max_PlayCount]

        -- Date range
        ,MIN(c.[Card_Date_Create])                                   AS [First_Card_Created]
        ,MAX(c.[Card_Date_Create])                                   AS [Last_Card_Created]
        ,MAX(c.[Card_PrintedAt])                                     AS [Last_Printed]

    FROM  [dbo].[Cards] AS c
    WHERE c.[User_ID] = @User_ID
    GROUP BY c.[User_ID];

    -- --------------------------------------------------------
    -- Result Set 2: Inning Breakdown
    -- --------------------------------------------------------
    SELECT
         c.[Inning]

        -- Volume
        ,COUNT(*)                                                    AS [Card_Count]

        -- Winners
        ,SUM(CAST(c.[Card_IsWinner] AS INT))                         AS [Winner_Count]
        ,SUM(CASE WHEN c.[Card_IsWinner] = 0 THEN 1 ELSE 0 END)     AS [NonWinner_Count]
        ,CASE
            WHEN COUNT(*) = 0 THEN 0.00
            ELSE ROUND(
                     SUM(CAST(c.[Card_IsWinner] AS FLOAT))
                     / COUNT(*) * 100, 2)
         END                                                         AS [Win_Rate_Pct]

        -- Print activity
        ,COUNT(c.[Card_PrintedAt])                                   AS [Printed_Count]
        ,CASE
            WHEN COUNT(*) = 0 THEN 0.00
            ELSE ROUND(
                     CAST(COUNT(c.[Card_PrintedAt]) AS FLOAT)
                     / COUNT(*) * 100, 2)
         END                                                         AS [Print_Rate_Pct]

        -- Player engagement
        ,COUNT(c.[Card_PlayerName])                                  AS [Named_Player_Count]
        ,SUM(c.[PlayCount])                                          AS [Total_PlayCount]
        ,ROUND(AVG(CAST(c.[PlayCount] AS FLOAT)), 2)                 AS [Avg_PlayCount]
        ,MAX(c.[PlayCount])                                          AS [Max_PlayCount]

        -- Date range per inning
        ,MIN(c.[Card_Date_Create])                                   AS [First_Card_Created]
        ,MAX(c.[Card_Date_Create])                                   AS [Last_Card_Created]

    FROM  [dbo].[Cards] AS c
    WHERE c.[User_ID] = @User_ID
    GROUP BY c.[Inning]
    ORDER BY c.[Inning] ASC;

    -- --------------------------------------------------------
    -- Result Set 3: Distinct Inning List
    --   Lightweight list for populating UI dropdowns / tabs
    -- --------------------------------------------------------
    SELECT DISTINCT
        c.[Inning]
    FROM  [dbo].[Cards] AS c
    WHERE c.[User_ID] = @User_ID
    ORDER BY c.[Inning] ASC;

    -- --------------------------------------------------------
    -- Result Set 4: Card Detail
    --   Full header row per card, newest first
    -- --------------------------------------------------------
    SELECT
         c.[Card_ID]
        ,c.[User_ID]
        ,c.[Call_List_ID]
        ,c.[Inning]
        ,c.[Card_Date_Create]
        ,c.[Card_PlayerName]
        ,c.[Card_PlayerEmail]
        ,c.[PlayCount]
        ,c.[Card_IsWinner]
        ,c.[Card_SeedKey]
        ,c.[Card_PrintedAt]
    FROM  [dbo].[Cards] AS c
    WHERE c.[User_ID] = @User_ID
    ORDER BY c.[Card_Date_Create] DESC;

END;
GO