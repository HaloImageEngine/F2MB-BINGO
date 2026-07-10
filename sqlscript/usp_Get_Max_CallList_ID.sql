-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-05-04
-- Description: Retrieves the maximum Game_ID 
--              from the Game table in the 
--              haloimag_djgogi database.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_Max_CallList_ID]
AS
BEGIN
    -- Prevent extra result sets from interfering
    -- with SELECT statements
    SET NOCOUNT ON;

    BEGIN TRY
        -- ----------------------------------------
        -- Retrieve the highest Game_ID value
        -- from the Game table. Returns a single
        -- scalar value representing the latest /
        -- largest Game_ID in the dataset.
        -- ----------------------------------------
        SELECT MAX([Call_List_ID]) AS CallList_ID
        FROM [haloimag_djgogi].[dbo].[CallLIst_Master];

    END TRY
    BEGIN CATCH
        -- ----------------------------------------
        -- Error handling: surface any runtime
        -- errors with meaningful context.
        -- ----------------------------------------
        SELECT
            ERROR_NUMBER()    AS ErrorNumber,
            ERROR_SEVERITY()  AS ErrorSeverity,
            ERROR_STATE()     AS ErrorState,
            ERROR_PROCEDURE() AS ErrorProcedure,
            ERROR_LINE()      AS ErrorLine,
            ERROR_MESSAGE()   AS ErrorMessage;
    END CATCH;
END;
GO