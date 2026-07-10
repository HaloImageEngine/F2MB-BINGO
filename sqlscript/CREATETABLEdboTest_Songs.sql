-- Drop table if it already exists
DROP TABLE IF EXISTS dbo.Test_Songs;

-- Create the table
CREATE TABLE dbo.Test_Songs
(
    Game_ID   INT NOT NULL,
    Song_ID   INT NOT NULL,
    PRIMARY KEY (Game_ID, Song_ID)   -- This prevents duplicates
);

-- Insert 20 unique Song_IDs between 1 and 30 for Game_ID = 1
INSERT INTO dbo.Test_Songs (Game_ID, Song_ID)
VALUES 
    (1, 3), (1, 7), (1, 12), (1, 15), (1, 18),
    (1, 21), (1, 24), (1, 25), (1, 27), (1, 30),
    (1, 2), (1, 8), (1, 11), (1, 14), (1, 19),
    (1, 22), (1, 26), (1, 28), (1, 29), (1, 5);

PRINT 'Table Test_Songs created successfully with 20 unique songs for Game_ID = 1';