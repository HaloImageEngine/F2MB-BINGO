USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Test_SongList]    Script Date: 4/25/2026 9:02:09 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


--DROP PROCEDURE IF EXISTS [dbo].[usp_Test_SongList]
--GO

-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-04-24
-- Description: Test harness for usp_CallSong. Simulates a DJ calling
--              20 songs during a Music Bingo game by executing
--              usp_CallSong once per song. Each call returns a summary
--              row showing how many cards were checked and matched.
--              Run usp_Clear_All_CalledFlags before this proc to ensure
--              a clean starting state.
--
-- Parameters:
--              @Game_ID  INT - The Game identifier to run the test against.
--
-- Example:     EXEC [dbo].[usp_Test_SongList] @Game_ID = 1
--
-- Change Log:
-- Date         Author          Description
-- ----------   ----------      -----------------------------------------------
-- 2026-04-24   DJGogi          Initial creation
-- =============================================
CREATE PROCEDURE [dbo].[usp_Test_SongList]
    @Game_ID    INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validate Game exists before running any calls
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Game WHERE Game_ID = @Game_ID)
    BEGIN
        RAISERROR('Game_ID %d does not exist.', 16, 1, @Game_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Create a temp table to capture each call's summary result
    ------------------------------------------------------------
    CREATE TABLE #TestResults
    (
        Call_Order      INT,
        Game_ID         INT,
        Song_ID         INT,
        Cards_Checked   INT,
        Cards_Matched   INT
    );

    ------------------------------------------------------------
    -- Declare a table to hold the 20 test Song IDs
    ------------------------------------------------------------
    DECLARE @SongList TABLE (Call_Order INT, Song_ID INT);

     INSERT INTO @SongList (Call_Order, Song_ID) VALUES
        ( 1,  10),
        ( 2,  6),
        ( 3,  18),
        ( 4,  24),
        ( 5,  27),
        ( 6,  1),
        ( 7,  38),
        ( 8,  16),
        ( 9,  25),
        (10, 8),
        (11, 29),
        (12, 30),
        (13, 42),
        (14, 31),
        (15, 39),
        (16, 21),
        (17, 17),
        (18, 18),
        (19, 19),
        (20, 20);

    ------------------------------------------------------------
    -- Loop through each song and execute usp_CallSong
    ------------------------------------------------------------
    DECLARE @CurrentOrder   INT;
    DECLARE @CurrentSongID  INT;
    DECLARE @ReturnValue    INT;

    DECLARE song_cursor CURSOR FOR
        SELECT Call_Order, Song_ID
        FROM @SongList
        ORDER BY Call_Order;

    OPEN song_cursor;
    FETCH NEXT FROM song_cursor INTO @CurrentOrder, @CurrentSongID;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Capture the result set from usp_CallSong into temp table
        INSERT INTO #TestResults (Game_ID, Song_ID, Cards_Checked, Cards_Matched)
            EXEC @ReturnValue = [dbo].[usp_CallSong]
                @Game_ID = @Game_ID,
                @Song_ID = @CurrentSongID;

        -- Stamp the call order since INSERT EXEC won't have it
        UPDATE #TestResults
        SET Call_Order = @CurrentOrder
        WHERE Call_Order IS NULL;

        FETCH NEXT FROM song_cursor INTO @CurrentOrder, @CurrentSongID;
    END;

    CLOSE song_cursor;
    DEALLOCATE song_cursor;

    ------------------------------------------------------------
    -- Return full test summary ordered by call sequence
    ------------------------------------------------------------
    SELECT
        Call_Order,
        Game_ID,
        Song_ID,
        Cards_Checked,
        Cards_Matched
    FROM #TestResults
    ORDER BY Call_Order;

    DROP TABLE #TestResults;

END

GO


