USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_Complete_CallList_Songs_by_CallListandInning]    Script Date: 5/28/2026 11:16:58 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- Stored Procedure : dbo.usp_Complete_CallList_Songs_by_CallListandInning
-- Database         : haloimag_djgogi
-- Author           : William D Beaty
-- Created          : May 8, 2026
-- Modified         : May 8, 2026
-- ============================================================
-- DESCRIPTION:
--   Ensures a specific Call List and Inning combination has
--   exactly 70 songs by adding random songs from the songs
--   table filtered by genre. If the call list already has
--   70 or more songs, no action is taken.
--
-- PARAMETERS:
--   @Call_List_ID   INT          -- The Call List ID to populate
--   @Inning         INT          -- The Inning number to populate
--   @Genre          VARCHAR(100) -- Genre filter for selecting
--                                -- additional songs from the
--                                -- songs table
--
-- HOW IT WORKS:
--   Step 1 - Count Existing Songs:
--     Queries CallList_Songs to count how many songs currently
--     exist for the given @Call_List_ID and @Inning combination.
--
--   Step 2 - Calculate Needed Songs:
--     Target is 70 songs total. If current count is less than
--     70, calculates the difference (e.g., 70 - 20 = 50 needed).
--     If already at or above 70, sets needed to 0.
--
--   Step 3 - Insert Additional Songs:
--     If songs are needed, randomly selects that many songs
--     from the songs table filtered by @Genre and inserts them
--     into CallList_Songs with the specified @Call_List_ID and
--     @Inning values. Uses NEWID() for random selection to
--     ensure variety. Data is truncated to fit column sizes.
--
--   Step 4 - Verify Final Count:
--     Recounts CallList_Songs for the given combination to
--     verify we now have exactly 70 (or more) songs.
--
-- USAGE:
--   EXEC dbo.usp_Complete_CallList_Songs_by_CallListandInning
--       @Call_List_ID = 26,
--       @Inning       = 1,
--       @Genre        = 'Pop';
--
-- RETURNS:
--   Single row summary:
--     - Call_List_ID        : The Call List ID processed
--     - Inning              : The Inning number processed
--     - Genre               : Genre filter used
--     - InitialCount        : Songs before processing
--     - SongsNeeded         : Number of songs needed to reach 70
--     - SongsAdded          : Actual number of songs inserted
--     - FinalCount          : Total songs after processing
--     - TargetMet           : 'YES' if >= 70, 'NO' otherwise
--     - StatusMessage       : Description of action taken
--
-- ERROR CONDITIONS:
--   - No songs available in songs table for specified genre
--   - Not enough songs in songs table to reach target of 70
--   - Database connection issues during insert
--
-- ASSUMPTIONS:
--   - The songs table exists with columns matching CallList_Songs
--   - The songs table has an 'active' flag or similar filter
--   - Songs in the songs table have the genre field populated
--
-- CHANGE LOG:
--   May 8, 2026 - Initial version created
--   May 8, 2026 - Added data truncation to prevent truncation errors
-- ============================================================

ALTER PROCEDURE [dbo].[usp_Complete_CallList_Songs_by_CallListandInning]
    @Call_List_ID   INT,
    @Inning         INT,
    @Genre          VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Declare variables
    ------------------------------------------------------------
    DECLARE @TargetCount    INT = 70;
    DECLARE @InitialCount   INT;
    DECLARE @SongsNeeded    INT;
    DECLARE @SongsAdded     INT;
    DECLARE @FinalCount     INT;
    DECLARE @AvailableSongs INT;

    ------------------------------------------------------------
    -- Step 1: Count existing songs in CallList_Songs
    ------------------------------------------------------------
    SELECT @InitialCount = COUNT(*)
    FROM [dbo].[CallList_Songs]
    WHERE [Call_List_ID] = @Call_List_ID
      AND [Inning] = @Inning;

    ------------------------------------------------------------
    -- Step 2: Calculate how many songs we need to add
    ------------------------------------------------------------
    SET @SongsNeeded = @TargetCount - @InitialCount;

    -- If we already have enough songs, no action needed
    IF @SongsNeeded <= 0
    BEGIN
        SELECT
            @Call_List_ID    AS Call_List_ID,
            @Inning          AS Inning,
            @Genre           AS Genre,
            @InitialCount    AS InitialCount,
            0                AS SongsNeeded,
            0                AS SongsAdded,
            @InitialCount    AS FinalCount,
            'YES'            AS TargetMet,
            'Call List already has ' + CAST(@InitialCount AS VARCHAR(10)) + ' songs. No action needed.' AS StatusMessage;
        RETURN;
    END;

    ------------------------------------------------------------
    -- Verify we have enough songs available in songs table
    ------------------------------------------------------------
    SELECT @AvailableSongs = COUNT(*)
    FROM [dbo].[songs]
    WHERE [genre] = @Genre
      AND [active] = 1
      AND [song_id] NOT IN (
          SELECT [song_id]
          FROM [dbo].[CallList_Songs]
          WHERE [Call_List_ID] = @Call_List_ID
            AND [Inning] = @Inning
            AND [song_id] IS NOT NULL
      );

    IF @AvailableSongs < @SongsNeeded
    BEGIN
        RAISERROR('Not enough songs available in genre ''%s''. Need %d songs but only %d available.', 16, 1, @Genre, @SongsNeeded, @AvailableSongs);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Step 3: Insert random songs from songs table by genre
    -- Note: Data is truncated to fit CallList_Songs column sizes
    ------------------------------------------------------------
    BEGIN TRY
        INSERT INTO [dbo].[CallList_Songs]
        (
            [Inning],
			[GeneratedCode],
            [Call_List_ID],
            [song_id],
            [title],
            [artist],
            [featured_artist],
            [lead_vocalist],
            [artist_type],
            [genre],
            [explicit],
            [release_year],
            [decade],
            [era],
            [last_played]

        )
        SELECT TOP (@SongsNeeded)
            @Inning,
			'AUT',
            @Call_List_ID,
            s.[song_id],
            LEFT(s.[title], 255),                    -- Truncate to nvarchar(255)
            LEFT(s.[artist], 255),                   -- Truncate to nvarchar(255)
            LEFT(s.[featured_artist], 255),          -- Truncate to nvarchar(255)
            LEFT(s.[lead_vocalist], 255),            -- Truncate to nvarchar(255)
            LEFT(s.[artist_type], 20),               -- Truncate to varchar(20)
            LEFT(s.[genre], 100),                    -- Truncate to varchar(100)
            s.[explicit],
            s.[release_year],
            LEFT(s.[decade], 5),                     -- Truncate to varchar(5)
            LEFT(s.[era], 10),                       -- Truncate to varchar(10)
            s.[last_played]
        FROM [dbo].[songs] s
        WHERE s.[genre] = @Genre
          AND s.[active] = 1
          AND s.[song_id] NOT IN (
              -- Exclude songs already in this Call List and Inning
              SELECT [song_id]
              FROM [dbo].[CallList_Songs]
              WHERE [Call_List_ID] = @Call_List_ID
                AND [Inning] = @Inning
                AND [song_id] IS NOT NULL
          )
        ORDER BY NEWID();  -- Random selection

        SET @SongsAdded = @@ROWCOUNT;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR('Error inserting songs: %s', @ErrorSeverity, @ErrorState, @ErrorMessage);
        RETURN;
    END CATCH;

    ------------------------------------------------------------
    -- Step 4: Verify final count
    ------------------------------------------------------------
    SELECT @FinalCount = COUNT(*)
    FROM [dbo].[CallList_Songs]
    WHERE [Call_List_ID] = @Call_List_ID
      AND [Inning] = @Inning;

    ------------------------------------------------------------
    -- Return summary results
    ------------------------------------------------------------
    SELECT
        @Call_List_ID    AS Call_List_ID,
        @Inning          AS Inning,
        @Genre           AS Genre,
        @InitialCount    AS InitialCount,
        @SongsNeeded     AS SongsNeeded,
        @SongsAdded      AS SongsAdded,
        @FinalCount      AS FinalCount,
        CASE
            WHEN @FinalCount >= @TargetCount THEN 'YES'
            ELSE 'NO'
        END AS TargetMet,
        CASE
            WHEN @FinalCount >= @TargetCount THEN
                'Successfully added ' + CAST(@SongsAdded AS VARCHAR(10)) + ' songs. Target of ' + CAST(@TargetCount AS VARCHAR(10)) + ' reached.'
            ELSE
                'Added ' + CAST(@SongsAdded AS VARCHAR(10)) + ' songs but only reached ' + CAST(@FinalCount AS VARCHAR(10)) + ' total. Target not met.'
        END AS StatusMessage;

END;
