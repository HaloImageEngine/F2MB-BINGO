USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_Lookup_lk_tempo]    Script Date: 4/25/2026 8:56:44 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[usp_Get_Lookup_lk_tempo]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        tempo_id,
        tempo_name
    FROM dbo.lk_tempo
    ORDER BY tempo_id;
END;

GO


