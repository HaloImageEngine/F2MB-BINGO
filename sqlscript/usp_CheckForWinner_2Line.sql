-- ============================================================
-- Stored Procedure : dbo.usp_CheckForWinner_2Line
-- Database         : haloimag_djgogi
-- Author           : William D Beaty
-- Created          : April 29, 2026
-- ============================================================
-- DESCRIPTION:
--   Checks all bingo cards for a given game looking for cards
--   that have completed ANY 2 winning lines. A "line" is any
--   row, column, or diagonal (12 possible patterns total).
--   A card must satisfy AT LEAST 2 distinct winning patterns
--   to be declared a winner in this variant.
--
--   If winners are found, all qualifying cards are auto-flagged,
--   the Game record is updated to Complete, and all winner
--   details are returned. If no card has 2 lines yet, a
--   'No winner yet' result is returned and the game continues.
--
-- PARAMETERS:
--   @Game_ID        INT  -- The Game to check. Must exist in
--                        -- the Game table.
--
-- HOW IT WORKS:
--   Step 1 : CROSS APPLY VALUES evaluates all 12 patterns
--            against every card in one pass — no looping.
--   Step 2 : Results are grouped by Card_ID and only cards
--            with a COUNT of winning patterns >= 2 are kept.
--   Step 3 : All qualifying cards are flagged, Game is updated,
--            and every winning card + pattern combo is returned.
--
-- 12 WINNING PATTERNS CHECKED:
--   Rows (5):
--     - Row 1 : Sq_B1, Sq_I1, Sq_N1, Sq_G1, Sq_O1
--     - Row 2 : Sq_B2, Sq_I2, Sq_N2, Sq_G2, Sq_O2
--     - Row 3 : Sq_B3, Sq_I3, Sq_N3(FREE), Sq_G3, Sq_O3
--     - Row 4 : Sq_B4, Sq_I4, Sq_N4, Sq_G4, Sq_O4
--     - Row 5 : Sq_B5, Sq_I5, Sq_N5, Sq_G5, Sq_O5
--
--   Columns (5):
--     - Col B : Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5
--     - Col I : Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5
--     - Col N : Sq_N1, Sq_N2, Sq_N3(FREE), Sq_N4, Sq_N5
--     - Col G : Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5
--     - Col O : Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
--
--   Diagonals (2):
--     - Diag TL-BR : Sq_B1, Sq_I2, Sq_N3(FREE), Sq_G4, Sq_O5
--     - Diag TR-BL : Sq_O1, Sq_G2, Sq_N3(FREE), Sq_I4, Sq_B5
--
-- FREE SPACE NOTE:
--   Sq_N3_Called is always 1 (FREE SPACE). Patterns that
--   include N3 — Row 3, Col N, Diag TL-BR, Diag TR-BL —
--   only need 4 additional squares called to complete.
--   This makes those 4 patterns slightly easier and means
--   a card with Row 3 + either diagonal is a very common
--   2-line result early in the game.
--
-- WHAT IT AUTO-FLAGS ON A WIN:
--   Cards table:
--     - Card_IsWinner set to 1 on ALL qualifying cards
--
--   Game table:
--     - Game_WinnerCard_ID set to the lowest qualifying Card_ID
--     - Game_Status set to 'Complete'
--     - Game_EndTime stamped with SYSDATETIME()
--
-- USAGE:
--   -- Call after every usp_CallSong execution as a 2-line variant:
--   EXEC dbo.usp_CallSong                @Game_ID = 1, @Song_ID = 42;
--   EXEC dbo.usp_CheckForWinner_2Line    @Game_ID = 1;
--
-- RETURNS:
--   One row per winning card+pattern combination:
--     - Game_ID           : The game that was checked
--     - Winning_Card_ID   : Card_ID of the winner
--     - Winning_Pattern   : Each pattern that contributed to the win
--                           e.g. 'Row 3', 'Diag TL-BR'
--     - Winning_Line_Count: How many lines this card completed (>= 2)
--     - Player_Name       : Card_PlayerName
--     - Player_Email      : Card_PlayerEmail
--     - Result            : 'BINGO BINGO!' or 'No winner yet'
--
-- GAME LOOP THIS PROC BELONGS TO:
--   1. usp_GenerateBingoCards     -- Generate 200 cards for a game
--   2. usp_CallSong               -- DJ plays a song, flip Called flags
--   3. usp_CheckForWinner_2Line   -- Check all cards for 2+ lines
--   4. usp_ResetGame              -- Reset and replay with same cards
--
-- RELATED PROCEDURES:
--   usp_CheckForWinner            -- Standard single-line winner check
--   usp_CheckForWinner_2Line      -- This proc; requires 2 lines to win
--
-- ERROR CONDITIONS:
--   - @Game_ID not found : Raises error 16, nothing changes
--
-- CHANGE LOG:
--   April 29, 2026 - Initial version created
-- ============================================================
CREATE PROCEDURE [dbo].[usp_CheckForWinner_2Line]
    @Game_ID  INT
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
    -- Step 1: Evaluate all 12 patterns against every card
    --         in one pass using CROSS APPLY VALUES.
    --         Only rows where IsWin = 1 are kept.
    ------------------------------------------------------------
    DECLARE @AllWinningLines TABLE (
        Card_ID    INT,
        WinPattern VARCHAR(50)
    );

    INSERT INTO @AllWinningLines (Card_ID, WinPattern)
    SELECT
        Card_ID,
        WinPattern
    FROM dbo.Cards
    CROSS APPLY
    (
        VALUES
        -- ── 5 Rows ──────────────────────────────────────────
        ('Row 1',      CASE WHEN Sq_B1_Called=1 AND Sq_I1_Called=1 AND Sq_N1_Called=1 AND Sq_G1_Called=1 AND Sq_O1_Called=1 THEN 1 ELSE 0 END),
        ('Row 2',      CASE WHEN Sq_B2_Called=1 AND Sq_I2_Called=1 AND Sq_N2_Called=1 AND Sq_G2_Called=1 AND Sq_O2_Called=1 THEN 1 ELSE 0 END),
        ('Row 3',      CASE WHEN Sq_B3_Called=1 AND Sq_I3_Called=1 AND Sq_N3_Called=1 AND Sq_G3_Called=1 AND Sq_O3_Called=1 THEN 1 ELSE 0 END),
        ('Row 4',      CASE WHEN Sq_B4_Called=1 AND Sq_I4_Called=1 AND Sq_N4_Called=1 AND Sq_G4_Called=1 AND Sq_O4_Called=1 THEN 1 ELSE 0 END),
        ('Row 5',      CASE WHEN Sq_B5_Called=1 AND Sq_I5_Called=1 AND Sq_N5_Called=1 AND Sq_G5_Called=1 AND Sq_O5_Called=1 THEN 1 ELSE 0 END),

        -- ── 5 Columns ────────────────────────────────────────
        ('Col B',      CASE WHEN Sq_B1_Called=1 AND Sq_B2_Called=1 AND Sq_B3_Called=1 AND Sq_B4_Called=1 AND Sq_B5_Called=1 THEN 1 ELSE 0 END),
        ('Col I',      CASE WHEN Sq_I1_Called=1 AND Sq_I2_Called=1 AND Sq_I3_Called=1 AND Sq_I4_Called=1 AND Sq_I5_Called=1 THEN 1 ELSE 0 END),
        ('Col N',      CASE WHEN Sq_N1_Called=1 AND Sq_N2_Called=1 AND Sq_N3_Called=1 AND Sq_N4_Called=1 AND Sq_N5_Called=1 THEN 1 ELSE 0 END),
        ('Col G',      CASE WHEN Sq_G1_Called=1 AND Sq_G2_Called=1 AND Sq_G3_Called=1 AND Sq_G4_Called=1 AND Sq_G5_Called=1 THEN 1 ELSE 0 END),
        ('Col O',      CASE WHEN Sq_O1_Called=1 AND Sq_O2_Called=1 AND Sq_O3_Called=1 AND Sq_O4_Called=1 AND Sq_O5_Called=1 THEN 1 ELSE 0 END),

        -- ── 2 Diagonals ──────────────────────────────────────
        ('Diag TL-BR', CASE WHEN Sq_B1_Called=1 AND Sq_I2_Called=1 AND Sq_N3_Called=1 AND Sq_G4_Called=1 AND Sq_O5_Called=1 THEN 1 ELSE 0 END),
        ('Diag TR-BL', CASE WHEN Sq_O1_Called=1 AND Sq_G2_Called=1 AND Sq_N3_Called=1 AND Sq_I4_Called=1 AND Sq_B5_Called=1 THEN 1 ELSE 0 END)

    ) AS Patterns (WinPattern, IsWin)
    WHERE Game_ID = @Game_ID
      AND IsWin   = 1;            -- only keep completed lines

    ------------------------------------------------------------
    -- Step 2: Filter down to cards with 2 or more winning lines.
    --         A card must have completed at least 2 distinct
    --         patterns to qualify as a 2-line winner.
    ------------------------------------------------------------
    DECLARE @TwoLineWinners TABLE (
        Card_ID      INT,
        WinPattern   VARCHAR(50),
        LineCount    INT           -- total lines this card completed
    );

    INSERT INTO @TwoLineWinners (Card_ID, WinPattern, LineCount)
    SELECT
        a.Card_ID,
        a.WinPattern,
        -- Count how many total lines this card completed;
        -- carried on every row so the result set can show it.
        cnt.LineCount
    FROM @AllWinningLines a
    INNER JOIN
    (
        -- Aggregate: how many lines did each card complete?
        SELECT  Card_ID,
                COUNT(*) AS LineCount
        FROM    @AllWinningLines
        GROUP BY Card_ID
        HAVING  COUNT(*) >= 2       -- 2-line threshold — change here
                                    -- to require 3+ lines if needed
    ) cnt ON cnt.Card_ID = a.Card_ID;

    ------------------------------------------------------------
    -- Step 3: If 2-line winners exist, flag cards + update Game
    ------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM @TwoLineWinners)
    BEGIN
        -- Flag ALL qualifying cards as winners
        UPDATE dbo.Cards
        SET    Card_IsWinner = 1
        WHERE  Card_ID IN (SELECT DISTINCT Card_ID FROM @TwoLineWinners);

        -- Update Game record.
        -- Game_WinnerCard_ID stores the lowest Card_ID as the
        -- primary winner; all tied winners are visible in the
        -- result set below.
        UPDATE dbo.Game
        SET    Game_WinnerCard_ID = (SELECT MIN(Card_ID) FROM @TwoLineWinners),
               Game_Status        = 'Complete',
               Game_EndTime       = SYSDATETIME()
        WHERE  Game_ID = @Game_ID;

        -- Return one row per card+pattern so the caller can see
        -- exactly which lines each winning card completed.
        SELECT
            @Game_ID              AS Game_ID,
            w.Card_ID             AS Winning_Card_ID,
            w.WinPattern          AS Winning_Pattern,
            w.LineCount           AS Winning_Line_Count,
            c.Card_PlayerName     AS Player_Name,
            c.Card_PlayerEmail    AS Player_Email,
            'BINGO BINGO!'        AS Result
        FROM        @TwoLineWinners w
        INNER JOIN  dbo.Cards       c ON c.Card_ID = w.Card_ID
        ORDER BY    w.Card_ID, w.WinPattern;
    END
    ELSE
    BEGIN
        -- No card has completed 2 lines yet; game continues
        SELECT
            @Game_ID        AS Game_ID,
            NULL            AS Winning_Card_ID,
            NULL            AS Winning_Pattern,
            NULL            AS Winning_Line_Count,
            NULL            AS Player_Name,
            NULL            AS Player_Email,
            'No winner yet' AS Result;
    END;

END;


--Key design decisions worth noting:

--Two-stage table variables — @AllWinningLines captures every completed pattern across all cards first, then @TwoLineWinners filters to only those cards with COUNT(*) >= 2. This keeps the logic clean and easy to read.
--HAVING COUNT(*) >= 2 — this is the only line you need to touch if you ever want a 3-line or 4-line variant. The comment flags it clearly.
--LineCount column — carried through to the result set so your front-end/DJ dashboard can display "this player had 3 lines!" rather than just knowing they won.
--Result = 'BINGO BINGO!' — distinct from the single-line proc's 'BINGO!' so your calling code can easily tell which variant triggered the win.