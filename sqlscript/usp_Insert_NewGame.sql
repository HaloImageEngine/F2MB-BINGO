USE [haloimag_djgogi]
GO

/****** Object:  Stored Procedure [dbo].[usp_Insert_NewGame]    Script Date: 5/28/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:         DBA / Developer
-- Create Date:    2026-05-04
-- Modified Date:  2026-05-28
-- Description:    Inserts a new Game record into
--                 the [dbo].[Game] table.
--                 Game_ID is auto-generated via
--                 IDENTITY(1,1) and returned as
--                 an OUTPUT parameter.
--                 A CallList_Master can be reused
--                 across multiple games (DJ reuse).
-- =============================================
ALTER PROCEDURE [dbo].[usp_Insert_NewGame]
        -- ----------------------------------------
        -- INPUT PARAMETERS
        -- ----------------------------------------
        @User_ID                INT,                    -- Foreign key to parent Night/Session
        @Call_List_ID           INT,                    -- FK to CallList_Master (reusable across games)
        @Game_Number            INT,
	    	@Game_Inning            INT,
        @Game_Name              VARCHAR(100) = NULL,    -- Optional descriptive name for the game
        @Game_StartTime         DATETIME2(7) = NULL,    -- Defaults to current UTC time if not supplied
        @Game_EndTime           DATETIME2(7) = NULL,    -- NULL until game ends
        @Game_WinPattern        VARCHAR(50)  = NULL,    -- Win condition e.g. 'Full House', 'Line', 'T-Shape'
        @Game_WinnerCard_ID     INT          = NULL,    -- NULL until game ends
        @Game_Status            VARCHAR(20)  = 'Pending', -- Defaults to Pending for a new game

        -- ----------------------------------------
        -- OUTPUT PARAMETER
        -- Returns the newly generated Game_ID
        -- so the caller knows the new record's PK
        -- ----------------------------------------
        @New_Game_ID            INT OUTPUT
AS
BEGIN
        SET NOCOUNT ON;

        BEGIN TRY

                IF @User_ID IS NULL
                BEGIN
                        RAISERROR('User_ID cannot be NULL. A valid Night/Session ID is required.', 16, 1);
                        RETURN;
                END

                IF @Call_List_ID IS NULL
                BEGIN
                        RAISERROR('Call_List_ID cannot be NULL. A valid CallList_Master ID is required.', 16, 1);
                        RETURN;
                END

                IF @Game_Number IS NULL
                BEGIN
                        RAISERROR('Game_Number cannot be NULL.', 16, 1);
                        RETURN;
                END

                -- Auto-set StartTime to now if not supplied
                IF @Game_StartTime IS NULL
                        SET @Game_StartTime = SYSUTCDATETIME();

                IF @Game_Status IS NULL OR @Game_Status NOT IN ('Pending', 'Active', 'Completed', 'Cancelled')
                BEGIN
                        RAISERROR('Invalid Game_Status. Accepted values: Pending, Active, Completed, Cancelled.', 16, 1);
                        RETURN;
                END

                INSERT INTO [dbo].[Game]
                (
                        [User_ID],
                        [Call_List_ID],
                        [Game_Number],
						[Game_Inning],
                        [Game_Name],
                        [Game_StartTime],
                        [Game_EndTime],
                        [Game_WinPattern],
                        [Game_WinnerCard_ID],
                        [Game_Status],
                        [Game_CreatedAt]
                )
                VALUES
                (
                        @User_ID,
                        @Call_List_ID,
                        @Game_Number,
						@Game_Inning,
                        @Game_Name,
                        @Game_StartTime,
                        @Game_EndTime,
                        @Game_WinPattern,
                        @Game_WinnerCard_ID,
                        @Game_Status,
                        SYSUTCDATETIME()
                );

                SET @New_Game_ID = SCOPE_IDENTITY();

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
