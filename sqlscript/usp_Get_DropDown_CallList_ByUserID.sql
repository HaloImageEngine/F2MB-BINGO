-- =============================================
-- Author:      
-- Create Date: 
-- Description: Retrieves Call List dropdown data filtered by User ID.
--              Returns Call_List_ID, Game_ID, and User_ID from
--              CallList_Master for use in dropdown binding.
-- Parameters:  @User_ID INT - The ID of the user whose call lists
--              should be retrieved.
-- Modified:    
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_DropDown_CallList_ByUserID]
    @User_ID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Retrieve call list records for the specified user
    SELECT 
        [Call_List_ID],  -- Primary key identifier for the call list
        [Game_ID],       -- Associated game for this call list
        [User_ID]        -- Owner of the call list
    FROM [dbo].[CallList_Master]
    WHERE [User_ID] = @User_ID;  -- Filter results to the requesting user only

END