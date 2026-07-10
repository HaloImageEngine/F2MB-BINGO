USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_Get_AllSongs_byArtist]    Script Date: 4/25/2026 8:50:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      William Beaty
-- Create date: 2026-04-20
-- Description: Get all songs by a specific artist
-- =============================================
ALTER PROCEDURE [dbo].[usp_Get_AllSongs_byArtist]
(
    @artist NVARCHAR(255)
)
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Select all songs for the given artist
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
    WHERE artist = @artist
    ORDER BY release_year DESC, title ASC;  -- newest first, then alphabetical
END
