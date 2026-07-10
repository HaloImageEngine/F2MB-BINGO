-- =============================================
-- Author:		William D Beaty
-- Create Date:	2026-05-01
-- Description:	Inserts a new song record into the CallList_Songs table.
--              This is the child record tied to a parent CallList_Master
--              record via Call_List_ID. Validates that the parent
--              Call_List_ID exists and is active before inserting.
--              Returns the newly generated Song_ID.
-- =============================================
-- How It Works:
--   1. Accepts all relevant CallList_Songs fields as parameters.
--   2. Validates that required fields (@Call_List_ID, @title, @artist)
--      are not NULL or empty.
--   3. Verifies the parent Call_List_ID exists in CallList_Master
--      and that the Call_List is currently active (IsActive = 1).
--   4. Inserts the new song row into [dbo].[CallList_Songs].
--   5. Returns the newly created song_id via SCOPE_IDENTITY().
--   6. If any error occurs, the CATCH block rolls back and raises the error.
-- =============================================

CREATE PROCEDURE [dbo].[usp_Insert_CallListSong]
    @Call_List_ID       INT,
    @title              NVARCHAR(255),
    @artist             NVARCHAR(255),
    @featured_artist    NVARCHAR(255)   = NULL,
    @lead_vocalist      NVARCHAR(255)   = NULL,
    @artist_type        VARCHAR(20)     = NULL,
    @genre              VARCHAR(100)    = NULL,
    @explicit           BIT             = 0,
    @release_year       SMALLINT        = NULL,
    @decade             VARCHAR(5)      = NULL,
    @era                VARCHAR(10)     = NULL,
    @last_played        DATETIME2(7)    = NULL,
    @NewSongID          INT             OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Validation
    -- =============================================
    IF @Call_List_ID IS NULL
    BEGIN
        RAISERROR('Call_List_ID is required and cannot be NULL.', 16, 1);
        RETURN;
    END

    IF @title IS NULL OR LTRIM(RTRIM(@title)) = ''
    BEGIN
        RAISERROR('Song title is required and cannot be empty.', 16, 1);
        RETURN;
    END

    IF @artist IS NULL OR LTRIM(RTRIM(@artist)) = ''
    BEGIN
        RAISERROR('Artist is required and cannot be empty.', 16, 1);
        RETURN;
    END

    -- =============================================
    -- Verify Parent Record Exists and Is Active
    -- =============================================
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[CallList_Master]
        WHERE [Call_List_ID] = @Call_List_ID
    )
    BEGIN
        RAISERROR('The provided Call_List_ID does not exist in CallList_Master.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[CallList_Master]
        WHERE [Call_List_ID] = @Call_List_ID
          AND [Call_List_IsActive] = 1
    )
    BEGIN
        RAISERROR('The provided Call_List_ID exists but is not currently active. Cannot add songs to an inactive Call List.', 16, 1);
        RETURN;
    END

    -- =============================================
    -- Insert & Error Handling
    -- =============================================
    BEGIN TRY
        BEGIN TRANSACTION;

            INSERT INTO [dbo].[CallList_Songs]
            (
                [Call_List_ID],
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
            VALUES
            (
                @Call_List_ID,
                @title,
                @artist,
                @featured_artist,
                @lead_vocalist,
                @artist_type,
                @genre,
                @explicit,
                @release_year,
                @decade,
                @era,
                @last_played
            );

            -- Capture the newly generated identity value
            SET @NewSongID = SCOPE_IDENTITY();

            -- =============================================
            -- Update the SongCount on the Parent Record
            -- =============================================
            UPDATE [dbo].[CallList_Master]
            SET    [Call_List_SongCount] = [Call_List_SongCount] + 1,
                   [Call_List_UpdatedAt] = GETDATE()
            WHERE  [Call_List_ID] = @Call_List_ID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage  NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT            = ERROR_SEVERITY();
        DECLARE @ErrorState    INT            = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH

END
GO


-- =============================================
-- TEST EXEC
-- =============================================
DECLARE @NewSongID INT;



SELECT @NewSongID AS NewlyInserted_Song_ID;