USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_Lookup_lk_era]    Script Date: 4/25/2026 8:55:34 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[usp_Get_Lookup_lk_era]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        era_id,
        era_name
    FROM dbo.lk_era
    ORDER BY era_id;
END;

GO


