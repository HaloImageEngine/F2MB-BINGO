USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Preview_CallList]    Script Date: 4/25/2026 9:00:30 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================================
-- Stored Procedure : dbo.usp_Preview_CallList
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Returns a full preview of a CallList_Master record and
--   all of its associated songs from dbo.CallList_Songs.
--   Produces two result sets - the first is the master
--   header record with list metadata, the second is the
--   full song list ordered by artist then title. Useful
--   for reviewing a call list before a game night or for
--   printing a DJ reference sheet.
--
-- PARAMETERS:
--   @Call_List_ID     INT  -- Required. The CallList_Master
--                          -- record to preview. Must exist
--                          -- in CallList_Master.
--
-- HOW IT WORKS:
--   Validates that @Call_List_ID exists then runs two
--   SELECT statements. The first returns the master header
--   from CallList_Master. The second returns all songs from
--   CallList_Songs for that list, ordered by artist and
--   title for easy DJ reference during the game.
--
-- USAGE:
--   EXEC dbo.usp_Preview_CallList
--       @Call_List_ID = 1;
--
-- RETURNS:
--   Result Set 1 - Master Header:
--     - Call_List_ID          : List ID
--     - Call_List_Name        : Name of the list
--     - Call_List_Date        : Date of the list
--     - Call_List_Description : Description or notes
--     - Call_List_Genre       : Genre focus
--     - Call_List_Decade      : Decade focus
--     - Call_List_Era         : Era focus
--     - Call_List_SongCount   : Total songs in the list
--     - Call_List_IsActive    : 1 = Active, 0 = Inactive
--     - Call_List_CreatedAt   : When the list was created
--     - Call_List_UpdatedAt   : When the list was last updated
--
--   Result Set 2 - Song List:
--     - song_id               : Unique song ID
--     - title                 : Song title
--     - artist                : Primary artist
--     - featured_artist       : Featured artist if any
--     - lead_vocalist         : Lead vocalist if any
--     - artist_type           : e.g. Solo, Band, Duo
--     - genre                 : Song genre
--     - explicit              : 1 = Explicit, 0 = Clean
--     - release_year          : Year released
--     - decade                : e.g. 80s
--     - era                   : e.g. Classic
--     - last_played           : Last time song was called
--
-- ERROR CONDITIONS:
--   - @Call_List_ID not found : Call list does not exist error
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
-- ============================================================

CREATE PROCEDURE [dbo].[usp_Preview_CallList]
    @Call_List_ID INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validate CallList_Master exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.CallList_Master WHERE Call_List_ID = @Call_List_ID)
    BEGIN
        RAISERROR('Call_List_ID %d does not exist in CallList_Master.', 16, 1, @Call_List_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Result Set 1 - Master header record
    ------------------------------------------------------------
    SELECT
        Call_List_ID,
        Call_List_Name,
        Call_List_Date,
        Call_List_Description,
        Call_List_Genre,
        Call_List_Decade,
        Call_List_Era,
        Call_List_SongCount,
        Call_List_IsActive,
        Call_List_CreatedAt,
        Call_List_UpdatedAt
    FROM dbo.CallList_Master
    WHERE Call_List_ID = @Call_List_ID;

    ------------------------------------------------------------
    -- Result Set 2 - Full song list ordered by artist / title
    ------------------------------------------------------------
    SELECT
        song_id,
        title,
        artist,
        featured_artist,
        lead_vocalist,
        artist_type,
        genre,
        explicit,
        release_year,
        decade,
        era,
        last_played
    FROM dbo.CallList_Songs
    WHERE Call_List_ID = @Call_List_ID
    ORDER BY artist ASC, title ASC;

END;

GO


