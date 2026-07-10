USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_CheckForWinner_Blackout]    Script Date: 5/13/2026 9:15:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- Stored Procedure : dbo.usp_CheckForWinner_Blackout
-- Database         : haloimag_djgogi
-- Author           : William D Beaty
-- Created          : April 29, 2026
-- ============================================================
-- DESCRIPTION:
--   Checks all bingo cards for a given game to find any card
--   where ALL 25 squares have been called. This is the
--   "Blackout" or "Full Card" bingo variant — every single
--   square on the card must be marked, including the FREE
--   space at N3 which is always pre-called.
--
--   If winners are found, all qualifying cards are auto-flagged,
--   the Game record is updated to Complete, and all winner
--   details are returned. If no card is fully called yet,
--   a 'No winner yet' result is returned and the game continues.
--
-- PARAMETERS:
--   @Game_ID        INT  -- The Game to check. Must exist in
--                        -- the Game table.
--   @Call_List_ID   INT  -- The Call List to filter by
--   @Inning         INT  -- The Inning to filter by
--
-- HOW IT WORKS:
--   A single WHERE clause checks that all 25 squares on each
--   card are flagged as Called = 1. No CROSS APPLY needed —
--   there is only one pattern to evaluate (the full card).
--
--   All 25 squares checked:
--
--     Col B : Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5
--     Col I : Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5
--     Col N : Sq_N1, Sq_N2, Sq_N3(FREE), Sq_N4, Sq_N5
--     Col G : Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5
--     Col O : Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
--
--   Visual layout of a fully called 5x5 bingo card:
--
--          B     I     N     G     O
--        +-----+-----+-----+-----+-----+
--   R1   | [X] | [X] | [X] | [X] | [X] |
--        +-----+-----+-----+-----+-----+
--   R2   | [X] | [X] | [X] | [X] | [X] |
--        +-----+-----+-----+-----+-----+
--   R3   | [X] | [X] |FREE | [X] | [X] |
--        +-----+-----+-----+-----+-----+
--   R4   | [X] | [X] | [X] | [X] | [X] |
--        +-----+-----+-----+-----+-----+
--   R5   | [X] | [X] | [X] | [X] | [X] |
--        +-----+-----+-----+-----+-----+
--
-- FREE SPACE NOTE:
--   Sq_N3_Called is always 1 (FREE SPACE). It counts as called
--   for the Blackout pattern so only 24 songs need to match
--   the remaining squares on any given card to achieve a
--   Blackout. In practice this variant runs the full game
--   almost to completion before a winner emerges.
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
--   -- Call after every usp_CallSong execution as a Blackout variant:
--   EXEC dbo.usp_CallSong                  @Game_ID = 1, @Song_ID = 42;
--   EXEC dbo.usp_CheckForWinner_Blackout   @Game_ID = 1, @Call_List_ID = 5, @Inning = 3;
--
-- RETURNS:
--   One row per winning card:
--     - Game_ID           : The game that was checked
--     - Winning_Card_ID   : Card_ID of the winner
--     - Winning_Pattern   : Always 'Blackout' for this proc
--     - Player_Name       : Card_PlayerName
--     - Player_Email      : Card_PlayerEmail
--     - Result            : 'BINGO! Blackout!' or 'No winner yet'
--
-- GAME LOOP THIS PROC BELONGS TO:
--   1. usp_GenerateBingoCards          -- Generate 200 cards for a game
--   2. usp_CallSong                    -- DJ plays a song, flip Called flags
--   3. usp_CheckForWinner_Blackout     -- Check all cards for full blackout
--   4. usp_ResetGame                   -- Reset and replay with same cards
--
-- RELATED PROCEDURES:
--   usp_CheckForWinner            -- Standard single-line winner check
--   usp_CheckForWinner_2Line      -- Requires 2 completed lines to win
--   usp_CheckForWinner_4Corners   -- All 4 corner squares must be called
--   usp_CheckForWinner_Blackout   -- This proc; every square must be called
--
-- ERROR CONDITIONS:
--   - @Game_ID not found : Raises error 16, nothing changes
--
-- CHANGE LOG:
--   April 29, 2026 - Initial version created
--   May 13, 2026   - Added Call_List_ID and Inning parameters
-- ============================================================
ALTER PROCEDURE [dbo].[usp_CheckForWinner_Blackout]
    @Game_ID      INT,
    @Call_List_ID INT,
    @Inning       INT
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
    -- Step 1: Find all cards where every square is called.
    --
    --   All 25 squares must equal 1 for the card to qualify.
    --   Sq_N3 (FREE) is always 1 so effectively 24 songs
    --   need to land on a single card for a Blackout win.
    --   Grouped by column below for readability.
    --   
    --   Now also filters by Call_List_ID and Inning.
    ------------------------------------------------------------
    DECLARE @BlackoutWinners TABLE (
        Card_ID  INT
    );

    INSERT INTO @BlackoutWinners (Card_ID)
    SELECT Card_ID
    FROM   dbo.Cards
    WHERE  Game_ID       = @Game_ID
      AND  Call_List_ID  = @Call_List_ID
      AND  Inning        = @Inning
      -- Col B
      AND  Sq_B1_Called  = 1
      AND  Sq_B2_Called  = 1
      AND  Sq_B3_Called  = 1
      AND  Sq_B4_Called  = 1
      AND  Sq_B5_Called  = 1
      -- Col I
      AND  Sq_I1_Called  = 1
      AND  Sq_I2_Called  = 1
      AND  Sq_I3_Called  = 1
      AND  Sq_I4_Called  = 1
      AND  Sq_I5_Called  = 1
      -- Col N (Sq_N3 is always 1 — FREE SPACE)
      AND  Sq_N1_Called  = 1
      AND  Sq_N2_Called  = 1
      AND  Sq_N3_Called  = 1
      AND  Sq_N4_Called  = 1
      AND  Sq_N5_Called  = 1
      -- Col G
      AND  Sq_G1_Called  = 1
      AND  Sq_G2_Called  = 1
      AND  Sq_G3_Called  = 1
      AND  Sq_G4_Called  = 1
      AND  Sq_G5_Called  = 1
      -- Col O
      AND  Sq_O1_Called  = 1
      AND  Sq_O2_Called  = 1
      AND  Sq_O3_Called  = 1
      AND  Sq_O4_Called  = 1
      AND  Sq_O5_Called  = 1;

    ------------------------------------------------------------
    -- Step 2: If Blackout winners exist, flag cards + update Game
    ------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM @BlackoutWinners)
    BEGIN
        -- Flag ALL qualifying cards as winners
        UPDATE dbo.Cards
        SET    Card_IsWinner = 1
        WHERE  Card_ID IN (SELECT Card_ID FROM @BlackoutWinners);

        -- Update Game record.
        -- Game_WinnerCard_ID stores the lowest Card_ID as the
        -- primary winner; all tied winners are visible in the
        -- result set below.
        UPDATE dbo.Game
        SET    Game_WinnerCard_ID = (SELECT MIN(Card_ID) FROM @BlackoutWinners),
               Game_Status        = 'Complete',
               Game_EndTime       = SYSDATETIME()
        WHERE  Game_ID = @Game_ID;

        -- Return one row per winning card.
        -- Winning_Pattern is always 'Blackout' here; included
        -- so the result set stays consistent with all other
        -- CheckForWinner procs and the caller needs no special casing.
        SELECT
            @Game_ID                AS Game_ID,
            w.Card_ID               AS Winning_Card_ID,
            'Blackout'              AS Winning_Pattern,
            c.Card_PlayerName       AS Player_Name,
            c.Card_PlayerEmail      AS Player_Email,
            'BINGO! Blackout!'      AS Result
        FROM        @BlackoutWinners w
        INNER JOIN  dbo.Cards        c ON c.Card_ID = w.Card_ID
        ORDER BY    w.Card_ID;
    END
    ELSE
    BEGIN
        -- No card has all 25 squares called yet; game continues
        SELECT
            @Game_ID        AS Game_ID,
            NULL            AS Winning_Card_ID,
            'Blackout'      AS Winning_Pattern,
            NULL            AS Player_Name,
            NULL            AS Player_Email,
            'No winner yet' AS Result;
    END;

END;


--A few notes specific to this one:

--All 25 squares explicit — every square is listed individually, grouped by column with comments, so it's immediately clear what's being checked and nothing can accidentally be missed.
--FREE space comment on N3 — called out inline at the Sq_N3_Called line as a reminder that it's always 1, meaning a true Blackout only needs 24 actual song calls to land on a given card.
--No CROSS APPLY, no aggregation — like the 4 Corners proc, a single WHERE clause is all that's needed. Keeping it simple makes it the fastest of the four procs to execute.
--Consistent result set shape — same columns as all three sibling procs so your front end or DJ dashboard can call any of the four variants and handle the response identically.