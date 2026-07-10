USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Insert_NewSet_WithNoDups]    Script Date: 4/25/2026 8:58:51 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[usp_Insert_NewSet_WithNoDups]
	-- Add the parameters for the stored procedure here
	--<@Param1, sysname, @p1> <Datatype_For_Param1, , int> = <Default_Value_For_Param1, , 0>,
	--<@Param2, sysname, @p2> <Datatype_For_Param2, , int> = <Default_Value_For_Param2, , 0>
AS
BEGIN
	-- Insert songs into dbo.songs while preventing duplicates
-- A duplicate is defined as a row with the same Title + Artist

INSERT INTO dbo.songs (
    title, artist, artist_type, genre, subgenre, mood,
    tempo, release_year, decade, era,
    bingo_category, difficulty, chart_peak_position,
    chart_country, spotify_popularity, duration_seconds, active
)
-- Use a VALUES table as the source dataset
SELECT *
FROM (VALUES
    -- Classic rock anthem from Queen
    ('Bohemian Rhapsody',   'Queen',             'band',   'Rock', 'Classic Rock', 'Epic',      'slow',   1975, '70s', 'Classic', 'Karaoke Anthem',   'easy',   1,  'UK', 92, 354, 1),

    -- Adele breakout hit
    ('Rolling in the Deep', 'Adele',             'solo',   'Pop',  'Soul Pop',     'Powerful',  'medium', 2010, '10s', 'Modern',  'Wedding Classic',  'easy',   1,  'UK', 88, 228, 1),

    -- Pharrell's upbeat global hit
    ('Happy',               'Pharrell Williams', 'solo',   'Pop',  'Neo Soul',     'Happy',     'fast',   2013, '10s', 'Modern',  'Dancefloor Filler','easy',   1,  'US', 85, 233, 1),

    -- Synth-pop hit by The Weeknd
    ('Blinding Lights',     'The Weeknd',        'solo',   'Pop',  'Synth Pop',    'Energetic', 'fast',   2019, '10s', 'Current', 'Dancefloor Filler','medium', 1,  'US', 91, 200, 1),

    -- Indie rock staple by The Killers
    ('Mr. Brightside',      'The Killers',       'band',   'Rock', 'Indie Rock',   'Energetic', 'fast',   2003, '00s', 'Retro',   'Karaoke Anthem',   'medium', 10, 'UK', 83, 222, 1)
) AS src (
    title, artist, artist_type, genre, subgenre, mood,
    tempo, release_year, decade, era,
    bingo_category, difficulty, chart_peak_position,
    chart_country, spotify_popularity, duration_seconds, active
)
-- Only insert rows that do NOT already exist in the target table
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.songs tgt
    WHERE tgt.title = src.title
      AND tgt.artist = src.artist
);

-- Result:
-- - New songs are inserted
-- - Existing songs (same Title + Artist) are skipped



END

GO


