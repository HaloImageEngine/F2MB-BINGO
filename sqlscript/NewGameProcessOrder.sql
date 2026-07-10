EXEC usp_Create_NewGameNight
    @GN_Name = 'Saturday Night Bingo',
    @GN_Date = '2026-04-26';

	EXEC dbo.usp_Create_NewGameSet
    @GN_ID           = 1,
    @Number_Of_Games = 5;


	EXEC dbo.usp_GenerateBingoCards
    @Game_ID = 1,
    @CardCount = 200,
    @PlaylistSize = 15;

EXEC dbo.usp_CallSong
    @Game_ID = 1,
    @Song_ID = 42;

EXEC dbo.usp_CallSong
    @Game_ID = 1,
    @Song_ID = 40;

EXEC dbo.usp_CallSong
    @Game_ID = 1,
    @Song_ID = 34;

 EXEC dbo.usp_CallSong
    @Game_ID = 1,
    @Song_ID = 28;