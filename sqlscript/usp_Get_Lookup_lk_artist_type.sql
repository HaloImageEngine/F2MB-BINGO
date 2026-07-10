USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_Lookup_lk_artist_type]    Script Date: 4/25/2026 8:52:24 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[usp_Get_Lookup_lk_artist_type]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        artist_type_id,
        artist_type_name
    FROM dbo.lk_artist_type
    ORDER BY artist_type_name;
END;

GO


