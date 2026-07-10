-- ============================================================
-- MUSIC BINGO — Card Generator
-- SQL Server 2017 Compatible
--
-- USAGE:
--   EXEC usp_GenerateBingoCards
--       @Game_ID    = 1,        -- The game to generate cards for
--       @CardCount  = 200,      -- How many cards to create
--       @PlaylistSize = 15;     -- Songs that will be called (win window)
--
-- HOW IT WORKS:
--   1. Pulls the active song pool tied to the Game's GameNight
--   2. Shuffles randomly using NEWID()
--   3. Assigns 24 unique songs per card into the 25 squares (N3 = FREE)
--   4. Guarantees at least 1 "sure winner" card whose entire
--      top row (B1,I1,N1,G1,O1) is within the first @PlaylistSize songs called
--   5. Inserts all cards into the Cards table
-- ============================================================

CREATE PROCEDURE usp_GenerateBingoCards
    @Game_ID        INT,
    @CardCount      INT  = 200,
    @PlaylistSize   INT  = 15       -- songs that will be called this game
AS
BEGIN
    SET NOCOUNT ON;

    -- ── Validation ────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM Game WHERE Game_ID = @Game_ID)
    BEGIN
        RAISERROR('Game_ID %d does not exist.', 16, 1, @Game_ID);
        RETURN;
    END

    IF @CardCount < 1 OR @CardCount > 10000
    BEGIN
        RAISERROR('CardCount must be between 1 and 10000.', 16, 1);
        RETURN;
    END

    -- ── Grab the GN_ID for this game ──────────────────────────
    DECLARE @GN_ID INT;
    SELECT @GN_ID = GN_ID FROM Game WHERE Game_ID = @Game_ID;

    -- ── Build the eligible song pool ──────────────────────────
    -- All active songs. Add a WHERE clause here if you later tie
    -- songs to a GameNight playlist table.
    DROP TABLE IF EXISTS #SongPool;
    SELECT
        Song_ID,
        ROW_NUMBER() OVER (ORDER BY NEWID()) AS RandRank   -- random shuffle
    INTO #SongPool
    FROM Songs
    WHERE Song_IsActive = 1;

    DECLARE @PoolSize INT = (SELECT COUNT(*) FROM #SongPool);

    IF @PoolSize < 24
    BEGIN
        RAISERROR('Not enough active songs (%d). Need at least 24.', 16, 1, @PoolSize);
        RETURN;
    END

    IF @PlaylistSize > @PoolSize
    BEGIN
        RAISERROR('PlaylistSize (%d) cannot exceed total song pool (%d).', 16, 1, @PlaylistSize, @PoolSize);
        RETURN;
    END

    -- ── Identify "hot" songs (called within first @PlaylistSize) ──
    -- These are the songs that WILL be called during the game.
    -- A card wins if it has a complete line made only of hot songs.
    DROP TABLE IF EXISTS #HotSongs;
    SELECT Song_ID
    INTO   #HotSongs
    FROM   #SongPool
    WHERE  RandRank <= @PlaylistSize;

    -- We need at least 5 hot songs to guarantee a line winner
    DECLARE @HotCount INT = (SELECT COUNT(*) FROM #HotSongs);
    IF @HotCount < 5
    BEGIN
        RAISERROR('PlaylistSize (%d) yields only %d hot songs — need at least 5 for a guaranteed winner.', 16, 1, @PlaylistSize, @HotCount);
        RETURN;
    END

    -- ── Work table to stage all 200 cards ─────────────────────
    DROP TABLE IF EXISTS #NewCards;
    CREATE TABLE #NewCards (
        CardSeq         INT NOT NULL,   -- 1..@CardCount
        IsGuaranteed    BIT NOT NULL DEFAULT 0,
        Sq_B1 INT, Sq_B2 INT, Sq_B3 INT, Sq_B4 INT, Sq_B5 INT,
        Sq_I1 INT, Sq_I2 INT, Sq_I3 INT, Sq_I4 INT, Sq_I5 INT,
        Sq_N1 INT, Sq_N2 INT, Sq_N3 INT, Sq_N4 INT, Sq_N5 INT,  -- N3 always NULL
        Sq_G1 INT, Sq_G2 INT, Sq_G3 INT, Sq_G4 INT, Sq_G5 INT,
        Sq_O1 INT, Sq_O2 INT, Sq_O3 INT, Sq_O4 INT, Sq_O5 INT
    );

    -- ── Generate cards one at a time ──────────────────────────
    DECLARE @i INT = 1;

    WHILE @i <= @CardCount
    BEGIN
        -- Re-shuffle the pool for every card
        DROP TABLE IF EXISTS #Shuffled;
        SELECT
            Song_ID,
            ROW_NUMBER() OVER (ORDER BY NEWID()) AS Pos
        INTO #Shuffled
        FROM #SongPool;

        -- Pull 24 songs in shuffled order (skip position 13 = FREE SPACE)
        -- Positions 1-12 → squares 1-12, positions 13-24 → squares 14-25
        DROP TABLE IF EXISTS #CardSongs;
        SELECT TOP 24
            Song_ID,
            ROW_NUMBER() OVER (ORDER BY Pos) AS Slot   -- Slot 1..24
        INTO #CardSongs
        FROM #Shuffled
        ORDER BY Pos;

        -- Map Slot → named square
        -- Layout:  B1 B2 B3 B4 B5 | I1 I2 I3 I4 I5 | N1 N2 [FREE] N4 N5 | G1 G2 G3 G4 G5 | O1 O2 O3 O4 O5
        -- Slots:    1  2  3  4  5     6  7  8  9 10    11 12        13 14    15 16 17 18 19    20 21 22 23 24
        INSERT INTO #NewCards (
            CardSeq,
            Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5,
            Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5,
            Sq_N1, Sq_N2, Sq_N3, Sq_N4, Sq_N5,
            Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5,
            Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
        )
        SELECT
            @i,
            MAX(CASE WHEN Slot =  1 THEN Song_ID END),  -- B1
            MAX(CASE WHEN Slot =  2 THEN Song_ID END),  -- B2
            MAX(CASE WHEN Slot =  3 THEN Song_ID END),  -- B3
            MAX(CASE WHEN Slot =  4 THEN Song_ID END),  -- B4
            MAX(CASE WHEN Slot =  5 THEN Song_ID END),  -- B5
            MAX(CASE WHEN Slot =  6 THEN Song_ID END),  -- I1
            MAX(CASE WHEN Slot =  7 THEN Song_ID END),  -- I2
            MAX(CASE WHEN Slot =  8 THEN Song_ID END),  -- I3
            MAX(CASE WHEN Slot =  9 THEN Song_ID END),  -- I4
            MAX(CASE WHEN Slot = 10 THEN Song_ID END),  -- I5
            MAX(CASE WHEN Slot = 11 THEN Song_ID END),  -- N1
            MAX(CASE WHEN Slot = 12 THEN Song_ID END),  -- N2
            NULL,                                        -- N3 FREE SPACE
            MAX(CASE WHEN Slot = 13 THEN Song_ID END),  -- N4
            MAX(CASE WHEN Slot = 14 THEN Song_ID END),  -- N5
            MAX(CASE WHEN Slot = 15 THEN Song_ID END),  -- G1
            MAX(CASE WHEN Slot = 16 THEN Song_ID END),  -- G2
            MAX(CASE WHEN Slot = 17 THEN Song_ID END),  -- G3
            MAX(CASE WHEN Slot = 18 THEN Song_ID END),  -- G4
            MAX(CASE WHEN Slot = 19 THEN Song_ID END),  -- G5
            MAX(CASE WHEN Slot = 20 THEN Song_ID END),  -- O1
            MAX(CASE WHEN Slot = 21 THEN Song_ID END),  -- O2
            MAX(CASE WHEN Slot = 22 THEN Song_ID END),  -- O3
            MAX(CASE WHEN Slot = 23 THEN Song_ID END),  -- O4
            MAX(CASE WHEN Slot = 24 THEN Song_ID END)   -- O5
        FROM #CardSongs;

        SET @i += 1;
    END

    -- ── Guaranteed Winner Card ────────────────────────────────
    -- Overwrite card #1 so its TOP ROW (B1,I1,N1,G1,O1) is
    -- entirely composed of hot songs. N1 is row-1 of the N column
    -- (not the free space), so 5 hot songs guarantee a line win.

    DECLARE @Hot1 INT, @Hot2 INT, @Hot3 INT, @Hot4 INT, @Hot5 INT;

    SELECT TOP 5
        @Hot1 = MIN(CASE WHEN rn = 1 THEN Song_ID END),
        @Hot2 = MIN(CASE WHEN rn = 2 THEN Song_ID END),
        @Hot3 = MIN(CASE WHEN rn = 3 THEN Song_ID END),
        @Hot4 = MIN(CASE WHEN rn = 4 THEN Song_ID END),
        @Hot5 = MIN(CASE WHEN rn = 5 THEN Song_ID END)
    FROM (
        SELECT Song_ID, ROW_NUMBER() OVER (ORDER BY NEWID()) AS rn
        FROM #HotSongs
    ) h;

    UPDATE #NewCards
    SET
        Sq_B1        = @Hot1,
        Sq_I1        = @Hot2,
        Sq_N1        = @Hot3,
        Sq_G1        = @Hot4,
        Sq_O1        = @Hot5,
        IsGuaranteed = 1
    WHERE CardSeq = 1;

    -- ── Insert into Cards table ───────────────────────────────
    INSERT INTO Cards (
        Game_ID,
        Card_Date_Create,
        PlayCount,
        Card_IsWinner,
        Card_SeedKey,
        Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5,
        Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5,
        Sq_N1, Sq_N2, Sq_N3, Sq_N4, Sq_N5,
        Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5,
        Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
    )
    SELECT
        @Game_ID,
        SYSDATETIME(),
        0,
        0,
        CONVERT(VARCHAR(36), NEWID()),   -- unique seed key per card
        Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5,
        Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5,
        Sq_N1, Sq_N2, Sq_N3, Sq_N4, Sq_N5,
        Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5,
        Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
    FROM #NewCards
    ORDER BY CardSeq;

    -- ── Summary ───────────────────────────────────────────────
    SELECT
        @CardCount              AS CardsGenerated,
        @GN_ID                  AS GN_ID,
        @Game_ID                AS Game_ID,
        @PoolSize               AS SongPoolSize,
        @PlaylistSize           AS PlaylistSize,
        @HotCount               AS HotSongsInPlaylist,
        'Top row of Card #1 is 100% within the playlist call order'
                                AS GuaranteedWinnerNote;

END;
GO


-- ============================================================
-- HELPER: Preview a card by Card_ID
--         Shows the 5x5 grid with Song Title + Artist
-- ============================================================
CREATE OR ALTER PROCEDURE usp_PreviewCard
    @Card_ID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.Card_ID,
        c.Game_ID,
        c.Card_Date_Create,
        c.Card_IsWinner,
        c.Card_SeedKey,

        -- B Column
        sB1.Song_Title + ' – ' + sB1.Song_Artist   AS B1,
        sB2.Song_Title + ' – ' + sB2.Song_Artist   AS B2,
        sB3.Song_Title + ' – ' + sB3.Song_Artist   AS B3,
        sB4.Song_Title + ' – ' + sB4.Song_Artist   AS B4,
        sB5.Song_Title + ' – ' + sB5.Song_Artist   AS B5,

        -- I Column
        sI1.Song_Title + ' – ' + sI1.Song_Artist   AS I1,
        sI2.Song_Title + ' – ' + sI2.Song_Artist   AS I2,
        sI3.Song_Title + ' – ' + sI3.Song_Artist   AS I3,
        sI4.Song_Title + ' – ' + sI4.Song_Artist   AS I4,
        sI5.Song_Title + ' – ' + sI5.Song_Artist   AS I5,

        -- N Column
        sN1.Song_Title + ' – ' + sN1.Song_Artist   AS N1,
        sN2.Song_Title + ' – ' + sN2.Song_Artist   AS N2,
        'FREE SPACE'                                AS N3,
        sN4.Song_Title + ' – ' + sN4.Song_Artist   AS N4,
        sN5.Song_Title + ' – ' + sN5.Song_Artist   AS N5,

        -- G Column
        sG1.Song_Title + ' – ' + sG1.Song_Artist   AS G1,
        sG2.Song_Title + ' – ' + sG2.Song_Artist   AS G2,
        sG3.Song_Title + ' – ' + sG3.Song_Artist   AS G3,
        sG4.Song_Title + ' – ' + sG4.Song_Artist   AS G4,
        sG5.Song_Title + ' – ' + sG5.Song_Artist   AS G5,

        -- O Column
        sO1.Song_Title + ' – ' + sO1.Song_Artist   AS O1,
        sO2.Song_Title + ' – ' + sO2.Song_Artist   AS O2,
        sO3.Song_Title + ' – ' + sO3.Song_Artist   AS O3,
        sO4.Song_Title + ' – ' + sO4.Song_Artist   AS O4,
        sO5.Song_Title + ' – ' + sO5.Song_Artist   AS O5

    FROM Cards c
    LEFT JOIN Songs sB1 ON c.Sq_B1 = sB1.Song_ID
    LEFT JOIN Songs sB2 ON c.Sq_B2 = sB2.Song_ID
    LEFT JOIN Songs sB3 ON c.Sq_B3 = sB3.Song_ID
    LEFT JOIN Songs sB4 ON c.Sq_B4 = sB4.Song_ID
    LEFT JOIN Songs sB5 ON c.Sq_B5 = sB5.Song_ID
    LEFT JOIN Songs sI1 ON c.Sq_I1 = sI1.Song_ID
    LEFT JOIN Songs sI2 ON c.Sq_I2 = sI2.Song_ID
    LEFT JOIN Songs sI3 ON c.Sq_I3 = sI3.Song_ID
    LEFT JOIN Songs sI4 ON c.Sq_I4 = sI4.Song_ID
    LEFT JOIN Songs sI5 ON c.Sq_I5 = sI5.Song_ID
    LEFT JOIN Songs sN1 ON c.Sq_N1 = sN1.Song_ID
    LEFT JOIN Songs sN2 ON c.Sq_N2 = sN2.Song_ID
    LEFT JOIN Songs sN4 ON c.Sq_N4 = sN4.Song_ID
    LEFT JOIN Songs sN5 ON c.Sq_N5 = sN5.Song_ID
    LEFT JOIN Songs sG1 ON c.Sq_G1 = sG1.Song_ID
    LEFT JOIN Songs sG2 ON c.Sq_G2 = sG2.Song_ID
    LEFT JOIN Songs sG3 ON c.Sq_G3 = sG3.Song_ID
    LEFT JOIN Songs sG4 ON c.Sq_G4 = sG4.Song_ID
    LEFT JOIN Songs sG5 ON c.Sq_G5 = sG5.Song_ID
    LEFT JOIN Songs sO1 ON c.Sq_O1 = sO1.Song_ID
    LEFT JOIN Songs sO2 ON c.Sq_O2 = sO2.Song_ID
    LEFT JOIN Songs sO3 ON c.Sq_O3 = sO3.Song_ID
    LEFT JOIN Songs sO4 ON c.Sq_O4 = sO4.Song_ID
    LEFT JOIN Songs sO5 ON c.Sq_O5 = sO5.Song_ID

    WHERE c.Card_ID = @Card_ID;
END;
GO


-- ============================================================
-- EXAMPLE CALLS
-- ============================================================

-- Generate 200 cards for Game 1, expecting 15 songs to be called:
-- EXEC usp_GenerateBingoCards @Game_ID = 1, @CardCount = 200, @PlaylistSize = 15;

-- Preview card #1 (the guaranteed winner):
-- EXEC usp_PreviewCard @Card_ID = 1;
