USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_Get_Printed_Cards_byCard_ID]    Script Date: 4/29/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- Stored Procedure : dbo.usp_Get_Printed_Cards_byCard_ID
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : 2026-04-24
-- Modified         : 2026-04-29
-- ============================================================
-- DESCRIPTION:
--   Returns a fully unpivoted bingo card dataset for a single
--   card. The card is expanded into 25 rows — one per square —
--   via CROSS APPLY VALUES, giving callers a clean, square-level
--   result set that is easy to render or format for print.
--
-- PARAMETERS:
--   @Card_ID    INT  -- The specific card to retrieve.
--                       Must exist in the Cards table.
--
-- HOW IT WORKS:
--   1. Validates that @Card_ID exists in dbo.Cards using
--      Card_ID = @Card_ID. Raises an error and exits
--      immediately if not found.
--
--   2. A CTE (TopCards) selects the single matching Card_ID
--      using WHERE Card_ID = @Card_ID.
--
--   3. The main SELECT joins TopCards → dbo.Cards → dbo.Game
--      and then uses CROSS APPLY VALUES to unpivot all 25
--      squares (B1-O5) into individual rows. Each row carries:
--        - SquareCode     : e.g. 'B1', 'N3'
--        - SquarePosition : 1-25 display order (left-to-right,
--                           top-to-bottom on the physical card)
--        - ColumnLetter   : B, I, N, G, or O
--        - RowNumber      : 1-5
--        - SongID         : FK to dbo.songs (NULL for free space)
--        - IsCalled       : 0/1 flag — has this square been daubed
--
--   4. A LEFT JOIN to dbo.songs enriches each square row with
--      SongTitle and SongArtist. The free space square (N3) will
--      return NULL for both since no song is assigned there.
--
--   5. IsFreeSpace is computed inline: 1 when SquareCode = 'N3',
--      0 for all other squares. Cast to BIT for type safety.
--
--   6. Results are ordered by SquarePosition so the caller
--      receives the 25 squares in left-to-right, top-to-bottom
--      print order.
--
-- USAGE:
--   -- Retrieve card 42:
--   EXEC dbo.usp_Get_Printed_Cards_byCard_ID
--       @Card_ID = 42;
--
-- RETURNS:
--   Exactly 25 rows — one per square — for the requested card.
--   Columns: CardID, GameID, USERID, GameNumber, GameName,
--            GameWinPattern, CardDateCreate, CardPlayerName,
--            CardPlayerEmail, PlayCount, CardIsWinner,
--            CardSeedKey, CardPrintedAt, SquareCode,
--            SquarePosition, ColumnLetter, RowNumber,
--            SongID, SongTitle, SongArtist, IsCalled, IsFreeSpace
--
-- GAME LOOP THIS PROC BELONGS TO:
--   1. usp_GenerateBingoCards          -- Generate cards for a game
--   2. usp_Get_Printed_Cards_byCard_ID -- Pull a single card for printing
--   3. usp_CallSong                    -- DJ calls a song
--   4. usp_CheckForWinner              -- Check for a winning card
--   5. usp_ResetGame                   -- Reset for next game
--
-- ERROR CONDITIONS:
--   - @Card_ID not found : Raises error, returns nothing.
--
-- CHANGE LOG:
--   2026-04-24  DJGogi  Initial creation with TOP 100 hardcoded.
--   2026-04-28  DJGogi  Replaced hardcoded TOP 100 with @NoOfCards
--                       parameter. Added CTE. Added full proc comments.
--   2026-04-29  DJGogi  Fixed validation bug: WHERE clause was using
--                       Game_ID = @Card_ID (wrong column, wrong parameter)
--                       instead of Card_ID = @Card_ID. This caused the
--                       guard to evaluate against the wrong column and
--                       allowed unintended rows through. Corrected to
--                       Card_ID = @Card_ID in both the validation check
--                       and the CTE. Proc now returns exactly 25 rows
--                       for the single requested card.
-- ============================================================

ALTER PROCEDURE [dbo].[usp_Get_Printed_Cards_byCard_ID]
    @Card_ID  INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validate Card exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Cards WHERE Card_ID = @Card_ID)
    BEGIN
        RAISERROR('Card_ID %d does not exist.', 16, 1, @Card_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- CTE: select the single requested Card_ID.
    ------------------------------------------------------------
    ;WITH TopCards AS
    (
        SELECT
            Card_ID
        FROM dbo.Cards
        WHERE Card_ID = @Card_ID
    )

    ------------------------------------------------------------
    -- Main SELECT: join CTE → Cards → Game, then unpivot all
    -- 25 squares per card via CROSS APPLY VALUES.
    ------------------------------------------------------------
    SELECT
        c.Card_ID                                                           AS CardID,
        c.Game_ID                                                           AS GameID,
        ISNULL(g.User_ID, 0)                                                AS USERID,
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

    ORDER BY sq.SquarePosition;

END;
