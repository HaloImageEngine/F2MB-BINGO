USE [haloimag_djgogi]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-05-08
-- Description: Returns each distinct Era from the songs table
--              with a total count of songs for each Era.
-- =============================================
-- How It Works:
--   1. Reads records from dbo.songs.
--   2. Groups songs by Era.
--   3. Returns one row per distinct Era.
--   4. Includes the total number of songs in each Era.
--   5. Uses ISNULL to label NULL or blank eras as 'Unknown'.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_Count_Era]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(NULLIF(LTRIM(RTRIM([era])), ''), 'Unknown') AS Era,
        COUNT(*) AS SongCount
    FROM [dbo].[songs]
    GROUP BY
        ISNULL(NULLIF(LTRIM(RTRIM([era])), ''), 'Unknown')
    ORDER BY
        SongCount DESC,
        Era ASC;
END
GO