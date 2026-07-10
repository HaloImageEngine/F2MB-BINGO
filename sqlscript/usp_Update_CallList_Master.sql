-- =============================================
-- Author:		William D Beaty
-- Create Date:	2026-05-01
-- Description:	Updates an existing record in the CallList_Master
--              table by Call_List_ID. Only fields passed with a
--              non-NULL value will be updated. Fields passed as
--              NULL will retain their current database value.
--              Automatically stamps Call_List_UpdatedAt on
--              every successful update.
-- =============================================
-- How It Works:
--   1. Accepts @Call_List_ID as the required key to locate
--      the record to update.
--   2. Validates that @Call_List_ID is not NULL.
--   3. Verifies the Call_List_ID exists in CallList_Master.
--      If not found, raises a descriptive error.
--   4. Uses ISNULL(parameter, currentColumn) pattern in the
--      SET clause so that any parameter passed as NULL simply
--      falls back to the existing column value, leaving it
--      unchanged.
--   5. Always stamps [Call_List_UpdatedAt] with GETDATE()
--      on every update regardless of which fields changed.
--   6. Returns the number of rows affected for confirmation.
--   7. If any error occurs, the CATCH block rolls back and
--      raises the error back to the caller.
-- =============================================

CREATE PROCEDURE [dbo].[usp_Update_CallList_Master]
    @Call_List_ID           INT,
    @Call_List_Name         VARCHAR(150)    = NULL,
    @Call_List_Date         DATE            = NULL,
    @Call_List_Description  NVARCHAR(500)   = NULL,
    @Game_ID                INT             = NULL,
    @Call_List_Genre        VARCHAR(100)    = NULL,
    @Call_List_Decade       VARCHAR(5)      = NULL,
    @Call_List_Era          VARCHAR(10)     = NULL,
    @Call_List_SongCount    INT             = NULL,
    @Call_List_IsActive     BIT             = NULL
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

    -- Ensure Call_List_Name is not being set to an empty string
    IF @Call_List_Name IS NOT NULL AND LTRIM(RTRIM(@Call_List_Name)) = ''
    BEGIN
        RAISERROR('Call_List_Name cannot be set to an empty string.', 16, 1);
        RETURN;
    END

    -- =============================================
    -- Update & Error Handling
    -- =============================================
    BEGIN TRY
        BEGIN TRANSACTION;

            UPDATE [dbo].[CallList_Master]
            SET
                [Call_List_Name]        = ISNULL(@Call_List_Name,        [Call_List_Name]),
                [Call_List_Date]        = ISNULL(@Call_List_Date,        [Call_List_Date]),
                [Call_List_Description] = ISNULL(@Call_List_Description, [Call_List_Description]),
                [Game_ID]               = ISNULL(@Game_ID,               [Game_ID]),
                [Call_List_Genre]       = ISNULL(@Call_List_Genre,       [Call_List_Genre]),
                [Call_List_Decade]      = ISNULL(@Call_List_Decade,      [Call_List_Decade]),
                [Call_List_Era]         = ISNULL(@Call_List_Era,         [Call_List_Era]),
                [Call_List_SongCount]   = ISNULL(@Call_List_SongCount,   [Call_List_SongCount]),
                [Call_List_IsActive]    = ISNULL(@Call_List_IsActive,    [Call_List_IsActive]),
                [Call_List_UpdatedAt]   = GETDATE()
            WHERE
                [Call_List_ID] = @Call_List_ID;

            -- Return rows affected as confirmation
            SELECT @@ROWCOUNT AS RowsAffected;

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
-- TEST EXECs
-- =============================================

---- 1) Update ALL fields on Call_List_ID = 1
--EXEC [dbo].[usp_Update_CallList_Master]
--    @Call_List_ID           = 1,
--    @Call_List_Name         = 'Friday Night Hits - Updated',
--    @Call_List_Date         = '2026-06-01',
--    @Call_List_Description  = 'Updated description for Friday night party songs.',
--    @Game_ID                = 202,
--    @Call_List_Genre        = 'R&B',
--    @Call_List_Decade       = '2010s',
--    @Call_List_Era          = 'Modern',
--    @Call_List_SongCount    = 30,
--    @Call_List_IsActive     = 1;

---- 2) Update ONLY the Genre and Era — all other fields unchanged
--EXEC [dbo].[usp_Update_CallList_Master]
--    @Call_List_ID       = 1,
--    @Call_List_Genre    = 'Pop',
--    @Call_List_Era      = 'Classic';

---- 3) Deactivate a Call List only
--EXEC [dbo].[usp_Update_CallList_Master]
--    @Call_List_ID       = 1,
--    @Call_List_IsActive = 0;

---- 4) Test with a Call_List_ID that does not exist (expects error)
--EXEC [dbo].[usp_Update_CallList_Master]
--    @Call_List_ID       = 9999,
--    @Call_List_Name     = 'Ghost Record';

---- 5) Test with NULL Call_List_ID (expects validation error)
--EXEC [dbo].[usp_Update_CallList_Master]
--    @Call_List_ID       = NULL,
--    @Call_List_Name     = 'No ID Provided';