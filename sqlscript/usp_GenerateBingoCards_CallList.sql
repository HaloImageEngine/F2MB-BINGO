-- ============================================================
-- Stored Procedure : dbo.usp_GenerateBingoCards_CallList
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Generates a set of unique Music Bingo cards for a given
--   game using a curated CallList_Songs pool instead of the
--   raw songs table. Everything works identically to
--   usp_GenerateBingoCards except the song pool is pulled
--   from dbo.CallList_Songs filtered by @Call_List_ID.
--   Card #1 is always a guaranteed winner - its top row is
--   pre-loaded with 5 songs from the playlist call order.
--   All _Called flags are set to 0 on insert except Sq_N3
--   which is always 1 (FREE SPACE).
--
-- PARAMETERS:
--   @Game_ID        INT          -- Required. The Game to
--                                -- generate cards for. Must
--                                -- exist in dbo.Game table.
--   @Call_List_ID   INT          -- Required. The CallList_
--                                -- Master record to pull
--                                -- songs from. Must exist
--                                -- in CallList_Master and
--                                -- have at least 24 songs.
--   @CardCount      INT = 200    -- Number of cards to generate.
--                                -- Default 200, max 10000.
--   @PlaylistSize   INT = 15     -- Number of songs that will
--                                -- be called during the game.
--                                -- Must be at least 5 and
--                                -- cannot exceed pool size.
--
-- HOW IT WORKS:
--   Step 1 - Validate:
--     Confirms Game_ID exists, Call_List_ID exists, and
--     CallList_Songs has enough songs (minimum 24).
--
--   Step 2 - Song Pool:
--     Pulls all active songs from dbo.CallList_Songs for
--     the given @Call_List_ID and assigns each a random
--     rank using NEWID(). This becomes the pool all cards
--     draw from.
--
--   Step 3 - Hot Songs:
--     The first @PlaylistSize songs by random rank are
--     flagged as hot songs - these are the songs that
--     will definitely be called during the game.
--
--   Step 4 - Card Generation:
--     Loops @CardCount times. Each iteration reshuffles
--     the song pool using NEWID() and picks 24 unique
--     songs mapping them to the 25 bingo squares.
--     Sq_N3 is always NULL (FREE SPACE).
--
--   Step 5 - Guaranteed Winner:
--     Card #1 has its top row (B1, I1, N1, G1, O1)
--     overwritten with 5 hot songs. Since all
--     @PlaylistSize songs will be called, this top
--     row is guaranteed to complete before night ends.
--
--   Step 6 - Insert:
--     All generated cards are bulk inserted into
--     dbo.Cards. All _Called flags explicitly set to 0.
--     Sq_N3_Called set to 1 (FREE SPACE always daubed).
--
-- TEMP TABLES USED:
--   #SongPool   -- Randomized pool from CallList_Songs
--   #HotSongs   -- Songs within @PlaylistSize call window
--   #NewCards   -- Staging table for all generated cards
--   #Shuffled   -- Per-card reshuffled pool (inside loop)
--   #CardSongs  -- 24 songs picked for a single card
--
-- USAGE:
--   EXEC dbo.usp_GenerateBingoCards_CallList
--       @Game_ID      = 1,
--       @Call_List_ID = 1,
--       @CardCount    = 200,
--       @PlaylistSize = 15;
--
-- RETURNS:
--   Single row summary:
--     - CardsGenerated      : Number of cards created
--     - GN_ID               : GameNight ID
--     - Game_ID             : Game cards were created for
--     - Call_List_ID        : Call list used as song pool
--     - Call_List_Name      : Name of the call list
--     - SongPoolSize        : Total songs in the call list
--     - PlaylistSize        : Songs that will be called
--     - HotSongsInPlaylist  : Hot songs for winner card
--     - GuaranteedWinnerNote: Confirms Card #1 winner logic
--
-- DIFFERENCE FROM usp_GenerateBingoCards:
--   - Song pool pulls from dbo.CallList_Songs filtered by
--     @Call_List_ID instead of dbo.songs WHERE active = 1
--   - @Call_List_ID is a required parameter
--   - @BingoCategory, @Genre, @Decade filters removed since
--     the call list is already curated
--   - Summary returns Call_List_ID and Call_List_Name
--
-- ERROR CONDITIONS:
--   - @Game_ID not found        : Game does not exist
--   - @Call_List_ID not found   : Call list does not exist
--   - Song pool < 24            : Not enough songs in list
--   - @CardCount out of range   : Must be between 1 and 10000
--   - @PlaylistSize too small   : Must be at least 5
--   - @PlaylistSize > pool size : Cannot exceed song pool
--   - Hot songs < 5             : Need at least 5 hot songs
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
-- ============================================================

CREATE PROCEDURE dbo.usp_GenerateBingoCards_CallList
    @Game_ID      INT,
    @Call_List_ID INT,
    @CardCount    INT = 200,
    @PlaylistSize INT = 15
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_WARNINGS OFF;

    ------------------------------------------------------------
    -- Validate Game exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Game WHERE Game_ID = @Game_ID)
    BEGIN
        RAISERROR('Game_ID %d does not exist.', 16, 1, @Game_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Validate CallList_Master exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.CallList_Master WHERE Call_List_ID = @Call_List_ID)
    BEGIN
        RAISERROR('Call_List_ID %d does not exist in CallList_Master.', 16, 1, @Call_List_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Validate CardCount
    ------------------------------------------------------------
    IF @CardCount < 1 OR @CardCount > 10000
    BEGIN
        RAISERROR('CardCount must be between 1 and 10000.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Validate PlaylistSize
    ------------------------------------------------------------
    IF @PlaylistSize < 5
    BEGIN
        RAISERROR('PlaylistSize must be at least 5.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Get GN_ID and Call_List_Name for summary
    ------------------------------------------------------------
    DECLARE @GN_ID          INT;
    DECLARE @Call_List_Name VARCHAR(150);

    SELECT @GN_ID = GN_ID
    FROM dbo.Game
    WHERE Game_ID = @Game_ID;

    SELECT @Call_List_Name = Call_List_Name
    FROM dbo.CallList_Master
    WHERE Call_List_ID = @Call_List_ID;

    ------------------------------------------------------------
    -- Build song pool from CallList_Songs
    ------------------------------------------------------------
    IF OBJECT_ID('tempdb..#SongPool') IS NOT NULL
        DROP TABLE #SongPool;

    SELECT
        src.song_id,
        ROW_NUMBER() OVER (ORDER BY NEWID()) AS RandRank
    INTO #SongPool
    FROM
    (
        SELECT song_id
        FROM dbo.CallList_Songs
        WHERE Call_List_ID = @Call_List_ID
    ) src;

    DECLARE @PoolSize INT;
    SELECT @PoolSize = COUNT(*) FROM #SongPool;

    IF @PoolSize < 24
    BEGIN
        RAISERROR('Not enough songs in Call_List_ID %d (%d songs). Need at least 24.', 16, 1, @Call_List_ID, @PoolSize);
        RETURN;
    END;

    IF @PlaylistSize > @PoolSize
    BEGIN
        RAISERROR('PlaylistSize (%d) cannot exceed song pool size (%d).', 16, 1, @PlaylistSize, @PoolSize);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Hot songs = first @PlaylistSize songs in random order
    ------------------------------------------------------------
    IF OBJECT_ID('tempdb..#HotSongs') IS NOT NULL
        DROP TABLE #HotSongs;

    SELECT song_id
    INTO #HotSongs
    FROM #SongPool
    WHERE RandRank <= @PlaylistSize;

    DECLARE @HotCount INT;
    SELECT @HotCount = COUNT(*) FROM #HotSongs;

    IF @HotCount < 5
    BEGIN
        RAISERROR('Need at least 5 hot songs for guaranteed winner logic.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Work table for new cards
    ------------------------------------------------------------
    IF OBJECT_ID('tempdb..#NewCards') IS NOT NULL
        DROP TABLE #NewCards;

    CREATE TABLE #NewCards
    (
        CardSeq      INT NOT NULL,
        IsGuaranteed BIT NOT NULL DEFAULT (0),

        Sq_B1 INT, Sq_B2 INT, Sq_B3 INT, Sq_B4 INT, Sq_B5 INT,
        Sq_I1 INT, Sq_I2 INT, Sq_I3 INT, Sq_I4 INT, Sq_I5 INT,
        Sq_N1 INT, Sq_N2 INT, Sq_N3 INT, Sq_N4 INT, Sq_N5 INT,
        Sq_G1 INT, Sq_G2 INT, Sq_G3 INT, Sq_G4 INT, Sq_G5 INT,
        Sq_O1 INT, Sq_O2 INT, Sq_O3 INT, Sq_O4 INT, Sq_O5 INT
    );

    ------------------------------------------------------------
    -- Generate cards
    ------------------------------------------------------------
    DECLARE @i INT = 1;

    WHILE @i <= @CardCount
    BEGIN
        IF OBJECT_ID('tempdb..#Shuffled') IS NOT NULL
            DROP TABLE #Shuffled;

        SELECT
            song_id,
            ROW_NUMBER() OVER (ORDER BY NEWID()) AS Pos
        INTO #Shuffled
        FROM #SongPool;

        IF OBJECT_ID('tempdb..#CardSongs') IS NOT NULL
            DROP TABLE #CardSongs;

        SELECT TOP (24)
            song_id,
            ROW_NUMBER() OVER (ORDER BY Pos) AS Slot
        INTO #CardSongs
        FROM #Shuffled
        ORDER BY Pos;

        INSERT INTO #NewCards
        (
            CardSeq,
            Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5,
            Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5,
            Sq_N1, Sq_N2, Sq_N3, Sq_N4, Sq_N5,
            Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5,
            Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
        )
        SELECT
            @i,
            MAX(CASE WHEN Slot =  1 THEN song_id END),
            MAX(CASE WHEN Slot =  2 THEN song_id END),
            MAX(CASE WHEN Slot =  3 THEN song_id END),
            MAX(CASE WHEN Slot =  4 THEN song_id END),
            MAX(CASE WHEN Slot =  5 THEN song_id END),
            MAX(CASE WHEN Slot =  6 THEN song_id END),
            MAX(CASE WHEN Slot =  7 THEN song_id END),
            MAX(CASE WHEN Slot =  8 THEN song_id END),
            MAX(CASE WHEN Slot =  9 THEN song_id END),
            MAX(CASE WHEN Slot = 10 THEN song_id END),
            MAX(CASE WHEN Slot = 11 THEN song_id END),
            MAX(CASE WHEN Slot = 12 THEN song_id END),
            NULL, -- Sq_N3 FREE SPACE
            MAX(CASE WHEN Slot = 13 THEN song_id END),
            MAX(CASE WHEN Slot = 14 THEN song_id END),
            MAX(CASE WHEN Slot = 15 THEN song_id END),
            MAX(CASE WHEN Slot = 16 THEN song_id END),
            MAX(CASE WHEN Slot = 17 THEN song_id END),
            MAX(CASE WHEN Slot = 18 THEN song_id END),
            MAX(CASE WHEN Slot = 19 THEN song_id END),
            MAX(CASE WHEN Slot = 20 THEN song_id END),
            MAX(CASE WHEN Slot = 21 THEN song_id END),
            MAX(CASE WHEN Slot = 22 THEN song_id END),
            MAX(CASE WHEN Slot = 23 THEN song_id END),
            MAX(CASE WHEN Slot = 24 THEN song_id END)
        FROM #CardSongs;

        SET @i = @i + 1;
    END;

    ------------------------------------------------------------
    -- Guaranteed winner card - overwrite Card #1 top row
    ------------------------------------------------------------
    DECLARE @Hot1 INT, @Hot2 INT, @Hot3 INT, @Hot4 INT, @Hot5 INT;

    ;WITH HotPick AS
    (
        SELECT
            song_id,
            ROW_NUMBER() OVER (ORDER BY NEWID()) AS rn
        FROM #HotSongs
    )
    SELECT
        @Hot1 = MAX(CASE WHEN rn = 1 THEN song_id END),
        @Hot2 = MAX(CASE WHEN rn = 2 THEN song_id END),
        @Hot3 = MAX(CASE WHEN rn = 3 THEN song_id END),
        @Hot4 = MAX(CASE WHEN rn = 4 THEN song_id END),
        @Hot5 = MAX(CASE WHEN rn = 5 THEN song_id END)
    FROM HotPick
    WHERE rn <= 5;

    UPDATE #NewCards
    SET
        Sq_B1        = @Hot1,
        Sq_I1        = @Hot2,
        Sq_N1        = @Hot3,
        Sq_G1        = @Hot4,
        Sq_O1        = @Hot5,
        IsGuaranteed = 1
    WHERE CardSeq = 1;

    ------------------------------------------------------------
    -- Insert into Cards table with all _Called flags = 0
    ------------------------------------------------------------
    INSERT INTO dbo.Cards
    (
        Game_ID,
        Card_Date_Create,
        PlayCount,
        Card_IsWinner,
        Card_SeedKey,

        Sq_B1, Sq_B1_Called,
        Sq_B2, Sq_B2_Called,
        Sq_B3, Sq_B3_Called,
        Sq_B4, Sq_B4_Called,
        Sq_B5, Sq_B5_Called,

        Sq_I1, Sq_I1_Called,
        Sq_I2, Sq_I2_Called,
        Sq_I3, Sq_I3_Called,
        Sq_I4, Sq_I4_Called,
        Sq_I5, Sq_I5_Called,

        Sq_N1, Sq_N1_Called,
        Sq_N2, Sq_N2_Called,
        Sq_N3, Sq_N3_Called,   -- FREE SPACE: NULL / 1
        Sq_N4, Sq_N4_Called,
        Sq_N5, Sq_N5_Called,

        Sq_G1, Sq_G1_Called,
        Sq_G2, Sq_G2_Called,
        Sq_G3, Sq_G3_Called,
        Sq_G4, Sq_G4_Called,
        Sq_G5, Sq_G5_Called,

        Sq_O1, Sq_O1_Called,
        Sq_O2, Sq_O2_Called,
        Sq_O3, Sq_O3_Called,
        Sq_O4, Sq_O4_Called,
        Sq_O5, Sq_O5_Called
    )
    SELECT
        @Game_ID,
        SYSDATETIME(),
        0,
        0,
        CONVERT(VARCHAR(36), NEWID()),

        Sq_B1, 0,
        Sq_B2, 0,
        Sq_B3, 0,
        Sq_B4, 0,
        Sq_B5, 0,

        Sq_I1, 0,
        Sq_I2, 0,
        Sq_I3, 0,
        Sq_I4, 0,
        Sq_I5, 0,

        Sq_N1, 0,
        Sq_N2, 0,
        NULL,  1,   -- Sq_N3 FREE SPACE: always NULL / always Called
        Sq_N4, 0,
        Sq_N5, 0,

        Sq_G1, 0,
        Sq_G2, 0,
        Sq_G3, 0,
        Sq_G4, 0,
        Sq_G5, 0,

        Sq_O1, 0,
        Sq_O2, 0,
        Sq_O3, 0,
        Sq_O4, 0,
        Sq_O5, 0
    FROM #NewCards
    ORDER BY CardSeq;

    ------------------------------------------------------------
    -- Summary
    ------------------------------------------------------------
    SET ANSI_WARNINGS ON;

    SELECT
        @CardCount          AS CardsGenerated,
        @GN_ID              AS GN_ID,
        @Game_ID            AS Game_ID,
        @Call_List_ID       AS Call_List_ID,
        @Call_List_Name     AS Call_List_Name,
        @PoolSize           AS SongPoolSize,
        @PlaylistSize       AS PlaylistSize,
        @HotCount           AS HotSongsInPlaylist,
        'Top row of Card #1 is 100% within the playlist call order' AS GuaranteedWinnerNote;

END;
GO
