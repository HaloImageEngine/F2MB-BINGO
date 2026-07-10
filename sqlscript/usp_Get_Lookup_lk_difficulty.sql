USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_Lookup_lk_difficulty]    Script Date: 4/25/2026 8:54:59 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[usp_Get_Lookup_lk_difficulty]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        difficulty_id,
        difficulty_name
    FROM dbo.lk_difficulty
    ORDER BY difficulty_id;
END;

GO


