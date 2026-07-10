-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-05-03
-- Description: Retrieves all songs associated with a specific Call List
--              from the CallList_Songs table, ordered by song ID.
--              Pass @CallList_ID = 0 to return songs for the most
--              recently inserted Call List (MAX Call_List_ID).
-- =============================================
Alter PROCEDURE [dbo].[usp_Get_All_CallList_Songs_by_CallList_ID]
    @CallList_ID INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- If no ID supplied, default to the most recently inserted Call List
    IF @CallList_ID = 0
    BEGIN
        SELECT @CallList_ID = MAX(Call_List_ID)
        FROM [haloimag_djgogi].[dbo].[CallList_Master]
    END

    SELECT
	  s.[Call_List_ID]
	  ,s.[Inning] AS [inning]
	  ,[Song_ID]
      ,[title]
      ,[artist]
      ,[featured_artist]
 --     ,[lead_vocalist]
 --     ,[artist_type]
      ,[genre]
 --     ,[explicit]
      ,[release_year]
      ,[decade]
      ,[era]
      ,[last_played]
    FROM [haloimag_djgogi].[dbo].[CallList_Songs]   s
    INNER JOIN [haloimag_djgogi].[dbo].[CallList_Master] m
        ON s.Call_List_ID = m.Call_List_ID
    WHERE s.Call_List_ID = @CallList_ID
    ORDER BY s.Song_ID ASC;

END
GO