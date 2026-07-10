USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Get_Lookup_lk_streaming_era]    Script Date: 4/25/2026 8:56:07 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[usp_Get_Lookup_lk_streaming_era]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        streaming_era_id,
        streaming_era_name
    FROM dbo.lk_streaming_era
    ORDER BY streaming_era_id;
END;

GO


