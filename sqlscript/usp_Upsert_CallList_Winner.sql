USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_Upsert_CallList_Winner]    Script Date: 5/15/2026 6:47:27 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- Stored Procedure : dbo.usp_UpsertCallListWinner
-- Database         : haloimag_djgogi
-- Author           : William D Beaty
-- Created          : May 13, 2026
-- Modified         : May 15, 2026 - Added NumofSongsCalled and Call_List_WinningPatter parameters
-- ============================================================
-- DESCRIPTION:
--   Inserts or updates a winner record in the CallList_Winner
--   table. This proc tracks which card won for a specific
--   Game, Call List, and Inning combination, along with the
--   winning pattern and number of songs called when the win occurred.
--
--   If a record already exists for the given Game_ID,
--   Call_List_ID, and Inning, the winning card, pattern, and
--   song count are updated and the UpdatedAt timestamp is
--   refreshed. If no record exists, a new one is inserted with
--   the current timestamp.
--
--   This is an "upsert" operation — UPDATE if exists, INSERT
--   if not — ensuring exactly one winner record per unique
--   Game/CallList/Inning combination.
--
-- PARAMETERS:
--   @Game_ID                  INT          -- The Game this winner belongs to
--   @Call_List_ID             INT          -- The Call List used for this game
--   @Inning                   INT          -- The Inning number (1, 2, 3, etc.)
--   @Call_List_WinningCard    INT          -- The Card_ID of the winning card
--   @Call_List_WinningPatter  VARCHAR(100) -- The winning pattern (e.g., 'Blackout', '2-Line', '4-Corners')
--   @NumofSongsCalled         INT          -- Number of songs called when win occurred
--
-- HOW IT WORKS:
--   1. Checks if a record exists with the given Game_ID,
--      Call_List_ID, and Inning combination
--   2. If EXISTS:
--      - UPDATE the Call_List_WinningCard to the new value
--      - UPDATE the Call_List_WinningPatter to the new value
--      - UPDATE the NumofSongsCalled to the new value
--      - Set Call_List_UpdatedAt to current timestamp
--   3. If NOT EXISTS:
--      - INSERT a new record with all provided values
--      - Set Call_List_CreatedAt to current timestamp
--   4. Return a result message indicating action taken
--
-- USAGE:
--   -- Record a Blackout winner for Game 1, Call List 5, Inning 3
--   EXEC [dbo].[usp_UpsertCallListWinner]
--       @Game_ID                  = 1,
--       @Call_List_ID             = 5,
--       @Inning                   = 3,
--       @Call_List_WinningCard    = 42,
--       @Call_List_WinningPatter  = 'Blackout',
--       @NumofSongsCalled         = 15;
--
--   -- Record a 2-Line winner
--   EXEC [dbo].[usp_UpsertCallListWinner]
--       @Game_ID                  = 1,
--       @Call_List_ID             = 5,
--       @Inning                   = 4,
--       @Call_List_WinningCard    = 89,
--       @Call_List_WinningPatter  = '2-Line',
--       @NumofSongsCalled         = 22;
--
--   -- Update an existing record with a different winning card
--   EXEC [dbo].[usp_UpsertCallListWinner]
--       @Game_ID                  = 1,
--       @Call_List_ID             = 5,
--       @Inning                   = 3,
--       @Call_List_WinningCard    = 67,
--       @Call_List_WinningPatter  = 'Blackout',
--       @NumofSongsCalled         = 18;
--
-- RETURNS:
--   A single-row result set with a 'Result' column:
--     - 'Record inserted' : A new winner record was created
--     - 'Record updated'  : An existing record was updated
--
-- TYPICAL CALL SEQUENCE:
--   This proc is typically called from the CheckForWinner
--   stored procedures after a winning card is identified:
--
--   1. EXEC usp_CallSong                  -- DJ plays a song
--   2. EXEC usp_CheckForWinner_Blackout   -- Check for winner
--   3. EXEC usp_UpsertCallListWinner      -- Record the winner
--
-- RELATED PROCEDURES:
--   usp_CheckForWinner_Blackout   -- Detects Blackout winners
--   usp_CheckForWinner_2Line      -- Detects 2-line winners
--   usp_CheckForWinner_4Corners   -- Detects 4-corner winners
--   usp_CheckForWinner            -- Detects standard winners
--
-- ERROR CONDITIONS:
--   None currently raised. If foreign key constraints are
--   enabled on the table, invalid Game_ID, Call_List_ID,
--   or Call_List_WinningCard values will fail at the
--   database level.
--
-- NOTES:
--   - The natural key for this table is the combination of
--     Game_ID + Call_List_ID + Inning. Only one winner per
--     unique combination is allowed.
--   - Call_List_CreatedAt has a DEFAULT constraint of
--     SYSDATETIME() on the table, but we set it explicitly
--     here for clarity and consistency.
--   - Call_List_UpdatedAt is NULL on insert and only gets
--     a value when the record is updated.
--   - Common winning patterns include:
--     * 'Blackout'    - All squares covered
--     * '2-Line'      - Two complete lines
--     * '4-Corners'   - Four corner squares
--     * 'Standard'    - Traditional bingo pattern
--
-- CHANGE LOG:
--   May 13, 2026 - Initial version created
--   May 15, 2026 - Added NumofSongsCalled and Call_List_WinningPatter parameters
-- ============================================================
ALTER PROCEDURE [dbo].[usp_Upsert_CallList_Winner]
    @Game_ID                  INT,
    @Call_List_ID             INT,
    @Inning                   INT,
    @Call_List_WinningCard    INT,
    @Call_List_WinningPatter  VARCHAR(100),
    @NumofSongsCalled         INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Check if a record already exists for this Game/CallList/Inning
    -- combination. The natural key is Game_ID + Call_List_ID + Inning.
    ------------------------------------------------------------
    IF EXISTS (
        SELECT 1 
        FROM [dbo].[CallList_Winner]
        WHERE [Game_ID]       = @Game_ID
          AND [Call_List_ID]  = @Call_List_ID
          AND [Inning]        = @Inning
    )
    BEGIN
        ------------------------------------------------------------
        -- Record exists — UPDATE the winning card, pattern, song count, and timestamp
        ------------------------------------------------------------
        UPDATE [dbo].[CallList_Winner]
        SET    [Call_List_WinningCard]   = @Call_List_WinningCard,
               [Call_List_WinningPatter] = @Call_List_WinningPatter,
               [NumofSongsCalled]        = @NumofSongsCalled,
               [Call_List_UpdatedAt]     = SYSDATETIME()
        WHERE  [Game_ID]       = @Game_ID
          AND  [Call_List_ID]  = @Call_List_ID
          AND  [Inning]        = @Inning;

        -- Return success message
        SELECT 'Record updated' AS Result;
    END
    ELSE
    BEGIN
        ------------------------------------------------------------
        -- Record does not exist — INSERT a new winner record
        ------------------------------------------------------------
        INSERT INTO [dbo].[CallList_Winner] (
            [Game_ID],
            [Call_List_ID],
            [Inning],
            [Call_List_WinningCard],
            [Call_List_WinningPatter],
            [NumofSongsCalled],
            [Call_List_CreatedAt]
        )
        VALUES (
            @Game_ID,
            @Call_List_ID,
            @Inning,
            @Call_List_WinningCard,
            @Call_List_WinningPatter,
            @NumofSongsCalled,
            SYSDATETIME()
        );

        -- Return success message
        SELECT 'Record inserted' AS Result;
    END;

END;