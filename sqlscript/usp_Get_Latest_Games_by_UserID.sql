USE [haloimag_djgogi]
GO

/****** Object:  Stored Procedure [dbo].[usp_Get_Latest_Games_by_UserID]    Script Date: 5/28/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:         DBA / Developer
-- Create Date:    2026-05-28
-- Description:    Returns the latest games for a
--                 given User_ID, ordered by most
--                 recently created first.
--                 Optionally limit the number of
--                 rows returned with @TopN.
--                 Pass NULL to @TopN for all games.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Get_Latest_Games_by_UserID]
        @User_ID    INT,            -- Required: the user whose games to retrieve
        @TopN       INT = 10        -- Optional: number of recent games to return (default 10, NULL = all)
AS
BEGIN
        SET NOCOUNT ON;

        BEGIN TRY

                IF @User_ID IS NULL
                BEGIN
                        RAISERROR('User_ID cannot be NULL.', 16, 1);
                        RETURN;
                END

                SELECT TOP (COALESCE(@TopN, 2147483647))
                        g.[Game_ID],
                        g.[Game_Number],
                        g.[Game_Inning],
                        g.[Game_Name],
                        g.[Game_Status],
                        g.[Game_StartTime],
                        g.[Game_EndTime],
                        g.[Game_WinPattern],
                        g.[Game_WinnerCard_ID],
                        g.[Game_CreatedAt],
                        clm.[Call_List_ID],
                        clm.[Call_List_Name],
                        clm.[Call_List_Genre],
                        clm.[Call_List_Decade]
                FROM [dbo].[Game] g
                INNER JOIN [dbo].[CallList_Master] clm
                        ON g.[Call_List_ID] = clm.[Call_List_ID]
                WHERE
                        g.[User_ID] = @User_ID
                ORDER BY
                        g.[Game_CreatedAt] DESC;

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
