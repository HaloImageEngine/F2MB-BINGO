USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_Top_Cards]    Script Date: 4/25/2026 8:57:32 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


--DROP PROCEDURE IF EXISTS [dbo].[usp_Get_Top_Cards]
--GO

-- =============================================
-- Author:      [Your Name]
-- Create Date: 2026-04-24
-- Description: Retrieves the top N bingo cards with the highest number of
--              called squares for a given Game ID. Each card has 25 squares
--              across 5 columns (B, I, N, G, O) with 5 rows each. The proc
--              sums all 25 'Called' bit flags per card and returns the top
--              results ordered by the highest called count descending.
--
-- Parameters:
--              @Game_ID  INT - The Game identifier to filter cards by.
--              @NOT      INT - The number of top cards to return (e.g. 10).
--
-- Returns:     Card_ID, Called_Count
--
-- Example:     EXEC [dbo].[usp_Get_Top_Cards] @Game_ID = 1, @NOT = 10
--
-- Change Log:
-- Date         Author          Description
-- ----------   ----------      -----------------------------------------------
-- 2026-04-24   [Your Name]     Initial creation
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_Top_Cards]
    @Game_ID    INT,
    @NOT        INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@NOT)
        Card_ID,
        (
            -- B column
            CAST(Sq_B1_Called AS INT) + CAST(Sq_B2_Called AS INT) + CAST(Sq_B3_Called AS INT) +
            CAST(Sq_B4_Called AS INT) + CAST(Sq_B5_Called AS INT) +
            -- I column
            CAST(Sq_I1_Called AS INT) + CAST(Sq_I2_Called AS INT) + CAST(Sq_I3_Called AS INT) +
            CAST(Sq_I4_Called AS INT) + CAST(Sq_I5_Called AS INT) +
            -- N column
            CAST(Sq_N1_Called AS INT) + CAST(Sq_N2_Called AS INT) + CAST(Sq_N3_Called AS INT) +
            CAST(Sq_N4_Called AS INT) + CAST(Sq_N5_Called AS INT) +
            -- G column
            CAST(Sq_G1_Called AS INT) + CAST(Sq_G2_Called AS INT) + CAST(Sq_G3_Called AS INT) +
            CAST(Sq_G4_Called AS INT) + CAST(Sq_G5_Called AS INT) +
            -- O column
            CAST(Sq_O1_Called AS INT) + CAST(Sq_O2_Called AS INT) + CAST(Sq_O3_Called AS INT) +
            CAST(Sq_O4_Called AS INT) + CAST(Sq_O5_Called AS INT)
        ) AS Called_Count
    FROM
        [dbo].[Cards]
    WHERE
        Game_ID = @Game_ID
    ORDER BY
        Called_Count DESC;

END

GO


