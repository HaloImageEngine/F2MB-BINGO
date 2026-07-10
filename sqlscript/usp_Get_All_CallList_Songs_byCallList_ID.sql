
-- =============================================
-- Author: William D Beaty     
-- Create Date: 
-- Description: Retrieves all songs from the CallList_Songs table
--              for a given Call List ID.
--
-- Parameters:
--   @Call_List_ID INT - The ID of the call list to retrieve songs for.
--
-- Returns:
--   A result set containing all song records associated with the
--   specified Call_List_ID, ordered by song_id ascending.
--
-- Usage Example:
--   EXEC [dbo].[usp_Get_All_CallList_Songs_byCallList_ID] @Call_List_ID = 1;
--
-- How It Works:
--   1. Accepts a single input parameter (@Call_List_ID) representing
--      the unique identifier of a call list in CallList_Master.
--   2. Queries the CallList_Songs table and filters all rows where
--      the Call_List_ID column matches the provided parameter.
--   3. Returns all columns for the matching song records, ordered
--      by song_id to ensure a consistent, predictable result order.
--
-- Notes:
--   - SET NOCOUNT ON suppresses the "N rows affected" message,
--     reducing unnecessary network traffic from the server.
--   - If no songs exist for the given @Call_List_ID, an empty
--     result set is returned (no error is raised).
--   - The @Call_List_ID should correspond to a valid record in
--     the CallList_Master table (enforced via FK relationship).
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_All_CallList_Songs_byCallList_ID]
    @Call_List_ID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.[song_id],
        s.[Call_List_ID],
        s.[title],
        s.[artist],
        s.[featured_artist],
        s.[lead_vocalist],
        s.[artist_type],
        s.[genre],
        s.[explicit],
        s.[release_year],
        s.[decade],
        s.[era],
        s.[last_played]
    FROM [dbo].[CallList_Songs] s
    WHERE s.[Call_List_ID] = @Call_List_ID
    ORDER BY s.[song_id];

END