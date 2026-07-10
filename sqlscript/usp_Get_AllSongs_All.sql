USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_AllSongs_All]    Script Date: 4/25/2026 8:50:33 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:      William D Beaty
-- Create date: 2026-04-20
-- Description: Get all songs from dbo.songs
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_AllSongs_All]
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Return all records from the songs table
    -- Ordered for consistent results
    -- =============================================
    SELECT 
	    song_id,
        title,
        artist,
        artist_type,
        genre,
        subgenre,
        mood,
        tempo,
        release_year,
        decade,
        era,
        bingo_category,
        difficulty,
        chart_peak_position,
        chart_country,
        spotify_popularity,
        duration_seconds,
        active
    FROM dbo.songs
    ORDER BY artist ASC, release_year DESC, title ASC;
END

GO


