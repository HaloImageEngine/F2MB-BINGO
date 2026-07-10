USE [haloimag_djgogi]
GO

DECLARE	@return_value int,
		@New_Game_ID int

EXEC	@return_value = [dbo].[usp_Insert_NewGame]
		@User_ID = 1039,
		@Call_List_ID = 4,
		@Game_Number = 37,
		@Game_Inning = 2,
		@Game_Name = N'First Game zo2',
		@New_Game_ID = @New_Game_ID OUTPUT

SELECT	@New_Game_ID as N'@New_Game_ID'

SELECT	'Return Value' = @return_value

GO

--truncate table Game
