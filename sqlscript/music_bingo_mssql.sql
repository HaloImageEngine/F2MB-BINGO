-- ============================================================
--  Music Bingo - Song Database
--  Target: Microsoft SQL Server 2017 / 2019 / 2022 (T-SQL)
--  Created: 2026-04-20
-- ============================================================

-- Create the database (run this separately if needed)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'MusicBingo')
BEGIN
    CREATE DATABASE MusicBingo;
END
GO

USE MusicBingo;
GO

-- ------------------------------------------------------------
--  BINGO_CATEGORIES lookup table
-- ------------------------------------------------------------
IF OBJECT_ID('dbo.bingo_categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.bingo_categories (
        category_id     INT             NOT NULL IDENTITY(1,1),
        [name]          VARCHAR(100)    NOT NULL,
        [description]   VARCHAR(255)    NULL,

        CONSTRAINT PK_bingo_categories PRIMARY KEY (category_id),
        CONSTRAINT UQ_bingo_categories_name UNIQUE ([name])
    );

    INSERT INTO dbo.bingo_categories ([name], [description]) VALUES
        ('One-Hit Wonder',      'Artists known for a single famous track'),
        ('Dancefloor Filler',   'High-energy tracks guaranteed to fill the floor'),
        ('Wedding Classic',     'Timeless songs heard at every wedding'),
        ('Karaoke Anthem',      'Crowd-pleasing singalong favourites'),
        ('TV Theme',            'Iconic television theme songs'),
        ('Movie Soundtrack',    'Songs from popular film soundtracks'),
        ('Holiday Hit',         'Seasonal and Christmas songs'),
        ('Viral Hit',           'Songs that blew up on social media'),
        ('Power Ballad',        'Big emotional rock or pop ballads'),
        ('Summer Anthem',       'Songs that defined a summer season');
END
GO

-- ------------------------------------------------------------
--  SONGS table
-- ------------------------------------------------------------
IF OBJECT_ID('dbo.songs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.songs (

        -- Core identity
        song_id                 INT             NOT NULL IDENTITY(1,1),
        title                   NVARCHAR(255)   NOT NULL,
        artist                  NVARCHAR(255)   NOT NULL,
        featured_artist         NVARCHAR(255)   NULL,
        lead_vocalist           NVARCHAR(255)   NULL,

        -- Artist type
        artist_type             VARCHAR(20)     NULL
            CONSTRAINT CHK_artist_type CHECK (
                artist_type IN ('solo','duo','band','supergroup','dj_producer','choir','other')
            ),
        is_cover                BIT             NOT NULL DEFAULT 0,
        is_instrumental         BIT             NOT NULL DEFAULT 0,

        -- Genre & classification
        genre                   VARCHAR(100)    NULL,
        subgenre                VARCHAR(100)    NULL,
        mood                    VARCHAR(50)     NULL,
        tempo                   VARCHAR(10)     NULL
            CONSTRAINT CHK_tempo CHECK (
                tempo IN ('slow','medium','fast','dance')
            ),
        bpm                     SMALLINT        NULL,
        [language]              VARCHAR(50)     NULL DEFAULT 'English',
        explicit                BIT             NOT NULL DEFAULT 0,

        -- Time & era
        release_year            SMALLINT        NULL,       -- e.g. 1975
        decade                  VARCHAR(5)      NULL
            CONSTRAINT CHK_decade CHECK (
                decade IN ('40s','50s','60s','70s','80s','90s','00s','10s','20s')
            ),
        era                     VARCHAR(10)     NULL
            CONSTRAINT CHK_era CHECK (
                era IN ('Classic','Retro','Modern','Current')
            ),
        streaming_era           VARCHAR(20)     NULL
            CONSTRAINT CHK_streaming_era CHECK (
                streaming_era IN ('pre_streaming','post_streaming')
            ),

        -- Bingo game fields
        bingo_category          VARCHAR(100)    NULL,
        difficulty              VARCHAR(10)     NULL DEFAULT 'medium'
            CONSTRAINT CHK_difficulty CHECK (
                difficulty IN ('easy','medium','hard')
            ),
        play_count              INT             NOT NULL DEFAULT 0,
        last_played             DATETIME2       NULL,
        active                  BIT             NOT NULL DEFAULT 1,

        -- Charts & metadata
        chart_peak_position     TINYINT         NULL,       -- 1 = number one
        chart_country           VARCHAR(10)     NULL DEFAULT 'UK',
        spotify_popularity      TINYINT         NULL,       -- 0-100
        duration_seconds        SMALLINT        NULL,

        -- Record timestamps
        created_at              DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at              DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_songs PRIMARY KEY (song_id)
    );
END
GO

-- ------------------------------------------------------------
--  Trigger to auto-update updated_at on row changes
-- ------------------------------------------------------------
IF OBJECT_ID('dbo.trg_songs_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_songs_updated_at;
GO

CREATE TRIGGER dbo.trg_songs_updated_at
ON dbo.songs
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.songs
    SET updated_at = SYSUTCDATETIME()
    FROM dbo.songs s
    INNER JOIN inserted i ON s.song_id = i.song_id;
END
GO

-- ------------------------------------------------------------
--  Indexes for common bingo search queries
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_artist'        AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_artist        ON dbo.songs (artist);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_title'         AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_title         ON dbo.songs (title);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_genre'         AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_genre         ON dbo.songs (genre);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_era'           AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_era           ON dbo.songs (era);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_decade'        AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_decade        ON dbo.songs (decade);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_bingo_cat'     AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_bingo_cat     ON dbo.songs (bingo_category);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_difficulty'    AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_difficulty    ON dbo.songs (difficulty);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_last_played'   AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_last_played   ON dbo.songs (last_played);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_active'        AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_active        ON dbo.songs (active);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_songs_genre_era'     AND object_id = OBJECT_ID('dbo.songs'))
    CREATE INDEX IX_songs_genre_era     ON dbo.songs (genre, era);
GO

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

-- ------------------------------------------------------------
--  Quick verification
-- ------------------------------------------------------------
SELECT
    song_id,
    title,
    artist,
    genre,
    decade,
    era,
    bingo_category,
    difficulty,
    active
FROM dbo.songs
ORDER BY release_year;
GO
