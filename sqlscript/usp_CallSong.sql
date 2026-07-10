USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_CallSong]    Script Date: 4/29/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- Stored Procedure : dbo.usp_CallSong
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : April 22, 2026
-- Modified         : April 29, 2026
-- ============================================================
-- DESCRIPTION:
--   Called by the DJ when a song is played during a Music Bingo
--   game. Scans every bingo card in the game and flips the
--   _Called flag to 1 on any square where the song matches.
--   A single UPDATE statement handles all 200 cards at once
--   with no looping required. After this proc runs, call
--   usp_CheckForWinner to determine if any card has won.
--
-- PARAMETERS:
--   @Game_ID        INT  -- The active Game being played.
--                        -- Must exist in the Game table.
--   @Song_ID        INT  -- The song that was just played by
--                        -- the DJ. Must exist in the Songs table.
--
-- HOW IT WORKS:
--   1. Validates @Game_ID exists in dbo.Game.
--   2. Validates @Song_ID exists in dbo.songs and retrieves
--      the song's title and artist into local variables
--      (@Song_Title, @Song_Artist) for use in the audit insert.
--   3. Runs a single UPDATE against dbo.Cards filtered by
--      Game_ID. For each of the 24 active squares on every
--      card, a CASE statement compares the square's Song_ID
--      to @Song_ID. If they match, the corresponding _Called
--      flag is flipped to 1. If they do not match, the flag
--      is left unchanged so previously daubed squares are
--      never accidentally cleared by a new song call.
--   4. Inserts one row into dbo.Game_Called to create a
--      permanent audit record of every song called, now
--      including Song_Title and Song_Artist from dbo.songs.
--      ThisNumberAWinner defaults to 0 and is updated to 1
--      by usp_CheckForWinner when a winning call is found.
--
-- SQUARES CHECKED (24 active squares per card):
--   B Column : Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5
--   I Column : Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5
--   N Column : Sq_N1, Sq_N2, Sq_N4, Sq_N5
--              (Sq_N3 is FREE SPACE — never updated)
--   G Column : Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5
--   O Column : Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
--
-- FREE SPACE NOTE:
--   Sq_N3 is always NULL and Sq_N3_Called is always 1.
--   This square is never evaluated or updated by this proc.
--
-- USAGE:
--   -- DJ plays Song_ID 42 during Game 1:
--   EXEC dbo.usp_CallSong
--       @Game_ID = 1,
--       @Song_ID = 42;
--
--   -- Then immediately check for a winner:
--   EXEC dbo.usp_CheckForWinner @Game_ID = 1;
--
-- RETURNS:
--   Single row summary:
--     - Game_ID         : The game that was updated
--     - Song_ID         : The song that was called
--     - Song_Title      : Title of the song looked up from dbo.songs
--     - Song_Artist     : Artist of the song looked up from dbo.songs
--     - Called_ID       : The new audit row inserted into
--                         dbo.Game_Called for this call event
--     - Cards_Checked   : Total cards in the game (@@ROWCOUNT
--                         captured immediately after the UPDATE)
--     - Cards_Matched   : Number of cards that had the song
--                         on at least one square
--
-- GAME LOOP THIS PROC BELONGS TO:
--   1. usp_GenerateBingoCards  -- Generate 200 cards for a game
--   2. usp_CallSong            -- DJ plays a song, flip Called flags
--                                 and write audit row to Game_Called
--   3. usp_CheckForWinner      -- Check all 12 patterns for a winner,
--                                 update ThisNumberAWinner in Game_Called
--   4. usp_ResetGame           -- Reset and replay with same cards
--
-- ERROR CONDITIONS:
--   - @Game_ID not found : Game does not exist error, nothing changes
--   - @Song_ID not found : Song does not exist error, nothing changes
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
--   April 28, 2026 - Added INSERT into dbo.Game_Called after the
--                    Cards UPDATE to create a permanent audit record
--                    of every song called. Called_ID is returned in
--                    the summary resultset. ThisNumberAWinner is
--                    written as 0 (default) and updated to 1 by
--                    usp_CheckForWinner if a winning call is found.
--   April 29, 2026 - Added lookup of Song_Title and Song_Artist from
--                    dbo.songs during validation step. Both values are
--                    now stored in local variables and written into
--                    dbo.Game_Called (Song_Title, Song_Artist columns)
--                    so the audit table is fully self-contained without
--                    requiring a JOIN to dbo.songs to read call history.
--                    Both fields are also returned in the summary result.
-- ============================================================

ALTER PROCEDURE [dbo].[usp_CallSong]
    @Game_ID  INT,
    @Song_ID  INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validate Game exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Game WHERE Game_ID = @Game_ID)
    BEGIN
        RAISERROR('Game_ID %d does not exist.', 16, 1, @Game_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Validate Song exists and capture Title + Artist
    -- so they can be written directly into Game_Called.
    ------------------------------------------------------------
    DECLARE @Song_Title   NVARCHAR(255);
    DECLARE @Song_Artist  NVARCHAR(255);

    SELECT
        @Song_Title  = title,
        @Song_Artist = artist
    FROM dbo.songs
    WHERE song_id = @Song_ID;

    IF @Song_Title IS NULL
    BEGIN
        RAISERROR('Song_ID %d does not exist.', 16, 1, @Song_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Flip _Called = 1 on every card in this game
    -- where the Song_ID matches that square.
    ------------------------------------------------------------
    UPDATE dbo.Cards
    SET
        Sq_B1_Called = CASE WHEN Sq_B1 = @Song_ID THEN 1 ELSE Sq_B1_Called END,
        Sq_B2_Called = CASE WHEN Sq_B2 = @Song_ID THEN 1 ELSE Sq_B2_Called END,
        Sq_B3_Called = CASE WHEN Sq_B3 = @Song_ID THEN 1 ELSE Sq_B3_Called END,
        Sq_B4_Called = CASE WHEN Sq_B4 = @Song_ID THEN 1 ELSE Sq_B4_Called END,
        Sq_B5_Called = CASE WHEN Sq_B5 = @Song_ID THEN 1 ELSE Sq_B5_Called END,

        Sq_I1_Called = CASE WHEN Sq_I1 = @Song_ID THEN 1 ELSE Sq_I1_Called END,
        Sq_I2_Called = CASE WHEN Sq_I2 = @Song_ID THEN 1 ELSE Sq_I2_Called END,
        Sq_I3_Called = CASE WHEN Sq_I3 = @Song_ID THEN 1 ELSE Sq_I3_Called END,
        Sq_I4_Called = CASE WHEN Sq_I4 = @Song_ID THEN 1 ELSE Sq_I4_Called END,
        Sq_I5_Called = CASE WHEN Sq_I5 = @Song_ID THEN 1 ELSE Sq_I5_Called END,

        Sq_N1_Called = CASE WHEN Sq_N1 = @Song_ID THEN 1 ELSE Sq_N1_Called END,
        Sq_N2_Called = CASE WHEN Sq_N2 = @Song_ID THEN 1 ELSE Sq_N2_Called END,
        -- Sq_N3_Called is always 1 (FREE SPACE), never updated
        Sq_N4_Called = CASE WHEN Sq_N4 = @Song_ID THEN 1 ELSE Sq_N4_Called END,
        Sq_N5_Called = CASE WHEN Sq_N5 = @Song_ID THEN 1 ELSE Sq_N5_Called END,

        Sq_G1_Called = CASE WHEN Sq_G1 = @Song_ID THEN 1 ELSE Sq_G1_Called END,
        Sq_G2_Called = CASE WHEN Sq_G2 = @Song_ID THEN 1 ELSE Sq_G2_Called END,
        Sq_G3_Called = CASE WHEN Sq_G3 = @Song_ID THEN 1 ELSE Sq_G3_Called END,
        Sq_G4_Called = CASE WHEN Sq_G4 = @Song_ID THEN 1 ELSE Sq_G4_Called END,
        Sq_G5_Called = CASE WHEN Sq_G5 = @Song_ID THEN 1 ELSE Sq_G5_Called END,

        Sq_O1_Called = CASE WHEN Sq_O1 = @Song_ID THEN 1 ELSE Sq_O1_Called END,
        Sq_O2_Called = CASE WHEN Sq_O2 = @Song_ID THEN 1 ELSE Sq_O2_Called END,
        Sq_O3_Called = CASE WHEN Sq_O3 = @Song_ID THEN 1 ELSE Sq_O3_Called END,
        Sq_O4_Called = CASE WHEN Sq_O4 = @Song_ID THEN 1 ELSE Sq_O4_Called END,
        Sq_O5_Called = CASE WHEN Sq_O5 = @Song_ID THEN 1 ELSE Sq_O5_Called END
    WHERE Game_ID = @Game_ID;

    -- Capture row count immediately before any other statement resets it.
    DECLARE @Cards_Checked INT = @@ROWCOUNT;

    ------------------------------------------------------------
    -- Audit: write one row to Game_Called for this call event.
    -- Song_Title and Song_Artist are denormalized here so the
    -- audit table is fully self-contained — no JOIN to dbo.songs
    -- is needed to review call history.
    -- ThisNumberAWinner defaults to 0; usp_CheckForWinner will
    -- flip it to 1 on the winning call if a Bingo is found.
    ------------------------------------------------------------
    DECLARE @Called_ID INT;

    INSERT INTO dbo.Game_Called
        (Game_ID, Song_ID, Song_Title, Song_Artist, DateTimeStamp, ThisNumberAWinner)
    VALUES
        (@Game_ID, @Song_ID, @Song_Title, @Song_Artist, GETDATE(), 0);

    SET @Called_ID = SCOPE_IDENTITY();

    ------------------------------------------------------------
    -- Summary
    ------------------------------------------------------------
    SELECT
        @Game_ID        AS Game_ID,
        @Song_ID        AS Song_ID,
        @Song_Title     AS Song_Title,
        @Song_Artist    AS Song_Artist,
        @Called_ID      AS Called_ID,
        @Cards_Checked  AS Cards_Checked,
        SUM(
            CASE WHEN Sq_B1 = @Song_ID OR Sq_B2 = @Song_ID OR Sq_B3 = @Song_ID OR Sq_B4 = @Song_ID OR Sq_B5 = @Song_ID
                      OR Sq_I1 = @Song_ID OR Sq_I2 = @Song_ID OR Sq_I3 = @Song_ID OR Sq_I4 = @Song_ID OR Sq_I5 = @Song_ID
                      OR Sq_N1 = @Song_ID OR Sq_N2 = @Song_ID OR Sq_N4 = @Song_ID OR Sq_N5 = @Song_ID
                      OR Sq_G1 = @Song_ID OR Sq_G2 = @Song_ID OR Sq_G3 = @Song_ID OR Sq_G4 = @Song_ID OR Sq_G5 = @Song_ID
                      OR Sq_O1 = @Song_ID OR Sq_O2 = @Song_ID OR Sq_O3 = @Song_ID OR Sq_O4 = @Song_ID OR Sq_O5 = @Song_ID
            THEN 1 ELSE 0 END
        )               AS Cards_Matched
    FROM dbo.Cards
    WHERE Game_ID = @Game_ID;

END;