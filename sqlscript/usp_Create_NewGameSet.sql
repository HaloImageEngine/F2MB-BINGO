USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_Create_NewGameSet]    Script Date: 4/25/2026 8:48:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER PROCEDURE [dbo].[usp_Create_NewGameSet]
    @GN_ID           INT,
    @Number_Of_Games INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate GN_ID exists in GameNight
    IF NOT EXISTS (SELECT 1 FROM dbo.GameNight WHERE GN_ID = @GN_ID)
    BEGIN
        RAISERROR('GN_ID %d does not exist in GameNight.', 16, 1, @GN_ID);
        RETURN;
    END

    -- Validate Number_Of_Games is between 1 and 5
    IF @Number_Of_Games < 1 OR @Number_Of_Games > 5
    BEGIN
        RAISERROR('Number_Of_Games must be between 1 and 5.', 16, 1);
        RETURN;
    END

    -- Prevent duplicate game sets for same GN_ID
    IF EXISTS (SELECT 1 FROM dbo.Game WHERE GN_ID = @GN_ID)
    BEGIN
        RAISERROR('Games already exist for GN_ID %d.', 16, 1, @GN_ID);
        RETURN;
    END

    -- Insert one row per game number
    DECLARE @i INT = 1;

    WHILE @i <= @Number_Of_Games
    BEGIN
        INSERT INTO dbo.Game (
            GN_ID,
            Game_Number,
            Game_Name,
            Game_StartTime,
            Game_EndTime,
            Game_WinPattern,
            Game_WinnerCard_ID,
            Game_Status,
            Game_CreatedAt
        )
        VALUES (
            @GN_ID,
            @i,
            'Game ' + CAST(@i AS VARCHAR(2)),  -- e.g. 'Game 1', 'Game 2'
            NULL,                               -- Game_StartTime: set when game begins
            NULL,                               -- Game_EndTime:   set when game ends
            'Line',                             -- Game_WinPattern default
            NULL,                               -- Game_WinnerCard_ID: set when someone wins
            'Pending',                          -- Game_Status default (matches CHK constraint)
            SYSDATETIME()                       -- Game_CreatedAt
        );

        SET @i += 1;
    END;

    -- Return the newly created game rows
    SELECT
        Game_ID,
        GN_ID,
        Game_Number,
        Game_Name,
        Game_Status,
        Game_CreatedAt
    FROM dbo.Game
    WHERE GN_ID = @GN_ID
    ORDER BY Game_Number;

END;
