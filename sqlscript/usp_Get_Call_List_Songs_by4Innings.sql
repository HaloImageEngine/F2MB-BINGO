/*==============================================================================
* Stored Procedure: usp_Get_Call_List_Songs_by4Innings
*==============================================================================
* Description:
*   Retrieves songs from the CallList_Songs table grouped by innings.
*   Returns 4 separate result sets, one for each inning (1-4).
*
* Parameters:
*   @Game_ID (INT) - The game identifier (for validation/reference)
*   @Call_List_ID (INT) - The call list identifier to filter songs
*
* Returns:
*   Four result sets:
*   - Result Set 1: All songs for Inning 1
*   - Result Set 2: All songs for Inning 2
*   - Result Set 3: All songs for Inning 3
*   - Result Set 4: All songs for Inning 4
*
*   Each result set contains:
*   - CL_Song_ID
*   - Inning
*   - Call_List_ID
*   - song_id
*   - title
*   - artist
*   - featured_artist
*   - lead_vocalist
*   - artist_type
*   - genre
*   - explicit
*   - release_year
*   - decade
*   - era
*   - last_played
*
* Author: [Your Name]
* Created: [Current Date]
* Modified: [Current Date]
*
* Example Usage:
*   EXEC usp_Get_Call_List_Songs_by4Innings 
*       @Game_ID = 12345, 
*       @Call_List_ID = 67890
*
* Notes:
*   - Each result set is independent and represents songs for a specific inning
*   - If an inning has no songs, that result set will be empty
*   - CallList_Songs table does not contain Game_ID; parameter included for 
*     potential validation against parent tables if needed
*==============================================================================*/

CREATE PROCEDURE dbo.usp_Get_Call_List_Songs_by4Innings
    @Game_ID INT,
    @Call_List_ID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        
        -- Result Set 1: Inning 1
        SELECT 
            [CL_Song_ID],
            [Inning],
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
        FROM [dbo].[CallList_Songs]
        WHERE [Call_List_ID] = @Call_List_ID
            AND [Inning] = 1
        ORDER BY [CL_Song_ID];
        
        -- Result Set 2: Inning 2
        SELECT 
            [CL_Song_ID],
            [Inning],
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
        FROM [dbo].[CallList_Songs]
        WHERE [Call_List_ID] = @Call_List_ID
            AND [Inning] = 2
        ORDER BY [CL_Song_ID];
        
        -- Result Set 3: Inning 3
        SELECT 
            [CL_Song_ID],
            [Inning],
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
        FROM [dbo].[CallList_Songs]
        WHERE [Call_List_ID] = @Call_List_ID
            AND [Inning] = 3
        ORDER BY [CL_Song_ID];
        
        -- Result Set 4: Inning 4
        SELECT 
            [CL_Song_ID],
            [Inning],
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
        FROM [dbo].[CallList_Songs]
        WHERE [Call_List_ID] = @Call_List_ID
            AND [Inning] = 4
        ORDER BY [CL_Song_ID];
        
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