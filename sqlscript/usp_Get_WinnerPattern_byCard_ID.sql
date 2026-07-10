USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_WinnerPattern_byCard_ID]    Script Date: 4/25/2026 8:58:02 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


--DROP PROCEDURE IF EXISTS [dbo].[usp_Get_WinnerPattern_byCard_ID]
--GO

-- =============================================
-- Author:      William D Beaty
-- Create Date: 2026-04-24
-- Description: Diagnostic proc that inspects a single bingo card and
--              evaluates it against all 12 standard winning patterns.
--              For each pattern, it returns whether that pattern is a
--              winner, along with all 5 Song_IDs and their Called flags
--              for that pattern. Useful for verifying a card's win state
--              after usp_CallSong and usp_CheckForWinner have been run.
--
-- Parameters:
--              @Card_ID  INT - The Card identifier to inspect.
--
-- Returns:     One row per pattern (12 total) showing:
--                - Pattern name
--                - IsWinner flag (1 = winning pattern, 0 = not yet)
--                - Song_ID and Called flag for each of the 5 squares
--
-- Example:     EXEC [dbo].[usp_Get_WinnerPattern_byCard_ID] @Card_ID = 101
--
-- Change Log:
-- Date         Author          Description
-- ----------   ----------      -----------------------------------------------
-- 2026-04-24   DJGogi          Initial creation
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_WinnerPattern_byCard_ID]
    @Card_ID    INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validate Card exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Cards WHERE Card_ID = @Card_ID)
    BEGIN
        RAISERROR('Card_ID %d does not exist.', 16, 1, @Card_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Pull the card into variables for clean pattern evaluation
    ------------------------------------------------------------
    DECLARE
        -- B Column
        @Sq_B1 INT, @Sq_B1_Called BIT,
        @Sq_B2 INT, @Sq_B2_Called BIT,
        @Sq_B3 INT, @Sq_B3_Called BIT,
        @Sq_B4 INT, @Sq_B4_Called BIT,
        @Sq_B5 INT, @Sq_B5_Called BIT,
        -- I Column
        @Sq_I1 INT, @Sq_I1_Called BIT,
        @Sq_I2 INT, @Sq_I2_Called BIT,
        @Sq_I3 INT, @Sq_I3_Called BIT,
        @Sq_I4 INT, @Sq_I4_Called BIT,
        @Sq_I5 INT, @Sq_I5_Called BIT,
        -- N Column
        @Sq_N1 INT, @Sq_N1_Called BIT,
        @Sq_N2 INT, @Sq_N2_Called BIT,
        @Sq_N3 INT, @Sq_N3_Called BIT,   -- FREE SPACE always 1
        @Sq_N4 INT, @Sq_N4_Called BIT,
        @Sq_N5 INT, @Sq_N5_Called BIT,
        -- G Column
        @Sq_G1 INT, @Sq_G1_Called BIT,
        @Sq_G2 INT, @Sq_G2_Called BIT,
        @Sq_G3 INT, @Sq_G3_Called BIT,
        @Sq_G4 INT, @Sq_G4_Called BIT,
        @Sq_G5 INT, @Sq_G5_Called BIT,
        -- O Column
        @Sq_O1 INT, @Sq_O1_Called BIT,
        @Sq_O2 INT, @Sq_O2_Called BIT,
        @Sq_O3 INT, @Sq_O3_Called BIT,
        @Sq_O4 INT, @Sq_O4_Called BIT,
        @Sq_O5 INT, @Sq_O5_Called BIT;

    SELECT
        -- B Column
        @Sq_B1 = Sq_B1, @Sq_B1_Called = Sq_B1_Called,
        @Sq_B2 = Sq_B2, @Sq_B2_Called = Sq_B2_Called,
        @Sq_B3 = Sq_B3, @Sq_B3_Called = Sq_B3_Called,
        @Sq_B4 = Sq_B4, @Sq_B4_Called = Sq_B4_Called,
        @Sq_B5 = Sq_B5, @Sq_B5_Called = Sq_B5_Called,
        -- I Column
        @Sq_I1 = Sq_I1, @Sq_I1_Called = Sq_I1_Called,
        @Sq_I2 = Sq_I2, @Sq_I2_Called = Sq_I2_Called,
        @Sq_I3 = Sq_I3, @Sq_I3_Called = Sq_I3_Called,
        @Sq_I4 = Sq_I4, @Sq_I4_Called = Sq_I4_Called,
        @Sq_I5 = Sq_I5, @Sq_I5_Called = Sq_I5_Called,
        -- N Column
        @Sq_N1 = Sq_N1, @Sq_N1_Called = Sq_N1_Called,
        @Sq_N2 = Sq_N2, @Sq_N2_Called = Sq_N2_Called,
        @Sq_N3 = Sq_N3, @Sq_N3_Called = Sq_N3_Called,
        @Sq_N4 = Sq_N4, @Sq_N4_Called = Sq_N4_Called,
        @Sq_N5 = Sq_N5, @Sq_N5_Called = Sq_N5_Called,
        -- G Column
        @Sq_G1 = Sq_G1, @Sq_G1_Called = Sq_G1_Called,
        @Sq_G2 = Sq_G2, @Sq_G2_Called = Sq_G2_Called,
        @Sq_G3 = Sq_G3, @Sq_G3_Called = Sq_G3_Called,
        @Sq_G4 = Sq_G4, @Sq_G4_Called = Sq_G4_Called,
        @Sq_G5 = Sq_G5, @Sq_G5_Called = Sq_G5_Called,
        -- O Column
        @Sq_O1 = Sq_O1, @Sq_O1_Called = Sq_O1_Called,
        @Sq_O2 = Sq_O2, @Sq_O2_Called = Sq_O2_Called,
        @Sq_O3 = Sq_O3, @Sq_O3_Called = Sq_O3_Called,
        @Sq_O4 = Sq_O4, @Sq_O4_Called = Sq_O4_Called,
        @Sq_O5 = Sq_O5, @Sq_O5_Called = Sq_O5_Called
    FROM dbo.Cards
    WHERE Card_ID = @Card_ID;

    ------------------------------------------------------------
    -- Evaluate all 12 patterns and return results
    ------------------------------------------------------------
    SELECT
        @Card_ID        AS Card_ID,
        Pattern         AS Pattern_Name,
        IsWinner        AS Is_Winner,
        Sq1_Label       AS Square_1,
        Sq1_SongID      AS Song_ID_1,
        Sq1_Called      AS Called_1,
        Sq2_Label       AS Square_2,
        Sq2_SongID      AS Song_ID_2,
        Sq2_Called      AS Called_2,
        Sq3_Label       AS Square_3,
        Sq3_SongID      AS Song_ID_3,
        Sq3_Called      AS Called_3,
        Sq4_Label       AS Square_4,
        Sq4_SongID      AS Song_ID_4,
        Sq4_Called      AS Called_4,
        Sq5_Label       AS Square_5,
        Sq5_SongID      AS Song_ID_5,
        Sq5_Called      AS Called_5
    FROM
    (
        VALUES
        -- ── 5 Rows ───────────────────────────────────────────────────────────
        ('Row 1',
            CASE WHEN @Sq_B1_Called=1 AND @Sq_I1_Called=1 AND @Sq_N1_Called=1 AND @Sq_G1_Called=1 AND @Sq_O1_Called=1 THEN 1 ELSE 0 END,
            'B1', @Sq_B1, @Sq_B1_Called,
            'I1', @Sq_I1, @Sq_I1_Called,
            'N1', @Sq_N1, @Sq_N1_Called,
            'G1', @Sq_G1, @Sq_G1_Called,
            'O1', @Sq_O1, @Sq_O1_Called),

        ('Row 2',
            CASE WHEN @Sq_B2_Called=1 AND @Sq_I2_Called=1 AND @Sq_N2_Called=1 AND @Sq_G2_Called=1 AND @Sq_O2_Called=1 THEN 1 ELSE 0 END,
            'B2', @Sq_B2, @Sq_B2_Called,
            'I2', @Sq_I2, @Sq_I2_Called,
            'N2', @Sq_N2, @Sq_N2_Called,
            'G2', @Sq_G2, @Sq_G2_Called,
            'O2', @Sq_O2, @Sq_O2_Called),

        ('Row 3 (FREE)',
            CASE WHEN @Sq_B3_Called=1 AND @Sq_I3_Called=1 AND @Sq_N3_Called=1 AND @Sq_G3_Called=1 AND @Sq_O3_Called=1 THEN 1 ELSE 0 END,
            'B3', @Sq_B3, @Sq_B3_Called,
            'I3', @Sq_I3, @Sq_I3_Called,
            'N3', @Sq_N3, @Sq_N3_Called,
            'G3', @Sq_G3, @Sq_G3_Called,
            'O3', @Sq_O3, @Sq_O3_Called),

        ('Row 4',
            CASE WHEN @Sq_B4_Called=1 AND @Sq_I4_Called=1 AND @Sq_N4_Called=1 AND @Sq_G4_Called=1 AND @Sq_O4_Called=1 THEN 1 ELSE 0 END,
            'B4', @Sq_B4, @Sq_B4_Called,
            'I4', @Sq_I4, @Sq_I4_Called,
            'N4', @Sq_N4, @Sq_N4_Called,
            'G4', @Sq_G4, @Sq_G4_Called,
            'O4', @Sq_O4, @Sq_O4_Called),

        ('Row 5',
            CASE WHEN @Sq_B5_Called=1 AND @Sq_I5_Called=1 AND @Sq_N5_Called=1 AND @Sq_G5_Called=1 AND @Sq_O5_Called=1 THEN 1 ELSE 0 END,
            'B5', @Sq_B5, @Sq_B5_Called,
            'I5', @Sq_I5, @Sq_I5_Called,
            'N5', @Sq_N5, @Sq_N5_Called,
            'G5', @Sq_G5, @Sq_G5_Called,
            'O5', @Sq_O5, @Sq_O5_Called),

        -- ── 5 Columns ────────────────────────────────────────────────────────
        ('Col B',
            CASE WHEN @Sq_B1_Called=1 AND @Sq_B2_Called=1 AND @Sq_B3_Called=1 AND @Sq_B4_Called=1 AND @Sq_B5_Called=1 THEN 1 ELSE 0 END,
            'B1', @Sq_B1, @Sq_B1_Called,
            'B2', @Sq_B2, @Sq_B2_Called,
            'B3', @Sq_B3, @Sq_B3_Called,
            'B4', @Sq_B4, @Sq_B4_Called,
            'B5', @Sq_B5, @Sq_B5_Called),

        ('Col I',
            CASE WHEN @Sq_I1_Called=1 AND @Sq_I2_Called=1 AND @Sq_I3_Called=1 AND @Sq_I4_Called=1 AND @Sq_I5_Called=1 THEN 1 ELSE 0 END,
            'I1', @Sq_I1, @Sq_I1_Called,
            'I2', @Sq_I2, @Sq_I2_Called,
            'I3', @Sq_I3, @Sq_I3_Called,
            'I4', @Sq_I4, @Sq_I4_Called,
            'I5', @Sq_I5, @Sq_I5_Called),

        ('Col N',
            CASE WHEN @Sq_N1_Called=1 AND @Sq_N2_Called=1 AND @Sq_N3_Called=1 AND @Sq_N4_Called=1 AND @Sq_N5_Called=1 THEN 1 ELSE 0 END,
            'N1', @Sq_N1, @Sq_N1_Called,
            'N2', @Sq_N2, @Sq_N2_Called,
            'N3', @Sq_N3, @Sq_N3_Called,
            'N4', @Sq_N4, @Sq_N4_Called,
            'N5', @Sq_N5, @Sq_N5_Called),

        ('Col G',
            CASE WHEN @Sq_G1_Called=1 AND @Sq_G2_Called=1 AND @Sq_G3_Called=1 AND @Sq_G4_Called=1 AND @Sq_G5_Called=1 THEN 1 ELSE 0 END,
            'G1', @Sq_G1, @Sq_G1_Called,
            'G2', @Sq_G2, @Sq_G2_Called,
            'G3', @Sq_G3, @Sq_G3_Called,
            'G4', @Sq_G4, @Sq_G4_Called,
            'G5', @Sq_G5, @Sq_G5_Called),

        ('Col O',
            CASE WHEN @Sq_O1_Called=1 AND @Sq_O2_Called=1 AND @Sq_O3_Called=1 AND @Sq_O4_Called=1 AND @Sq_O5_Called=1 THEN 1 ELSE 0 END,
            'O1', @Sq_O1, @Sq_O1_Called,
            'O2', @Sq_O2, @Sq_O2_Called,
            'O3', @Sq_O3, @Sq_O3_Called,
            'O4', @Sq_O4, @Sq_O4_Called,
            'O5', @Sq_O5, @Sq_O5_Called),

        -- ── 2 Diagonals ──────────────────────────────────────────────────────
        ('Diag TL-BR',
            CASE WHEN @Sq_B1_Called=1 AND @Sq_I2_Called=1 AND @Sq_N3_Called=1 AND @Sq_G4_Called=1 AND @Sq_O5_Called=1 THEN 1 ELSE 0 END,
            'B1', @Sq_B1, @Sq_B1_Called,
            'I2', @Sq_I2, @Sq_I2_Called,
            'N3', @Sq_N3, @Sq_N3_Called,
            'G4', @Sq_G4, @Sq_G4_Called,
            'O5', @Sq_O5, @Sq_O5_Called),

        ('Diag TR-BL',
            CASE WHEN @Sq_O1_Called=1 AND @Sq_G2_Called=1 AND @Sq_N3_Called=1 AND @Sq_I4_Called=1 AND @Sq_B5_Called=1 THEN 1 ELSE 0 END,
            'O1', @Sq_O1, @Sq_O1_Called,
            'G2', @Sq_G2, @Sq_G2_Called,
            'N3', @Sq_N3, @Sq_N3_Called,
            'I4', @Sq_I4, @Sq_I4_Called,
            'B5', @Sq_B5, @Sq_B5_Called)

    ) AS Patterns
    (
        Pattern,
        IsWinner,
        Sq1_Label, Sq1_SongID, Sq1_Called,
        Sq2_Label, Sq2_SongID, Sq2_Called,
        Sq3_Label, Sq3_SongID, Sq3_Called,
        Sq4_Label, Sq4_SongID, Sq4_Called,
        Sq5_Label, Sq5_SongID, Sq5_Called
    )
    ORDER BY
        IsWinner DESC,  -- Winning patterns float to the top
        Pattern;

END

GO


