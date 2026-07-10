-- ============================================================
-- Stored Procedure : dbo.usp_CheckForWinner_4Corners
-- Database         : haloimag_djgogi
-- Author           : William D Beaty
-- Created          : April 29, 2026
-- ============================================================
-- DESCRIPTION:
--   Checks all bingo cards for a given game to find any card
--   where all 4 corner squares have been called. The 4 corners
--   are a classic bingo variant where only the top-left,
--   top-right, bottom-left, and bottom-right squares need to
--   be marked to win — regardless of anything else on the card.
--
--   If winners are found, all qualifying cards are auto-flagged,
--   the Game record is updated to Complete, and all winner
--   details are returned. If no card has all 4 corners yet,
--   a 'No winner yet' result is returned and the game continues.
--
-- PARAMETERS:
--   @Game_ID        INT  -- The Game to check. Must exist in
--                        -- the Game table.
--
-- HOW IT WORKS:
--   A single WHERE clause checks that all 4 corner squares on
--   each card are flagged as Called. No CROSS APPLY needed —
--   there is only one pattern to evaluate.
--
--     Top-Left     : Sq_B1  (Row 1, Col B)
--     Top-Right    : Sq_O1  (Row 1, Col O)
--     Bottom-Left  : Sq_B5  (Row 5, Col B)
--     Bottom-Right : Sq_O5  (Row 5, Col O)
--
--   Visual layout of a 5x5 bingo card:
--
--          B     I     N     G     O
--        +-----+-----+-----+-----+-----+
--   R1   | [X] |     |     |     | [X] |  <-- Top-Left, Top-Right
--        +-----+-----+-----+-----+-----+
--   R2   |     |     |     |     |     |
--        +-----+-----+-----+-----+-----+
--   R3   |     |     |FREE |     |     |
--        +-----+-----+-----+-----+-----+
--   R4   |     |     |     |     |     |
--        +-----+-----+-----+-----+-----+
--   R5   | [X] |     |     |     | [X] |  <-- Bottom-Left, Bottom-Right
--        +-----+-----+-----+-----+-----+
--
-- FREE SPACE NOTE:
--   Sq_N3 (center) is always 1 (FREE SPACE) but plays no role
--   in the 4 Corners pattern. All 4 corner squares must be
--   explicitly called — there are no free squares in this variant.
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
--   -- Call after every usp_CallSong execution as a 4-corners variant:
--   EXEC dbo.usp_CallSong                  @Game_ID = 1, @Song_ID = 42;
--   EXEC dbo.usp_CheckForWinner_4Corners   @Game_ID = 1;
--
-- RETURNS:
--   One row per winning card:
--     - Game_ID           : The game that was checked
--     - Winning_Card_ID   : Card_ID of the winner
--     - Winning_Pattern   : Always '4 Corners' for this proc
--     - Player_Name       : Card_PlayerName
--     - Player_Email      : Card_PlayerEmail
--     - Result            : 'BINGO! 4 Corners!' or 'No winner yet'
--
-- GAME LOOP THIS PROC BELONGS TO:
--   1. usp_GenerateBingoCards          -- Generate 200 cards for a game
--   2. usp_CallSong                    -- DJ plays a song, flip Called flags
--   3. usp_CheckForWinner_4Corners     -- Check all cards for 4 corners
--   4. usp_ResetGame                   -- Reset and replay with same cards
--
-- RELATED PROCEDURES:
--   usp_CheckForWinner          -- Standard single-line winner check
--   usp_CheckForWinner_2Line    -- Requires 2 completed lines to win
--   usp_CheckForWinner_4Corners -- This proc; all 4 corners must be called
--
-- ERROR CONDITIONS:
--   - @Game_ID not found : Raises error 16, nothing changes
--
-- CHANGE LOG:
--   April 29, 2026 - Initial version created
-- ============================================================
CREATE PROCEDURE [dbo].[usp_CheckForWinner_4Corners]
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
    -- Step 1: Find all cards where all 4 corners are called.
    --
    --   Corner squares:
    --     Sq_B1_Called = Top-Left     (Row 1, Col B)
    --     Sq_O1_Called = Top-Right    (Row 1, Col O)
    --     Sq_B5_Called = Bottom-Left  (Row 5, Col B)
    --     Sq_O5_Called = Bottom-Right (Row 5, Col O)
    --
    --   All 4 must equal 1 for the card to qualify.
    --   No CROSS APPLY needed — single pattern, simple WHERE.
    ------------------------------------------------------------
    DECLARE @CornerWinners TABLE (
        Card_ID  INT
    );

    INSERT INTO @CornerWinners (Card_ID)
    SELECT Card_ID
    FROM   dbo.Cards
    WHERE  Game_ID        = @Game_ID
      AND  Sq_B1_Called   = 1    -- Top-Left corner
      AND  Sq_O1_Called   = 1    -- Top-Right corner
      AND  Sq_B5_Called   = 1    -- Bottom-Left corner
      AND  Sq_O5_Called   = 1;   -- Bottom-Right corner

    ------------------------------------------------------------
    -- Step 2: If corner winners exist, flag cards + update Game
    ------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM @CornerWinners)
    BEGIN
        -- Flag ALL qualifying cards as winners
        UPDATE dbo.Cards
        SET    Card_IsWinner = 1
        WHERE  Card_ID IN (SELECT Card_ID FROM @CornerWinners);

        -- Update Game record.
        -- Game_WinnerCard_ID stores the lowest Card_ID as the
        -- primary winner; all tied winners are visible in the
        -- result set below.
        UPDATE dbo.Game
        SET    Game_WinnerCard_ID = (SELECT MIN(Card_ID) FROM @CornerWinners),
               Game_Status        = 'Complete',
               Game_EndTime       = SYSDATETIME()
        WHERE  Game_ID = @Game_ID;

        -- Return one row per winning card.
        -- Winning_Pattern is always '4 Corners' here; included
        -- so the result set stays consistent with the other
        -- CheckForWinner procs and the caller needs no special casing.
        SELECT
            @Game_ID                AS Game_ID,
            w.Card_ID               AS Winning_Card_ID,
            '4 Corners'             AS Winning_Pattern,
            c.Card_PlayerName       AS Player_Name,
            c.Card_PlayerEmail      AS Player_Email,
            'BINGO! 4 Corners!'     AS Result
        FROM        @CornerWinners  w
        INNER JOIN  dbo.Cards       c ON c.Card_ID = w.Card_ID
        ORDER BY    w.Card_ID;
    END
    ELSE
    BEGIN
        -- No card has all 4 corners called yet; game continues
        SELECT
            @Game_ID        AS Game_ID,
            NULL            AS Winning_Card_ID,
            '4 Corners'     AS Winning_Pattern,
            NULL            AS Player_Name,
            NULL            AS Player_Email,
            'No winner yet' AS Result;
    END;

END;


--A few notes on this one vs the others:

--No CROSS APPLY needed — unlike the line-check procs that have to evaluate 12 patterns, 4 Corners is a single condition so a plain WHERE clause on all 4 squares is cleaner and faster.
--ASCII card diagram in the header — makes it immediately obvious to any future developer which squares are being checked without having to mentally map column/row names.
--Consistent result set shape — Winning_Pattern is hardcoded to '4 Corners' and Result to 'BINGO! 4 Corners!' so your calling code treats all three CheckForWinner procs identically; no special casing needed on the front end.
--'4 Corners' in the No Winner row too — so the caller always knows which proc fired, even on a miss.