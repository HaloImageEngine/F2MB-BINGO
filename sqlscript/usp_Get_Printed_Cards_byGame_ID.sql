USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_Get_Printed_Cards_byGame_ID]    Script Date: 5/29/2026 12:23:22 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- Stored Procedure : dbo.usp_Get_Printed_Cards_byGame_ID
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : 2026-04-24
-- Modified         : 2026-05-14
-- ============================================================
-- DESCRIPTION:
--   Returns a fully unpivoted bingo card dataset for printing.
--   Each card is expanded into 25 rows — one per square — via
--   CROSS APPLY VALUES, giving callers a clean, square-level
--   result set that is easy to render or format for print.
--
--   The @NoOfCards parameter limits how many cards are returned,
--   always pulling the lowest Card_IDs in sequential order so
--   cards 1-N are printed in the same sequence they were
--   originally generated.
--
-- PARAMETERS:
--   @Game_ID       INT  -- The game whose cards should be printed.
--                          Must exist in the Game table.
--   @Call_List_ID  INT  -- The call list identifier to filter cards.
--   @Inning        INT  -- The inning number to filter cards.
--   @NoOfCards     INT  -- How many cards to return, in sequential
--                          Card_ID order. Defaults to 10.
--                          Pass 0 or NULL to return all cards.
--
-- HOW IT WORKS:
--   1. Validates that @Game_ID exists in dbo.Game. Raises an
--      error and exits immediately if not found.
--
--   2. Normalises @NoOfCards: if NULL or 0 is passed, it is set
--      to a very large sentinel value (2,147,483,647) so that the
--      TOP clause effectively returns every card in the game.
--
--   3. A CTE (TopCards) selects the @NoOfCards lowest Card_IDs
--      for the requested game using TOP with ORDER BY Card_ID.
--      Results are filtered by Game_ID, Call_List_ID, and Inning.
--      Ranking by Card_ID guarantees sequential, deterministic
--      order regardless of insert timing.
--
--   4. The main SELECT joins TopCards → dbo.Cards → dbo.Game and
--      then uses CROSS APPLY VALUES to unpivot all 25 squares
--      (B1-O5) into individual rows. Each row carries:
--        - CardID         : Unique card identifier
--        - GameID         : FK to dbo.Game
--        - CallListID     : The call list this card belongs to
--        - Inning         : The inning this card is for
--        - SquareCode     : e.g. 'B1', 'N3'
--        - SquarePosition : 1-25 display order (left-to-right,
--                           top-to-bottom on the physical card)
--        - ColumnLetter   : B, I, N, G, or O
--        - RowNumber      : 1-5
--        - SongID         : FK to dbo.songs (NULL for free space)
--        - IsCalled       : 0/1 flag — has this square been daubed
--
--   5. A LEFT JOIN to dbo.songs enriches each square row with
--      SongTitle and SongArtist. The free space square (N3) will
--      return NULL for both since no song is assigned there.
--
--   6. IsFreeSpace is computed inline: 1 when SquareCode = 'N3',
--      0 for all other squares. Cast to BIT for type safety.
--
--   7. Results are ordered by Card_ID then SquarePosition so the
--      caller receives complete card blocks in print sequence.
--
-- USAGE:
--   -- Print the first 50 cards for Game 1, Call List 1, Inning 1:
--   EXEC dbo.usp_Get_Printed_Cards_byGame_ID
--       @Game_ID      = 1,
--       @Call_List_ID = 1,
--       @Inning       = 1,
--       @NoOfCards    = 50;
--
--   -- Print all cards for Game 1, Call List 1, Inning 1:
--   EXEC dbo.usp_Get_Printed_Cards_byGame_ID
--       @Game_ID      = 1,
--       @Call_List_ID = 1,
--       @Inning       = 1,
--       @NoOfCards    = 0;   -- or NULL
--
-- RETURNS:
--   One row per square per card (25 rows per card).
--   Columns: CardID, GameID, CallListID, Inning, UserID, GameNumber,
--            GameName, GameWinPattern, CardDateCreate, CardPlayerName,
--            CardPlayerEmail, PlayCount, CardIsWinner, CardSeedKey,
--            CardPrintedAt, SquareCode, SquarePosition, ColumnLetter,
--            RowNumber, SongID, SongTitle, SongArtist, IsCalled,
--            IsFreeSpace
--
-- GAME LOOP THIS PROC BELONGS TO:
--   1. usp_GenerateBingoCards  -- Generate cards for a game
--   2. usp_Get_Printed_Cards_byGame_ID -- Pull cards for printing
--   3. usp_CallSong            -- DJ calls a song
--   4. usp_CheckForWinner      -- Check for a winning card
--   5. usp_ResetGame           -- Reset for next game
--
-- ERROR CONDITIONS:
--   - @Game_ID not found : Raises error 208, returns nothing.
--
-- CHANGE LOG:
--   2026-04-24  DJGogi  Initial creation with TOP 100 hardcoded.
--   2026-04-28  DJGogi  Replaced hardcoded TOP 100 with @NoOfCards
--                       parameter (default 200). Pass 0 or NULL to
--                       return all cards. Added CTE to enforce
--                       sequential Card_ID ordering before unpivot.
--                       Added full proc comments.
--   2026-05-14  DJGogi  Added Call_List_ID and Inning to result set.
--                       Updated documentation to reflect new columns.
-- ============================================================

ALTER PROCEDURE [dbo].[usp_Get_Printed_Cards_byGame_ID]
    @Game_ID       INT,
    @Call_List_ID  INT,
    @Inning        INT,
    @NoOfCards     INT = 10       -- Number of cards to print in Card_ID order.
                                   -- Pass 0 or NULL to return all cards.
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
    -- Normalise @NoOfCards:
    -- NULL or 0 means "all cards" — set to max INT so TOP
    -- effectively has no upper bound.
    ------------------------------------------------------------
    IF @NoOfCards IS NULL OR @NoOfCards = 0
        SET @NoOfCards = 2147483647;

    ------------------------------------------------------------
    -- CTE: select the @NoOfCards lowest Card_IDs for this game
    -- in sequential order. Doing this in a CTE keeps the unpivot
    -- logic below clean and ensures TOP is applied before the
    -- 25x row expansion from CROSS APPLY.
    ------------------------------------------------------------
    ;WITH TopCards AS
    (
        SELECT TOP (@NoOfCards)
            Card_ID
        FROM dbo.Cards
        WHERE Game_ID      = @Game_ID
          AND Call_List_ID = @Call_List_ID
          AND Inning       = @Inning
        ORDER BY Card_ID ASC        -- Sequential, deterministic order
    )

    ------------------------------------------------------------
    -- Main SELECT: join CTE → Cards → Game, then unpivot all
    -- 25 squares per card via CROSS APPLY VALUES.
    ------------------------------------------------------------
    SELECT
        c.Card_ID                                                           AS CardID,
        c.Game_ID                                                           AS GameID,
        c.Call_List_ID                                                      AS Call_List_ID,
        c.Inning                                                            AS Inning,
        c.Call_List_ID                                                      AS CallListID,
        c.Inning                                                            AS Inning,
        g.User_ID                                                             AS USERID,
        g.Game_Number                                                       AS GameNumber,
        g.Game_Name                                                         AS GameName,
        g.Game_WinPattern                                                   AS GameWinPattern,
        c.Card_Date_Create                                                  AS CardDateCreate,
        c.Card_PlayerName                                                   AS CardPlayerName,
        c.Card_PlayerEmail                                                  AS CardPlayerEmail,
        c.PlayCount                                                         AS PlayCount,
        c.Card_IsWinner                                                     AS CardIsWinner,
        c.Card_SeedKey                                                      AS CardSeedKey,
        c.Card_PrintedAt                                                    AS CardPrintedAt,
        sq.SquareCode                                                       AS SquareCode,
        sq.SquarePosition                                                   AS SquarePosition,
        sq.ColumnLetter                                                     AS ColumnLetter,
        sq.RowNumber                                                        AS RowNumber,
        sq.SongID                                                           AS SongID,
        s.title                                                             AS SongTitle,
        s.artist                                                            AS SongArtist,
        sq.IsCalled                                                         AS IsCalled,
        CAST(CASE WHEN sq.SquareCode = 'N3' THEN 1 ELSE 0 END AS BIT)     AS IsFreeSpace

    FROM TopCards tc
    INNER JOIN dbo.Cards c  ON c.Card_ID  = tc.Card_ID
    INNER JOIN dbo.Game  g  ON g.Game_ID  = c.Game_ID

    ------------------------------------------------------------
    -- CROSS APPLY unpivots the 25 card squares into individual
    -- rows. SquarePosition drives left-to-right, top-to-bottom
    -- print order across the 5x5 grid.
    -- N3 (position 13) is the FREE SPACE — SongID is always
    -- NULL and IsCalled is always 1 for that square.
    ------------------------------------------------------------
    CROSS APPLY
    (
        VALUES
            ('B1',  1, 'B', 1, c.Sq_B1, c.Sq_B1_Called),
            ('I1',  2, 'I', 1, c.Sq_I1, c.Sq_I1_Called),
            ('N1',  3, 'N', 1, c.Sq_N1, c.Sq_N1_Called),
            ('G1',  4, 'G', 1, c.Sq_G1, c.Sq_G1_Called),
            ('O1',  5, 'O', 1, c.Sq_O1, c.Sq_O1_Called),
            ('B2',  6, 'B', 2, c.Sq_B2, c.Sq_B2_Called),
            ('I2',  7, 'I', 2, c.Sq_I2, c.Sq_I2_Called),
            ('N2',  8, 'N', 2, c.Sq_N2, c.Sq_N2_Called),
            ('G2',  9, 'G', 2, c.Sq_G2, c.Sq_G2_Called),
            ('O2', 10, 'O', 2, c.Sq_O2, c.Sq_O2_Called),
            ('B3', 11, 'B', 3, c.Sq_B3, c.Sq_B3_Called),
            ('I3', 12, 'I', 3, c.Sq_I3, c.Sq_I3_Called),
            ('N3', 13, 'N', 3, c.Sq_N3, c.Sq_N3_Called),  -- FREE SPACE
            ('G3', 14, 'G', 3, c.Sq_G3, c.Sq_G3_Called),
            ('O3', 15, 'O', 3, c.Sq_O3, c.Sq_O3_Called),
            ('B4', 16, 'B', 4, c.Sq_B4, c.Sq_B4_Called),
            ('I4', 17, 'I', 4, c.Sq_I4, c.Sq_I4_Called),
            ('N4', 18, 'N', 4, c.Sq_N4, c.Sq_N4_Called),
            ('G4', 19, 'G', 4, c.Sq_G4, c.Sq_G4_Called),
            ('O4', 20, 'O', 4, c.Sq_O4, c.Sq_O4_Called),
            ('B5', 21, 'B', 5, c.Sq_B5, c.Sq_B5_Called),
            ('I5', 22, 'I', 5, c.Sq_I5, c.Sq_I5_Called),
            ('N5', 23, 'N', 5, c.Sq_N5, c.Sq_N5_Called),
            ('G5', 24, 'G', 5, c.Sq_G5, c.Sq_G5_Called),
            ('O5', 25, 'O', 5, c.Sq_O5, c.Sq_O5_Called)
    ) sq (SquareCode, SquarePosition, ColumnLetter, RowNumber, SongID, IsCalled)

    LEFT JOIN dbo.songs s ON s.song_id = sq.SongID

    ORDER BY c.Card_ID, sq.SquarePosition;

END;

--Key Changes Made:

--Added to SELECT statement (lines after GameID):

--c.Call_List_ID AS CallListID
--c.Inning AS Inning


--Updated RETURNS documentation to include CallListID and Inning in the column list
--Updated PARAMETERS section to properly document all three filter parameters
--Updated USAGE examples to show all required parameters
--Updated HOW IT WORKS section to mention the Call_List_ID and Inning filtering
--Added CHANGE LOG entry for today's date (2026-05-14) documenting the addition of these fields
