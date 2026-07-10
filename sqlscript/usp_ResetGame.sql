-- ============================================================
-- Stored Procedure : dbo.usp_ResetGame
-- Database         : haloimag_djgogi
-- Author           : William D Beaty
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Resets a Music Bingo game back to its initial state so it
--   can be replayed using the same set of bingo cards without
--   having to regenerate them. All daubed squares are cleared,
--   the winning card is unflagged, and the Game record is
--   returned to Pending status.
--
-- PARAMETERS:
--   @Game_ID        INT  -- The Game to reset. Must exist in
--                        -- the Game table.
--   @ConfirmReset   BIT  -- Safety flag. Must explicitly pass
--                        -- 1 to execute the reset. Prevents
--                        -- accidental resets during live play.
--



CREATE  PROCEDURE dbo.usp_ResetGame
    @Game_ID        INT,
    @ConfirmReset   BIT = 0     -- must explicitly pass 1 to execute
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Safety check - must confirm reset intentionally
    ------------------------------------------------------------
    IF @ConfirmReset <> 1
    BEGIN
        RAISERROR('Reset not confirmed. Pass @ConfirmReset = 1 to proceed.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Validate Game exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Game WHERE Game_ID = @Game_ID)
    BEGIN
        RAISERROR('Game_ID %d does not exist.', 16, 1, @Game_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Reset all Called flags on every card in this game
    -- Sq_N3_Called stays 1 (FREE SPACE always daubed)
    ------------------------------------------------------------
    UPDATE dbo.Cards
    SET
        Card_IsWinner  = 0,

        -- B Column
        Sq_B1_Called   = 0,
        Sq_B2_Called   = 0,
        Sq_B3_Called   = 0,
        Sq_B4_Called   = 0,
        Sq_B5_Called   = 0,

        -- I Column
        Sq_I1_Called   = 0,
        Sq_I2_Called   = 0,
        Sq_I3_Called   = 0,
        Sq_I4_Called   = 0,
        Sq_I5_Called   = 0,

        -- N Column (Sq_N3_Called stays 1 - FREE SPACE)
        Sq_N1_Called   = 0,
        Sq_N2_Called   = 0,
        Sq_N3_Called   = 1,   -- FREE SPACE always stays daubed
        Sq_N4_Called   = 0,
        Sq_N5_Called   = 0,

        -- G Column
        Sq_G1_Called   = 0,
        Sq_G2_Called   = 0,
        Sq_G3_Called   = 0,
        Sq_G4_Called   = 0,
        Sq_G5_Called   = 0,

        -- O Column
        Sq_O1_Called   = 0,
        Sq_O2_Called   = 0,
        Sq_O3_Called   = 0,
        Sq_O4_Called   = 0,
        Sq_O5_Called   = 0
    WHERE Game_ID = @Game_ID;

    DECLARE @CardsReset INT = @@ROWCOUNT;

    ------------------------------------------------------------
    -- Reset Game record
    ------------------------------------------------------------
    UPDATE dbo.Game
    SET
        Game_WinnerCard_ID = NULL,
        Game_Status        = 'Pending',
        Game_StartTime     = NULL,
        Game_EndTime       = NULL
    WHERE Game_ID = @Game_ID;

    ------------------------------------------------------------
    -- Summary
    ------------------------------------------------------------
    SELECT
        @Game_ID        AS Game_ID,
        @CardsReset     AS Cards_Reset,
        'Pending'       AS Game_Status,
        'Game has been reset. All Called flags cleared. Free space preserved.' AS Result;

END;
GO

-- WHAT IT RESETS:
--   Cards table:
--     - All Sq_XX_Called flags set back to 0 (not daubed)
--     - Sq_N3_Called stays 1 (FREE SPACE is always daubed)
--     - Card_IsWinner set back to 0 on all cards
--
--   Game table:
--     - Game_WinnerCard_ID cleared to NULL
--     - Game_Status reset to 'Pending'
--     - Game_StartTime cleared to NULL
--     - Game_EndTime cleared to NULL
--
-- WHAT IT DOES NOT RESET:
--   - Card layouts (song assignments stay the same)
--   - Card_PlayerName / Card_PlayerEmail (players keep cards)
--   - Card_SeedKey (card identity preserved for reprinting)
--   - Card_Date_Create (original creation timestamp kept)
--   - GameNight record (untouched)
--   - Songs table (untouched)
--
-- USAGE:
--   EXEC dbo.usp_ResetGame
--       @Game_ID      = 1,
--       @ConfirmReset = 1;
--
-- RETURNS:
--   Single row summary:
--     - Game_ID       : The game that was reset
--     - Cards_Reset   : Number of cards that were reset
--     - Game_Status   : Confirms 'Pending'
--     - Result        : Confirmation message
--
-- GAME LOOP THIS PROC BELONGS TO:
--   1. usp_GenerateBingoCards  -- Generate 200 cards for a game
--   2. usp_CallSong            -- DJ plays a song, flip Called flags
--   3. usp_CheckForWinner      -- Check all 12 patterns for a winner
--   4. usp_ResetGame           -- Reset and replay with same cards
--
-- ERROR CONDITIONS:
--   - @ConfirmReset <> 1 : Reset not confirmed error, nothing changes
--   - @Game_ID not found : Game does not exist error, nothing changes
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
-- ============================================================
