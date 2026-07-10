-- =============================================
-- Lookup Tables Creation Script
-- =============================================
-- This script:
-- 1. Creates lookup tables (if they do not exist)
-- 2. Inserts seed values (only if they do not already exist)
-- =============================================

SET NOCOUNT ON;

-- =============================================
-- Artist Type Lookup
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'lk_artist_type')
BEGIN
    CREATE TABLE dbo.lk_artist_type (
        artist_type_id INT IDENTITY(1,1) PRIMARY KEY,
        artist_type_name VARCHAR(20) NOT NULL UNIQUE
    );
END;

INSERT INTO dbo.lk_artist_type (artist_type_name)
SELECT v.artist_type_name
FROM (VALUES 
    ('solo'), ('duo'), ('band'), ('supergroup'), ('dj_producer'), ('choir'), ('other')
) v(artist_type_name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.lk_artist_type t WHERE t.artist_type_name = v.artist_type_name
);

-- =============================================
-- Tempo Lookup
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'lk_tempo')
BEGIN
    CREATE TABLE dbo.lk_tempo (
        tempo_id INT IDENTITY(1,1) PRIMARY KEY,
        tempo_name VARCHAR(10) NOT NULL UNIQUE
    );
END;

INSERT INTO dbo.lk_tempo (tempo_name)
SELECT v.tempo_name
FROM (VALUES 
    ('slow'), ('medium'), ('fast'), ('dance')
) v(tempo_name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.lk_tempo t WHERE t.tempo_name = v.tempo_name
);

-- =============================================
-- Decade Lookup
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'lk_decade')
BEGIN
    CREATE TABLE dbo.lk_decade (
        decade_id INT IDENTITY(1,1) PRIMARY KEY,
        decade_name VARCHAR(5) NOT NULL UNIQUE
    );
END;

INSERT INTO dbo.lk_decade (decade_name)
SELECT v.decade_name
FROM (VALUES 
    ('40s'), ('50s'), ('60s'), ('70s'), ('80s'), ('90s'), ('00s'), ('10s'), ('20s')
) v(decade_name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.lk_decade t WHERE t.decade_name = v.decade_name
);

-- =============================================
-- Era Lookup
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'lk_era')
BEGIN
    CREATE TABLE dbo.lk_era (
        era_id INT IDENTITY(1,1) PRIMARY KEY,
        era_name VARCHAR(10) NOT NULL UNIQUE
    );
END;

INSERT INTO dbo.lk_era (era_name)
SELECT v.era_name
FROM (VALUES 
    ('Classic'), ('Retro'), ('Modern'), ('Current')
) v(era_name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.lk_era t WHERE t.era_name = v.era_name
);

-- =============================================
-- Streaming Era Lookup
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'lk_streaming_era')
BEGIN
    CREATE TABLE dbo.lk_streaming_era (
        streaming_era_id INT IDENTITY(1,1) PRIMARY KEY,
        streaming_era_name VARCHAR(20) NOT NULL UNIQUE
    );
END;

INSERT INTO dbo.lk_streaming_era (streaming_era_name)
SELECT v.streaming_era_name
FROM (VALUES 
    ('pre_streaming'), ('post_streaming')
) v(streaming_era_name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.lk_streaming_era t WHERE t.streaming_era_name = v.streaming_era_name
);

-- =============================================
-- Difficulty Lookup
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'lk_difficulty')
BEGIN
    CREATE TABLE dbo.lk_difficulty (
        difficulty_id INT IDENTITY(1,1) PRIMARY KEY,
        difficulty_name VARCHAR(10) NOT NULL UNIQUE
    );
END;

INSERT INTO dbo.lk_difficulty (difficulty_name)
SELECT v.difficulty_name
FROM (VALUES 
    ('easy'), ('medium'), ('hard')
) v(difficulty_name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.lk_difficulty t WHERE t.difficulty_name = v.difficulty_name
);

-- =============================================
-- Done
-- =============================================
PRINT 'Lookup tables created and seeded successfully.';
GO