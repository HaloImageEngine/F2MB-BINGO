USE [haloimag_djgogi]
GO

/****** Object:  Stored Procedure [dbo].[usp_Get_CallList_SongCountByInning]    Script Date: 5/28/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:         DBA / Developer
-- Create Date:    2026-05-28
-- Description:    Returns a song count per inning
--                 for a given CallList_Master.
--                 Optionally filter by a specific
--                 inning. Pass NULL to @Inning
--                 to return all innings.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_CallList_SongCountByInning]
        @Call_List_ID   INT,            -- Required: the CallList_Master to summarize
        @Inning         INT = NULL      -- Optional: filter to a specific inning
AS
BEGIN
        SET NOCOUNT ON;

        BEGIN TRY

                IF @Call_List_ID IS NULL
                BEGIN
                        RAISERROR('Call_List_ID cannot be NULL.', 16, 1);
                        RETURN;
                END

                SELECT
                        clm.[Call_List_ID],
                        clm.[Call_List_Name],
                        cls.[Inning],
                        COUNT(cls.[CL_Song_ID])     AS Song_Count
                FROM [dbo].[CallList_Master]    clm
                INNER JOIN [dbo].[CallList_Songs] cls
                        ON clm.[Call_List_ID] = cls.[Call_List_ID]
                WHERE
                        clm.[Call_List_ID] = @Call_List_ID
                        AND (@Inning IS NULL OR cls.[Inning] = @Inning)
                GROUP BY
                        clm.[Call_List_ID],
                        clm.[Call_List_Name],
                        cls.[Inning]
                ORDER BY
                        cls.[Inning];

        END TRY
        BEGIN CATCH
                SELECT
                        ERROR_NUMBER()      AS ErrorNumber,
                        ERROR_SEVERITY()    AS ErrorSeverity,
                        ERROR_STATE()       AS ErrorState,
                        ERROR_PROCEDURE()   AS ErrorProcedure,
                        ERROR_LINE()        AS ErrorLine,
                        ERROR_MESSAGE()     AS ErrorMessage;
        END CATCH;
END;
