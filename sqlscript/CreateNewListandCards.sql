-- Step 1: Create a game night and game
EXEC dbo.usp_Create_NewGameNight
    @GN_Name = 'Saturday 80s Night',
    @GN_Date = '2026-04-26';

EXEC dbo.usp_Create_NewGameSet
    @GN_ID           = 1,
    @Number_Of_Games = 5;

-- Step 2: Create a call list and add songs
EXEC dbo.usp_Create_NewCallList
    @Call_List_Name = '80s Night',
    @Call_List_Date = '2026-04-26',
    @Call_List_Decade = '80s';

EXEC dbo.usp_Add_CallList_Song
    @Call_List_ID = 1,
    @title        = 'Take On Me',
    @artist       = 'a-ha',
    @decade       = '80s';

-- Step 3: Generate cards using the call list
EXEC dbo.usp_GenerateBingoCards_CallList
    @Game_ID      = 1,
    @Call_List_ID = 1,
    @CardCount    = 200,
    @PlaylistSize = 15;

-- Step 4: Run the game loop
EXEC dbo.usp_CallSong            @Game_ID = 1, @Song_ID = 1;
EXEC dbo.usp_CheckForWinner      @Game_ID = 1;