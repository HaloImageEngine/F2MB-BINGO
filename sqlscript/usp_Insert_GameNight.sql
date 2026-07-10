-- =============================================
-- Author:      DBA / Developer
-- Create Date: 2026-05-04
-- Description: Inserts a new GameNight record
--              into the [dbo].[GameNight] table.
--              GN_ID is auto-generated via
--              IDENTITY(1,1) and returned as
--              an OUTPUT parameter.
--              GN_CreatedAt defaults to the
--              current UTC timestamp.
--              GN_IsActive defaults to 1 (TRUE)
--              unless explicitly passed as 0.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Insert_GameNight]
    -- ----------------------------------------
    -- INPUT PARAMETERS
    -- ----------------------------------------
    @GN_Name        VARCHAR(100),       -- Required: Name/title of the Game Night event
    @GN_Date        DATE,               -- Required: Date the Game Night is scheduled
    @GN_Venue       VARCHAR(150),       -- Optional: Location/venue name
    @GN_HostName    VARCHAR(100),       -- Optional: Name of the host
    @GN_MaxPlayers  INT,                -- Optional: Max number of players allowed
    @GN_Notes       NVARCHAR(MAX),      -- Optional: Any extra notes or details
    @GN_IsActive    BIT = 1,            -- Defaults to 1 (Active) if not supplied

    -- ----------------------------------------
    -- OUTPUT PARAMETER
    -- Returns the newly generated GN_ID
    -- so the caller knows the new record's PK
    -- ----------------------------------------
    @New_GN_ID      INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;  -- Suppress "rows affected" noise

    BEGIN TRY

        -- ----------------------------------------
        -- VALIDATION: GN_Name is required
        -- ----------------------------------------
        IF @GN_Name IS NULL OR LTRIM(RTRIM(@GN_Name)) = ''
        BEGIN
            RAISERROR('GN_Name cannot be NULL or empty. A Game Night name is required.', 16, 1);
            RETURN;
        END

        -- ----------------------------------------
        -- VALIDATION: GN_Date is required
        -- ----------------------------------------
        IF @GN_Date IS NULL
        BEGIN
            RAISERROR('GN_Date cannot be NULL. A valid Game Night date is required.', 16, 1);
            RETURN;
        END

        -- ----------------------------------------
        -- VALIDATION: GN_MaxPlayers must be
        -- a positive number if supplied
        -- ----------------------------------------
        IF @GN_MaxPlayers IS NOT NULL AND @GN_MaxPlayers <= 0
        BEGIN
            RAISERROR('GN_MaxPlayers must be a positive integer if provided.', 16, 1);
            RETURN;
        END

        -- ----------------------------------------
        -- VALIDATION: GN_IsActive must be 0 or 1
        -- ----------------------------------------
        IF @GN_IsActive NOT IN (0, 1)
        BEGIN
            RAISERROR('GN_IsActive must be 0 (Inactive) or 1 (Active).', 16, 1);
            RETURN;
        END

        -- ----------------------------------------
        -- INSERT the new GameNight row.
        -- GN_ID        -> auto-assigned by IDENTITY
        -- GN_CreatedAt -> stamped with UTC now
        -- ----------------------------------------
        INSERT INTO [dbo].[GameNight]
        (
            [GN_Name],
            [GN_Date],
            [GN_Venue],
            [GN_HostName],
            [GN_MaxPlayers],
            [GN_Notes],
            [GN_IsActive],
            [GN_CreatedAt]
        )
        VALUES
        (
            LTRIM(RTRIM(@GN_Name)),     -- Trim accidental leading/trailing spaces
            @GN_Date,
            @GN_Venue,
            @GN_HostName,
            @GN_MaxPlayers,
            @GN_Notes,
            @GN_IsActive,
            SYSUTCDATETIME()            -- Always capture insert time in UTC
        );

        -- ----------------------------------------
        -- Capture the newly created IDENTITY value
        -- and pass it back to the caller
        -- ----------------------------------------
        SET @New_GN_ID = SCOPE_IDENTITY();

    END TRY
    BEGIN CATCH
        -- ----------------------------------------
        -- Surface any runtime errors with full
        -- diagnostic context for easy debugging
        -- ----------------------------------------
        SELECT
            ERROR_NUMBER()    AS ErrorNumber,
            ERROR_SEVERITY()  AS ErrorSeverity,
            ERROR_STATE()     AS ErrorState,
            ERROR_PROCEDURE() AS ErrorProcedure,
            ERROR_LINE()      AS ErrorLine,
            ERROR_MESSAGE()   AS ErrorMessage;

    END CATCH;
END;
GO