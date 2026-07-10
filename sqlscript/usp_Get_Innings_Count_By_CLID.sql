/*******************************************************************************
Stored Procedure: usp_Get_Innings_Count_By_CLID

Description:
    Retrieves the count of songs for each inning associated with a specific 
    Call List. This procedure groups songs by inning number and returns the 
    total count of songs scheduled for each inning.

Parameters:
    @Call_List_ID INT - The unique identifier for the Call List

Returns:
    Result set containing:
        - Inning: The inning number
        - Song_Count: The total number of songs scheduled for that inning

Usage Example:
    EXEC usp_Get_Innings_Count_By_CLID @Call_List_ID = 123;

Author: William D Beaty
Date Created: 5/11/2026
*******************************************************************************/

CREATE PROCEDURE [dbo].[usp_Get_Innings_Count_By_CLID]
    @Call_List_ID INT
AS
BEGIN
    -- Prevents the "rows affected" message from being returned
    SET NOCOUNT ON;
    
    -- Select inning and count of songs, grouped by inning
    SELECT 
        Inning,
        COUNT(*) AS Song_Count
    FROM 
        [dbo].[CallList_Songs]
    WHERE 
        Call_List_ID = @Call_List_ID  -- Filter by the specified Call List
    GROUP BY 
        Inning  -- Group results by inning number
    ORDER BY 
        Inning;  -- Sort results by inning in ascending order
END
GO