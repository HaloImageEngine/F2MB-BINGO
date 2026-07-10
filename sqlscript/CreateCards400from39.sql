
Use all active songs
EXEC dbo.usp_GenerateBingoCards
    @Game_ID = 1,
    @CardCount = 400,
    @PlaylistSize = 39;

-- Filter by bingo category
EXEC dbo.usp_GenerateBingoCards
    @Game_ID = 1,
    @CardCount = 100,
    @PlaylistSize = 15,
    @BingoCategory = '80s Rock';

-- Filter by genre
EXEC dbo.usp_GenerateBingoCards
    @Game_ID = 1,
    @CardCount = 100,
    @PlaylistSize = 15,
    @Genre = 'Country';


-- Filter by decade
	EXEC dbo.usp_GenerateBingoCards
    @Game_ID = 1,
    @CardCount = 100,
    @PlaylistSize = 15,
    @Decade = '1990';


--Filter by category and genre together

EXEC dbo.usp_GenerateBingoCards
    @Game_ID = 1,
    @CardCount = 75,
    @PlaylistSize = 15,
    @BingoCategory = 'Party',
    @Genre = 'Pop';

-- Exclude explicit songs
EXEC dbo.usp_GenerateBingoCards
    @Game_ID = 1,
    @CardCount = 100,
    @PlaylistSize = 15,
    @ExcludeExplicit = 1;

-- Full combined example
	EXEC dbo.usp_GenerateBingoCards
    @Game_ID = 1,
    @CardCount = 50,
    @PlaylistSize = 15,
    @BingoCategory = 'Dance',
    @Genre = 'Pop',
    @Decade = '1980',
    @ExcludeExplicit = 1,
    @ExcludeInstrumental = 1;

use haloimag_djgogi
SELECT
    s.song_id,
    s.title,
    s.artist,
    s.genre,
    s.decade,
    s.bingo_category
FROM dbo.songs s
WHERE s.active = 1
  AND  bingo_category = 'Dancefloor Filler'
  AND ('Pop' IS NULL OR s.genre = 'Pop')
  AND ('80s' IS NULL OR s.decade = '80s')
ORDER BY s.artist, s.title;