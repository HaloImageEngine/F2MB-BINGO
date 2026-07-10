-- =============================================
-- TEST EXEC
-- =============================================
DECLARE @NewID INT;

EXEC [dbo].[usp_Insert_CallList_Master]
    @Call_List_Name        = 'Friday Night Hits',
    @Call_List_Date        = '2026-05-01',
    @Call_List_Description = 'A curated list of top Friday night party songs.',
    @Game_ID               = 101,
    @Call_List_Genre       = 'Hip-Hop',
    @Call_List_Decade      = '2000s',
    @Call_List_Era         = 'Modern',
    @Call_List_SongCount   = 25,
    @Call_List_IsActive    = 1,
    @NewCallListID         = @NewID OUTPUT;

select * from dbo.CallList_Master