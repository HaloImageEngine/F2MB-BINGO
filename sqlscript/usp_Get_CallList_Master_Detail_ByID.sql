-- =============================================
-- Author:		William D Beaty
-- Create Date:	2026-05-01
-- Description:	Retrieves a single CallList_Master record by
--              Call_List_ID along with all of its associated
--              child song records from CallList_Songs.
--              Intended for use on a detail/edit view where
--              the full master + child data is needed.
-- =============================================
-- How It Works:
--   1. Accepts @Call_List_ID as a required parameter.
--   2. Validates that @Call_List_ID is not NULL.
--   3. Verifies the Call_List_ID exists in CallList_Master.
--      If not found, raises a descriptive error.
--   4. Returns Result Set 1 — the single CallList_Master
--      header record with all columns.
--   5. Returns Result Set 2 — all associated CallList_Songs
--      child records tied to that Call_List_ID, ordered
--      by artist ASC then title ASC.
--   6. If any error occurs, the CATCH block raises the error
--      back to the caller.
-- =============================================

CREATE PROCEDURE [dbo].[usp_Get_CallList_Master_Detail_ByID]
    @Call_List_ID   INT
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

    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[CallList_Master]
        WHERE [Call_List_ID] = @Call_List_ID
    )
    BEGIN
        RAISERROR('No CallList_Master record was found for the provided Call_List_ID: %d.', 16, 1, @Call_List_ID);
        RETURN;
    END

    -- =============================================
    -- Retrieve Records
    -- =============================================
    BEGIN TRY

        -- -----------------------------------------
        -- Result Set 1: Master Header Record
        -- -----------------------------------------
        SELECT
            [Call_List_ID],
            [Call_List_Name],
            [Call_List_Date],
            [Call_List_Description],
            [Game_ID],
            [Call_List_Genre],
            [Call_List_Decade],
            [Call_List_Era],
            [Call_List_SongCount],
            [Call_List_IsActive],
            [Call_List_CreatedAt],
            [Call_List_UpdatedAt]
        FROM
            [dbo].[CallList_Master]
        WHERE
            [Call_List_ID] = @Call_List_ID;

        -- -----------------------------------------
        -- Result Set 2: Child Song Records
        -- -----------------------------------------
        SELECT
            [song_id],
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
        FROM
            [dbo].[CallList_Songs]
        WHERE
            [Call_List_ID] = @Call_List_ID
        ORDER BY
            [artist] ASC,
            [title]  ASC;

    END TRY
    BEGIN CATCH

        DECLARE @ErrorMessage  NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT            = ERROR_SEVERITY();
        DECLARE @ErrorState    INT            = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);

    END CATCH

END
GO


---- =============================================
---- TEST EXECs
---- =============================================

---- 1) Return detail for a valid Call_List_ID
EXEC [dbo].[usp_Get_CallList_Master_Detail_ByID]
    @Call_List_ID = 1;

---- 2) Test with a Call_List_ID that does not exist (expects error)
--EXEC [dbo].[usp_Get_CallList_Master_Detail_ByID]
--    @Call_List_ID = 9999;

---- 3) Test with NULL (expects validation error)
--EXEC [dbo].[usp_Get_CallList_Master_Detail_ByID]
--    @Call_List_ID = NULL;