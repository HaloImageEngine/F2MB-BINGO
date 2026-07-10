-- ------------------------------------------------------------
--  Sample data
-- ------------------------------------------------------------
INSERT INTO dbo.songs (
    title, artist, artist_type, genre, subgenre, mood,
    tempo, release_year, decade, era,
    bingo_category, difficulty, chart_peak_position,
    chart_country, spotify_popularity, duration_seconds, active
) VALUES
    ('Bohemian Rhapsody',   'Queen',             'band',   'Rock', 'Classic Rock', 'Epic',      'slow',   1975, '70s', 'Classic', 'Karaoke Anthem',   'easy',   1,  'UK', 92, 354, 1),
    ('Rolling in the Deep', 'Adele',             'solo',   'Pop',  'Soul Pop',     'Powerful',  'medium', 2010, '10s', 'Modern',  'Wedding Classic',  'easy',   1,  'UK', 88, 228, 1),
    ('Happy',               'Pharrell Williams', 'solo',   'Pop',  'Neo Soul',     'Happy',     'fast',   2013, '10s', 'Modern',  'Dancefloor Filler','easy',   1,  'US', 85, 233, 1),
    ('Blinding Lights',     'The Weeknd',        'solo',   'Pop',  'Synth Pop',    'Energetic', 'fast',   2019, '10s', 'Current', 'Dancefloor Filler','medium', 1,  'US', 91, 200, 1),
    ('Mr. Brightside',      'The Killers',       'band',   'Rock', 'Indie Rock',   'Energetic', 'fast',   2003, '00s', 'Retro',   'Karaoke Anthem',   'medium', 10, 'UK', 83, 222, 1);
GO