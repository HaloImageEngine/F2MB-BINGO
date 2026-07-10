USE [haloimag_djgogi]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-05-08
-- Description: Returns each distinct Genre from the songs table
--              with a total count of songs for each Genre.
-- =============================================
-- How It Works:
--   1. Reads records from dbo.songs.
--   2. Groups songs by Genre.
--   3. Returns one row per distinct Genre.
--   4. Includes the total number of songs in each Genre.
--   5. Uses ISNULL to label NULL or blank genres as 'Unknown'.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_Count_Genre]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(NULLIF(LTRIM(RTRIM([genre])), ''), 'Unknown') AS Genre,
        COUNT(*) AS SongCount
    FROM [dbo].[songs]
    GROUP BY
        ISNULL(NULLIF(LTRIM(RTRIM([genre])), ''), 'Unknown')
    ORDER BY
        SongCount DESC,
        Genre ASC;
END
GO


SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-05-08
-- Description: Returns each distinct Decade from the songs table
--              with a total count of songs for each Decade.
-- =============================================
-- How It Works:
--   1. Reads records from dbo.songs.
--   2. Groups songs by Decade.
--   3. Returns one row per distinct Decade.
--   4. Includes the total number of songs in each Decade.
--   5. Uses ISNULL to label NULL or blank decades as 'Unknown'.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_Count_Decade]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(NULLIF(LTRIM(RTRIM([decade])), ''), 'Unknown') AS Decade,
        COUNT(*) AS SongCount
    FROM [dbo].[songs]
    GROUP BY
        ISNULL(NULLIF(LTRIM(RTRIM([decade])), ''), 'Unknown')
    ORDER BY
        Decade ASC;
END
GO