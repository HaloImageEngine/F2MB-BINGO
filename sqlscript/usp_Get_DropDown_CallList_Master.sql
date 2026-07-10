-- =============================================
-- Author:		William D Beaty
-- Create Date:	2026-05-01
-- Description:	Retrieves a lightweight record set from
--              CallList_Master intended for use in dropdown/
--              select list controls. Returns only Call_List_ID,
--              Call_List_Name, and a combined display field that
--              concatenates Call_List_Name + Game_ID into the
--              Call_List_Description alias for easy binding.
-- =============================================
-- How It Works:
--   1. Accepts an optional @IsActive parameter to filter by
--      active (1), inactive (0), or all records (NULL).
--   2. Selects only the three fields needed for a dropdown:
--        - Call_List_ID        (the value/key field)
--        - Call_List_Name      (the display label)
--        - Call_List_Description (computed: Call_List_Name
--          + ' - Game ID: ' + Game_ID for a richer label)
--   3. Applies the IsActive filter only when @IsActive is provided.
--   4. Orders results by Call_List_Name ASC for easy scanning
--      in a dropdown list.
--   5. If any error occurs, the CATCH block raises the error
--      back to the caller.
-- =============================================

CREATE PROCEDURE [dbo].[usp_Get_DropDown_CallList_Master]
    @IsActive   BIT = 1     -- NULL = All Records | 1 = Active Only | 0 = Inactive Only
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Retrieve Dropdown Records
    -- =============================================
    BEGIN TRY

        SELECT
            [Call_List_ID],
            [Call_List_Name],
            [Call_List_Name] + ' - Game ID: ' + CAST([Game_ID] AS VARCHAR(10)) AS [Call_List_Description]
        FROM
            [dbo].[CallList_Master]
        WHERE
            (@IsActive IS NULL OR [Call_List_IsActive] = @IsActive)
        ORDER BY
            [Call_List_Name] ASC;

    END TRY
    BEGIN CATCH

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

---- 1) Return ALL records (active and inactive)
--EXEC [dbo].[usp_Get_DropDown_CallList_Master]
--    @IsActive = NULL;

---- 2) Return ACTIVE records only (default behavior)
EXEC [dbo].[usp_Get_DropDown_CallList_Master];

---- 3) Return INACTIVE records only
--EXEC [dbo].[usp_Get_DropDown_CallList_Master]
--    @IsActive = 0;