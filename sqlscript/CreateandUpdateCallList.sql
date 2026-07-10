-- Step 1: Create the master list
EXEC dbo.usp_Create_NewCallList
    @Call_List_Name        = '80s Night',
    @Call_List_Date        = '2026-04-26',
    @Call_List_Description = 'Best of the 80s',
    @Call_List_Genre       = 'Pop',
    @Call_List_Decade      = '80s',
    @Call_List_Era         = 'Classic';

-- Step 2: Add songs using the returned Call_List_ID
EXEC dbo.usp_Add_CallList_Song
    @Call_List_ID = 1,
    @title        = 'Take On Me',
    @artist       = 'a-ha',
    @genre        = 'Pop',
    @explicit     = 0,
    @release_year = 1985,
    @decade       = '80s',
    @era          = 'Classic';

EXEC dbo.usp_Add_CallList_Song
    @Call_List_ID = 1,
    @title        = 'Sweet Child O Mine',
    @artist       = 'Guns N Roses',
    @genre        = 'Rock',
    @explicit     = 0,
    @release_year = 1987,
    @decade       = '80s',
    @era          = 'Classic';