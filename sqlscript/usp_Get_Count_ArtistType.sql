USE [haloimag_djgogi]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-05-08
-- Description: Returns each distinct Artist Type from the songs table
--              with a total count of songs for each Artist Type.
-- =============================================
-- How It Works:
--   1. Reads records from dbo.songs.
--   2. Groups songs by Artist Type.
--   3. Returns one row per distinct Artist Type.
--   4. Includes the total number of songs in each Artist Type.
--   5. Uses ISNULL to label NULL or blank artist types as 'Unknown'.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_Count_ArtistType]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(NULLIF(LTRIM(RTRIM([artist_type])), ''), 'Unknown') AS ArtistType,
        COUNT(*) AS SongCount
    FROM [dbo].[songs]
    GROUP BY
        ISNULL(NULLIF(LTRIM(RTRIM([artist_type])), ''), 'Unknown')
    ORDER BY
        SongCount DESC,
        ArtistType ASC;
END
GO