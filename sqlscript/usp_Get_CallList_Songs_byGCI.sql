/*==============================================================================
Stored Procedure: usp_Get_CallList_Songs_byGCI
Description:      Retrieves call list songs for a specific game, call list, 
                  and inning combination
Author:           William D Beaty
Created Date:     2026-05-09
Modified Date:    2026-05-09
================================================================================
Parameters:
    @Game_ID        INT - The unique identifier for the game
    @Call_List_ID   INT - The unique identifier for the call list
    @Inning         INT - The inning number to filter songs
    
Returns:
    Result set containing song details including inning, IDs, title, artist,
    genre, release information, and last played date
    
Example Usage:
    EXEC usp_Get_CallList_Songs_byGCI 
        @Game_ID = 100, 
        @Call_List_ID = 50, 
        @Inning = 7
        
Revision History:
    Date        Author          Description
    ----------  --------------  ------------------------------------------------
    2026-05-09  [Your Name]     Initial creation
==============================================================================*/
CREATE PROCEDURE [dbo].[usp_Get_CallList_Songs_byGCI]
    @Game_ID INT,
    @Call_List_ID INT,
    @Inning INT
AS
BEGIN
    -- Set NOCOUNT to ON to prevent extra result sets from interfering
    -- with SELECT statements
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Validate input parameters
        IF @Call_List_ID IS NULL
        BEGIN
            RAISERROR('Call_List_ID parameter cannot be NULL', 16, 1);
            RETURN;
        END
        
        IF @Inning IS NULL OR @Inning < 1
        BEGIN
            RAISERROR('Inning parameter must be a positive integer', 16, 1);
            RETURN;
        END
        
        -- Retrieve call list songs for the specified game, call list, and inning
        -- Returns key song information for display or processing
        SELECT 
            [Inning],
            [Call_List_ID],
            [song_id],
            [title],
            [artist],
            [genre],
            [release_year],
            [decade],
            [era],
            [last_played]
        FROM 
            [dbo].[CallList_Songs]
        WHERE 
            [Call_List_ID] = @Call_List_ID
            AND [Inning] = @Inning
        ORDER BY 
            [CL_Song_ID]; -- Order by primary key for consistent results
            
    END TRY
    BEGIN CATCH
        -- Error handling: capture and return error information
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
    
END
GO