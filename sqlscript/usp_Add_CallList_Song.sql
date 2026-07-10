USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Add_CallList_Song]    Script Date: 4/25/2026 8:46:48 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================================
-- Stored Procedure : dbo.usp_Add_CallList_Song
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Adds a single song to an existing CallList_Master record
--   by inserting a row into dbo.CallList_Songs. After each
--   successful insert, the parent CallList_Master.
--   Call_List_SongCount is automatically incremented by 1
--   and Call_List_UpdatedAt is stamped with the current time.
--
-- PARAMETERS:
--   @Call_List_ID     INT           -- Required. The parent
--                                   -- CallList_Master record
--                                   -- to add the song to.
--   @title            NVARCHAR(255) -- Required. Song title.
--   @artist           NVARCHAR(255) -- Required. Primary artist.
--   @featured_artist  NVARCHAR(255) -- Optional. Featured artist.
--   @lead_vocalist    NVARCHAR(255) -- Optional. Lead vocalist
--                                   -- if different from artist.
--   @artist_type      VARCHAR(20)   -- Optional. e.g. 'Solo',
--                                   -- 'Band', 'Duo'
--   @genre            VARCHAR(100)  -- Optional. Song genre.
--   @explicit         BIT           -- Optional. Default 0.
--                                   -- 1 = explicit content.
--   @release_year     SMALLINT      -- Optional. Year released.
--   @decade           VARCHAR(5)    -- Optional. e.g. '80s'
--   @era              VARCHAR(10)   -- Optional. e.g. 'Classic'
--
-- HOW IT WORKS:
--   Validates that @Call_List_ID exists in CallList_Master
--   and that @title and @artist are provided. Inserts the
--   song into CallList_Songs then updates the parent master
--   record incrementing Call_List_SongCount by 1 and stamping
--   Call_List_UpdatedAt with the current timestamp.
--
-- USAGE:
--   EXEC dbo.usp_Add_CallList_Song
--       @Call_List_ID    = 1,
--       @title           = 'Take On Me',
--       @artist          = 'a-ha',
--       @genre           = 'Pop',
--       @explicit        = 0,
--       @release_year    = 1985,
--       @decade          = '80s',
--       @era             = 'Classic';
--
-- RETURNS:
--   Single row summary:
--     - song_id             : Newly created song ID
--     - Call_List_ID        : Parent list ID
--     - title               : Song title
--     - artist              : Primary artist
--     - Call_List_SongCount : Updated total songs in list
--
-- ERROR CONDITIONS:
--   - @Call_List_ID not found : Call list does not exist error
--   - @title empty            : Title is required error
--   - @artist empty           : Artist is required error
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
-- ============================================================

CREATE PROCEDURE [dbo].[usp_Add_CallList_Song]
    @Call_List_ID    INT,
    @title           NVARCHAR(255),
    @artist          NVARCHAR(255),
    @featured_artist NVARCHAR(255) = NULL,
    @lead_vocalist   NVARCHAR(255) = NULL,
    @artist_type     VARCHAR(20)   = NULL,
    @genre           VARCHAR(100)  = NULL,
    @explicit        BIT           = 0,
    @release_year    SMALLINT      = NULL,
    @decade          VARCHAR(5)    = NULL,
    @era             VARCHAR(10)   = NULL
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validation
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.CallList_Master WHERE Call_List_ID = @Call_List_ID)
    BEGIN
        RAISERROR('Call_List_ID %d does not exist in CallList_Master.', 16, 1, @Call_List_ID);
        RETURN;
    END;

    IF @title IS NULL OR LTRIM(RTRIM(@title)) = ''
    BEGIN
        RAISERROR('Song title is required and cannot be empty.', 16, 1);
        RETURN;
    END;

    IF @artist IS NULL OR LTRIM(RTRIM(@artist)) = ''
    BEGIN
        RAISERROR('Artist is required and cannot be empty.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Insert song into CallList_Songs
    ------------------------------------------------------------
    INSERT INTO dbo.CallList_Songs (
        Call_List_ID,
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
    )
    VALUES (
        @Call_List_ID,
        @title,
        @artist,
        @featured_artist,
        @lead_vocalist,
        @artist_type,
        @genre,
        @explicit,
        @release_year,
        @decade,
        @era,
        NULL            -- last_played starts NULL
    );

    DECLARE @NewSongID INT = SCOPE_IDENTITY();

    ------------------------------------------------------------
    -- Update parent master record
    ------------------------------------------------------------
    UPDATE dbo.CallList_Master
    SET
        Call_List_SongCount = Call_List_SongCount + 1,
        Call_List_UpdatedAt = SYSDATETIME()
    WHERE Call_List_ID = @Call_List_ID;

    ------------------------------------------------------------
    -- Return summary
    ------------------------------------------------------------
    SELECT
        s.song_id,
        s.Call_List_ID,
        s.title,
        s.artist,
        m.Call_List_SongCount
    FROM dbo.CallList_Songs   s
    JOIN dbo.CallList_Master  m ON m.Call_List_ID = s.Call_List_ID
    WHERE s.song_id = @NewSongID;

END;

GO


