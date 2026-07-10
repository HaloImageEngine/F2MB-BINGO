USE [haloimag_djgogi]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-05-08
-- Description: Updates a song record by Song ID.
--              Requires @song_id.
--              Updates last_played every time.
--              Updates genre, decade, and era only when values are provided.
-- =============================================
-- How It Works:
--   1. Accepts @song_id, @genre, @decade, @era, and @last_played.
--   2. Validates that @song_id is provided.
--   3. Validates that the Song ID exists.
--   4. Always updates last_played.
--   5. If genre, decade, or era are NULL, existing values are preserved.
--   6. Updates updated_at automatically using SYSDATETIME().
-- =============================================
CREATE  PROCEDURE [dbo].[usp_Update_Song_bySongID]
(
    @song_id     INT,
    @genre       VARCHAR(100) = NULL,
    @decade      VARCHAR(10) = NULL,
    @era         VARCHAR(50) = NULL,
    @last_played DATETIME2(7)
)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY

        -- Validate required Song ID
        IF @song_id IS NULL
        BEGIN
            RAISERROR('Song ID is required.', 16, 1);
            RETURN;
        END

        -- Validate Song Exists
        IF NOT EXISTS (
            SELECT 1
            FROM [dbo].[songs]
            WHERE [song_id] = @song_id
        )
        BEGIN
            RAISERROR('Song ID does not exist.', 16, 1);
            RETURN;
        END

        -- Update Song
        UPDATE [dbo].[songs]
        SET
            [genre] = CASE 
                        WHEN @genre IS NULL THEN [genre]
                        ELSE @genre
                      END,

            [decade] = CASE 
                         WHEN @decade IS NULL THEN [decade]
                         ELSE @decade
                       END,

            [era] = CASE 
                      WHEN @era IS NULL THEN [era]
                      ELSE @era
                    END,

            [last_played] = @last_played,
            [updated_at] = SYSDATETIME()
        WHERE
            [song_id] = @song_id;

        -- Return Success Message
        SELECT
            1 AS Success,
            'Song updated successfully.' AS Message,
            @song_id AS SongID;

    END TRY
    BEGIN CATCH

        -- Return Error Information
        SELECT
            0 AS Success,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_LINE() AS ErrorLine;

    END CATCH
END
GO