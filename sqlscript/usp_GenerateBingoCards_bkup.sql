USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_GenerateBingoCards]    Script Date: 4/22/2026 12:13:13 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[usp_GenerateBingoCards]
    @Game_ID                INT,
    @CardCount              INT = 200,
    @PlaylistSize           INT = 15,
    @BingoCategory          VARCHAR(100) = NULL,
    @Genre                  VARCHAR(100) = NULL,
    @Decade                 VARCHAR(5) = NULL,
    @ExcludeExplicit        BIT = 0,
    @ExcludeInstrumental    BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validation
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Game WHERE Game_ID = @Game_ID)
    BEGIN
        RAISERROR('Game_ID %d does not exist.', 16, 1, @Game_ID);
        RETURN;
    END;

    IF @CardCount < 1 OR @CardCount > 10000
    BEGIN
        RAISERROR('CardCount must be between 1 and 10000.', 16, 1);
        RETURN;
    END;

    IF @PlaylistSize < 5
    BEGIN
        RAISERROR('PlaylistSize must be at least 5.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Get GN_ID
    ------------------------------------------------------------
    DECLARE @GN_ID INT;
    SELECT @GN_ID = GN_ID
    FROM dbo.Game
    WHERE Game_ID = @Game_ID;

    ------------------------------------------------------------
    -- Build eligible song pool from SUBSET of songs table
    ------------------------------------------------------------
    IF OBJECT_ID('tempdb..#SongPool') IS NOT NULL
        DROP TABLE #SongPool;

    SELECT
        src.song_id,
        ROW_NUMBER() OVER (ORDER BY NEWID()) AS RandRank
    INTO #SongPool
    FROM
    (
        SELECT s.song_id
        FROM dbo.songs s
        WHERE s.active = 1
          AND (@BingoCategory IS NULL OR s.bingo_category = @BingoCategory)
          AND (@Genre IS NULL OR s.genre = @Genre)
          AND (@Decade IS NULL OR s.decade = @Decade)
          AND (@ExcludeExplicit = 0 OR s.explicit = 0)
          AND (@ExcludeInstrumental = 0 OR s.is_instrumental = 0)
    ) src;

    DECLARE @PoolSize INT;
    SELECT @PoolSize = COUNT(*)
    FROM #SongPool;

    IF @PoolSize < 24
    BEGIN
        RAISERROR('Not enough songs in selected subset (%d). Need at least 24.', 16, 1, @PoolSize);
        RETURN;
    END;

    IF @PlaylistSize > @PoolSize
    BEGIN
        RAISERROR('PlaylistSize (%d) cannot exceed selected song pool (%d).', 16, 1, @PlaylistSize, @PoolSize);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Hot songs = first @PlaylistSize songs that will be called
    ------------------------------------------------------------
    IF OBJECT_ID('tempdb..#HotSongs') IS NOT NULL
        DROP TABLE #HotSongs;

    SELECT song_id
    INTO #HotSongs
    FROM #SongPool
    WHERE RandRank <= @PlaylistSize;

    DECLARE @HotCount INT;
    SELECT @HotCount = COUNT(*)
    FROM #HotSongs;

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
    DECLARE @i INT;
    SET @i = 1;

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
            NULL, -- N3 free space
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
    -- Guaranteed winner card
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
        Sq_B1 = @Hot1,
        Sq_I1 = @Hot2,
        Sq_N1 = @Hot3,
        Sq_G1 = @Hot4,
        Sq_O1 = @Hot5,
        IsGuaranteed = 1
    WHERE CardSeq = 1;

    ------------------------------------------------------------
    -- Insert into Cards table
    ------------------------------------------------------------
    INSERT INTO dbo.Cards
    (
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
        CONVERT(VARCHAR(36), NEWID()),
        Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5,
        Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5,
        Sq_N1, Sq_N2, Sq_N3, Sq_N4, Sq_N5,
        Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5,
        Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
    FROM #NewCards
    ORDER BY CardSeq;

    ------------------------------------------------------------
    -- Summary
    ------------------------------------------------------------
    SELECT
        @CardCount               AS CardsGenerated,
        @GN_ID                   AS GN_ID,
        @Game_ID                 AS Game_ID,
        @PoolSize                AS SongPoolSize,
        @PlaylistSize            AS PlaylistSize,
        @HotCount                AS HotSongsInPlaylist,
        @BingoCategory           AS BingoCategory,
        @Genre                   AS Genre,
        @Decade                  AS Decade,
        @ExcludeExplicit         AS ExcludeExplicit,
        @ExcludeInstrumental     AS ExcludeInstrumental,
        'Top row of Card #1 is 100% within the playlist call order' AS GuaranteedWinnerNote;
END;
