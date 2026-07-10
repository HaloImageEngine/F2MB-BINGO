/*==============================================================================
* Stored Procedure: usp_Get_Game_Winners
*==============================================================================
* Description:
*   Retrieves all winning call list records for a specified game.
*   Returns winner information including card details, patterns, and timing.
*
* Parameters:
*   @gameid (INT/UNIQUEIDENTIFIER) - The unique identifier for the game
*
* Returns:
*   Result set containing all winners for the specified game with columns:
*   - Call_List_Winner_ID
*   - Game_ID
*   - Call_List_ID
*   - Inning
*   - Call_List_WinningCard
*   - Call_List_WinningPatter
*   - Call_List_CreatedAt
*   - Call_List_UpdatedAt
*   - NumofSongsCalled
*
* Author: [Your Name]
* Created: [Current Date]
* Modified: [Current Date]
*
* Example Usage:
*   EXEC usp_Get_Game_Winners @gameid = 12345
*
* Notes:
*   - Returns all matching records (no TOP limitation)
*   - Ensure @gameid matches the data type of Game_ID column in CallList_Winner table
*==============================================================================*/

CREATE PROCEDURE usp_Get_Game_Winners_Results
    @gameid INT  -- Adjust data type as needed (INT, BIGINT, UNIQUEIDENTIFIER, etc.)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Retrieve all winners for the specified game
        SELECT 
            [Call_List_Winner_ID],
            [Game_ID],
            [Call_List_ID],
            [Inning],
            [Call_List_WinningCard],
            [Call_List_WinningPatter],
            [Call_List_CreatedAt],
            [Call_List_UpdatedAt],
            [NumofSongsCalled]
        FROM [haloimag_djgogi].[dbo].[CallList_Winner]
        WHERE Game_ID = @gameid
        ORDER BY [Call_List_CreatedAt];  -- Optional: Order by creation time
        
    END TRY
    BEGIN CATCH
        -- Error handling
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
    
END
GO