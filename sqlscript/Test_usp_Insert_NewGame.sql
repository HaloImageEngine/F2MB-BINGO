-- =============================================
-- Author:      DBA / Developer
-- Create Date: 2026-05-04
-- Description: Mockup / Seed data to test the
--              usp_Insert_NewGame stored proc.
--              Covers happy path, optional NULLs,
--              win patterns, statuses,
--              and error/edge cases.
--              NOTE: Tests assume GameNight seed
--              data has already been inserted
--              and valid GN_IDs exist (1-7).
-- =============================================

-- ----------------------------------------
-- Setup: variable to capture each new Game_ID
-- ----------------------------------------
DECLARE @NewGameID INT;

-- ============================================
-- TEST 1: Full record - all fields populated
--         Active game with a winner already set
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 1,
    @Game_Number        = 11,
    @Game_Name          = 'Early Bird Special',
    @Game_StartTime     = '2026-05-09 18:00:00',
    @Game_EndTime       = '2026-05-09 18:22:00',
    @Game_WinPattern    = 'Full House',
    @Game_WinnerCard_ID = 101,
    @Game_Status        = 'Completed',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test1_FullRecord_Game_ID];

-- ============================================
-- TEST 2: Game in progress
--         No end time or winner yet
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 1,
    @Game_Number        = 2,
    @Game_Name          = 'Main Game - Round 1',
    @Game_StartTime     = '2026-05-09 18:30:00',
    @Game_EndTime       = NULL,
    @Game_WinPattern    = 'Single Line',
    @Game_WinnerCard_ID = NULL,
    @Game_Status        = 'Active',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test2_GameInProgress_Game_ID];

-- ============================================
-- TEST 3: Pending game - not yet started
--         No start time, end time, or winner
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 1,
    @Game_Number        = 3,
    @Game_Name          = 'Main Game - Round 2',
    @Game_StartTime     = NULL,
    @Game_EndTime       = NULL,
    @Game_WinPattern    = 'Four Corners',
    @Game_WinnerCard_ID = NULL,
    @Game_Status        = 'Pending',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test3_PendingGame_Game_ID];

-- ============================================
-- TEST 4: Cancelled game
--         Game was scheduled but called off
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 1,
    @Game_Number        = 4,
    @Game_Name          = 'Bonus Round',
    @Game_StartTime     = NULL,
    @Game_EndTime       = NULL,
    @Game_WinPattern    = 'T-Shape',
    @Game_WinnerCard_ID = NULL,
    @Game_Status        = 'Cancelled',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test4_CancelledGame_Game_ID];

-- ============================================
-- TEST 5: Minimal record - no optional fields
--         Only required fields supplied
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 2,
    @Game_Number        = 1,
    @Game_Name          = NULL,
    @Game_StartTime     = NULL,
    @Game_EndTime       = NULL,
    @Game_WinPattern    = NULL,
    @Game_WinnerCard_ID = NULL,
    @Game_Status        = 'Pending',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test5_MinimalRecord_Game_ID];

-- ============================================
-- TEST 6: Different win pattern - L-Shape
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 3,
    @Game_Number        = 1,
    @Game_Name          = 'Championship Opener',
    @Game_StartTime     = '2026-06-01 19:00:00',
    @Game_EndTime       = '2026-06-01 19:18:00',
    @Game_WinPattern    = 'L-Shape',
    @Game_WinnerCard_ID = 204,
    @Game_Status        = 'Completed',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test6_LShapeWinPattern_Game_ID];

-- ============================================
-- TEST 7: Different win pattern - X Pattern
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 3,
    @Game_Number        = 2,
    @Game_Name          = 'Championship Round 2',
    @Game_StartTime     = '2026-06-01 19:30:00',
    @Game_EndTime       = '2026-06-01 19:55:00',
    @Game_WinPattern    = 'X Pattern',
    @Game_WinnerCard_ID = 317,
    @Game_Status        = 'Completed',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test7_XPatternWinPattern_Game_ID];

-- ============================================
-- TEST 8: Different win pattern - Blackout
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 3,
    @Game_Number        = 3,
    @Game_Name          = 'Championship Grand Finale',
    @Game_StartTime     = '2026-06-01 20:00:00',
    @Game_EndTime       = '2026-06-01 20:45:00',
    @Game_WinPattern    = 'Blackout',
    @Game_WinnerCard_ID = 512,
    @Game_Status        = 'Completed',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test8_BlackoutWinPattern_Game_ID];

-- ============================================
-- TEST 9: Small private game night games
--         Multiple games for GN_ID = 5
-- ============================================
EXEC [dbo].[usp_Insert_NewGame]
    @GN_ID              = 5,
    @Game_Number        = 1,
    @Game_Name          = 'Warm Up Round',
    @Game_StartTime     = '2026-05-15 19:00:00',
    @Game_EndTime       = '2026-05-15 19:10:00',
    @Game_WinPattern    = 'Single Line',
    @Game_WinnerCard_ID = 008,
    @Game_Status        = 'Completed',
    @New_Game_ID        = @NewGameID OUTPUT;
SELECT @NewGameID AS [Test9_PrivateNight_Game1_ID];