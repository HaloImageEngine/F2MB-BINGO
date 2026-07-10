USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_Get_Lookup_lk_decade]    Script Date: 4/25/2026 8:54:11 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER PROCEDURE [dbo].[usp_Get_Lookup_lk_decade]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        decade_id,
        decade_name
    FROM dbo.lk_decade
    ORDER BY decade_id;
END;
