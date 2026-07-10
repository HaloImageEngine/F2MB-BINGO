USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_AllSongs_bySongName]    Script Date: 4/25/2026 8:51:46 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:      William Beaty
-- Create date: 2026-04-20
-- Description: Get all songs where the title matches
--              (partial search using LIKE)
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_AllSongs_bySongName]
(
    @song_name NVARCHAR(255)
)
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Select songs where title contains the search string
    -- Example: 'Light' will match 'Blinding Lights'
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
    WHERE title LIKE '%' + @song_name + '%'
    ORDER BY title ASC, release_year DESC;
END

GO


