EXEC [dbo].[usp_Clear_All_CalledFlags] @Game_ID = 1

GO

EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 31;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 11;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 5;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 12;

EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 39;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 14;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 36;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 2;

EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 8;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 21;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 15;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 32;

EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 33;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 26;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 28;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 27;

EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 43;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 37;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 35;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 45;

EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 44;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 55;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 51;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 87;

EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 43;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 37;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 35;
EXEC [dbo].[usp_CallSong] @Game_ID = 1,  @Song_ID = 45;



EXEC [dbo].[usp_Get_Top_Cards]	@Game_ID = 1, @NOT = 5
EXEC [dbo].[usp_CheckForWinner] @Game_ID = 1








select * from Test_Songs