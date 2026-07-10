/****** Script for SelectTopNRows command from SSMS  ******/

use haloimag_djgogi
  select * from [dbo].[CallList_Master]


EXEC usp_Get_CallList_SongCountByInning @Call_List_ID = 5, @Inning = NULL

-- Just inning 2 for call list 5
EXEC usp_Get_CallList_SongCountByInning @Call_List_ID = 5, @Inning = 2



  SELECT *
  FROM [haloimag_djgogi].[dbo].[Game]