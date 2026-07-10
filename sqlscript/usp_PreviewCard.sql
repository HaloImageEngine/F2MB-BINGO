USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_PreviewCard]    Script Date: 4/25/2026 9:01:04 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[usp_PreviewCard]
    @Card_ID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.Card_ID,
        c.Game_ID,
        c.Card_Date_Create,
        c.Card_IsWinner,
        c.Card_SeedKey,

        sB1.Song_Title + ' - ' + sB1.Song_Artist AS B1,
        sB2.Song_Title + ' - ' + sB2.Song_Artist AS B2,
        sB3.Song_Title + ' - ' + sB3.Song_Artist AS B3,
        sB4.Song_Title + ' - ' + sB4.Song_Artist AS B4,
        sB5.Song_Title + ' - ' + sB5.Song_Artist AS B5,

        sI1.Song_Title + ' - ' + sI1.Song_Artist AS I1,
        sI2.Song_Title + ' - ' + sI2.Song_Artist AS I2,
        sI3.Song_Title + ' - ' + sI3.Song_Artist AS I3,
        sI4.Song_Title + ' - ' + sI4.Song_Artist AS I4,
        sI5.Song_Title + ' - ' + sI5.Song_Artist AS I5,

        sN1.Song_Title + ' - ' + sN1.Song_Artist AS N1,
        sN2.Song_Title + ' - ' + sN2.Song_Artist AS N2,
        'FREE SPACE' AS N3,
        sN4.Song_Title + ' - ' + sN4.Song_Artist AS N4,
        sN5.Song_Title + ' - ' + sN5.Song_Artist AS N5,

        sG1.Song_Title + ' - ' + sG1.Song_Artist AS G1,
        sG2.Song_Title + ' - ' + sG2.Song_Artist AS G2,
        sG3.Song_Title + ' - ' + sG3.Song_Artist AS G3,
        sG4.Song_Title + ' - ' + sG4.Song_Artist AS G4,
        sG5.Song_Title + ' - ' + sG5.Song_Artist AS G5,

        sO1.Song_Title + ' - ' + sO1.Song_Artist AS O1,
        sO2.Song_Title + ' - ' + sO2.Song_Artist AS O2,
        sO3.Song_Title + ' - ' + sO3.Song_Artist AS O3,
        sO4.Song_Title + ' - ' + sO4.Song_Artist AS O4,
        sO5.Song_Title + ' - ' + sO5.Song_Artist AS O5
    FROM dbo.Cards c
    LEFT JOIN dbo.Songs sB1 ON c.Sq_B1 = sB1.Song_ID
    LEFT JOIN dbo.Songs sB2 ON c.Sq_B2 = sB2.Song_ID
    LEFT JOIN dbo.Songs sB3 ON c.Sq_B3 = sB3.Song_ID
    LEFT JOIN dbo.Songs sB4 ON c.Sq_B4 = sB4.Song_ID
    LEFT JOIN dbo.Songs sB5 ON c.Sq_B5 = sB5.Song_ID
    LEFT JOIN dbo.Songs sI1 ON c.Sq_I1 = sI1.Song_ID
    LEFT JOIN dbo.Songs sI2 ON c.Sq_I2 = sI2.Song_ID
    LEFT JOIN dbo.Songs sI3 ON c.Sq_I3 = sI3.Song_ID
    LEFT JOIN dbo.Songs sI4 ON c.Sq_I4 = sI4.Song_ID
    LEFT JOIN dbo.Songs sI5 ON c.Sq_I5 = sI5.Song_ID
    LEFT JOIN dbo.Songs sN1 ON c.Sq_N1 = sN1.Song_ID
    LEFT JOIN dbo.Songs sN2 ON c.Sq_N2 = sN2.Song_ID
    LEFT JOIN dbo.Songs sN4 ON c.Sq_N4 = sN4.Song_ID
    LEFT JOIN dbo.Songs sN5 ON c.Sq_N5 = sN5.Song_ID
    LEFT JOIN dbo.Songs sG1 ON c.Sq_G1 = sG1.Song_ID
    LEFT JOIN dbo.Songs sG2 ON c.Sq_G2 = sG2.Song_ID
    LEFT JOIN dbo.Songs sG3 ON c.Sq_G3 = sG3.Song_ID
    LEFT JOIN dbo.Songs sG4 ON c.Sq_G4 = sG4.Song_ID
    LEFT JOIN dbo.Songs sG5 ON c.Sq_G5 = sG5.Song_ID
    LEFT JOIN dbo.Songs sO1 ON c.Sq_O1 = sO1.Song_ID
    LEFT JOIN dbo.Songs sO2 ON c.Sq_O2 = sO2.Song_ID
    LEFT JOIN dbo.Songs sO3 ON c.Sq_O3 = sO3.Song_ID
    LEFT JOIN dbo.Songs sO4 ON c.Sq_O4 = sO4.Song_ID
    LEFT JOIN dbo.Songs sO5 ON c.Sq_O5 = sO5.Song_ID
    WHERE c.Card_ID = @Card_ID;
END;

GO


