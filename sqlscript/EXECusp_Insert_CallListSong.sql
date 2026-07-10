DECLARE @NewSongID INT;

EXEC [dbo].[usp_Insert_CallListSong]
    @Call_List_ID       = 1,
    @title              = 'In My Feelings',
    @artist             = 'Drake',
    @featured_artist    = NULL,
    @lead_vocalist      = 'Drake',
    @artist_type        = 'Solo',
    @genre              = 'Hip-Hop',
    @explicit           = 1,
    @release_year       = 2018,
    @decade             = '2010s',
    @era                = 'Modern',
    @last_played        = NULL,
    @NewSongID          = @NewSongID OUTPUT;

SELECT @NewSongID AS NewlyInserted_Song_ID;