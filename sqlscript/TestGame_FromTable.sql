EXEC [dbo].[usp_Clear_All_CalledFlags] @Game_ID = 1

GO

DECLARE @Game_ID INT = 1;
DECLARE @Song_ID INT;

DECLARE song_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT Song_ID 
    FROM dbo.Test_Songs 
    WHERE Game_ID = @Game_ID
    ORDER BY Song_ID;          -- Optional: for consistent order

OPEN song_cursor;
FETCH NEXT FROM song_cursor INTO @Song_ID;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT CONCAT('Calling usp_CallSong -> Game_ID: ', @Game_ID, ', Song_ID: ', @Song_ID);
    
    EXEC [dbo].[usp_CallSong] 
        @Game_ID = @Game_ID,
        @Song_ID = @Song_ID;

    FETCH NEXT FROM song_cursor INTO @Song_ID;
END

CLOSE song_cursor;
DEALLOCATE song_cursor;

PRINT 'Finished calling usp_CallSong 20 times with unique songs.';

EXEC [dbo].[usp_CheckForWinner] @Game_ID = 1