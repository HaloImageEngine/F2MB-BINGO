-- ============================================================
-- Find duplicate songs by Title + Artist
-- SQL Server 2014 compatible
-- ============================================================

;WITH DuplicateSongs AS
(
    SELECT
        title,
        artist,
        COUNT(*) AS Duplicate_Count
    FROM dbo.songs
    GROUP BY
        title,
        artist
    HAVING COUNT(*) > 1
)
SELECT
    s.song_id,
    s.title,
    s.artist,
    s.featured_artist,
    s.lead_vocalist,
    s.genre,
    s.subgenre,
    s.release_year,
    s.decade,
    s.bingo_category,
    s.active,
    s.created_at,
    s.updated_at,
    d.Duplicate_Count
FROM dbo.songs s
INNER JOIN DuplicateSongs d
    ON s.title = d.title
   AND s.artist = d.artist
ORDER BY
    s.title,
    s.artist,
    s.song_id;