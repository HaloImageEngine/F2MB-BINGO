-- ============================================================
--  DJ Request Stored Procedures  |  MS SQL Server 2017 (v14)
--  Lookup : usp_GetTipTypes, usp_GetEventTypes
--  DJRequest: usp_InsertDJRequest, usp_UpdateDJRequest,
--             usp_SelectDJRequest
-- ============================================================


-- ============================================================
--  LOOKUP SP 1: TipType Dropdown
-- ============================================================
IF OBJECT_ID('dbo.usp_Get_TipTypes', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Get_TipTypes;
GO

CREATE PROCEDURE dbo.usp_Get_TipTypes
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Tip_Code,
        Tip_Type,
        Bank_Type
    FROM  dbo.TipType
    ORDER BY Tip_Type;
END;
GO

/*  USAGE:
    EXEC dbo.usp_GetTipTypes;
*/


-- ============================================================
--  LOOKUP SP 2: EventType Dropdown
-- ============================================================
IF OBJECT_ID('dbo.usp_Get_EventTypes', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Get_EventTypes;
GO

CREATE PROCEDURE dbo.usp_Get_EventTypes
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Event_ID,
        Event_Code,
        Event_Type,
        Event_Date
    FROM  dbo.EventType
    ORDER BY Event_Type;
END;
GO

/*  USAGE:
    EXEC dbo.usp_GetEventTypes;
*/


-- ============================================================
--  DJRequest SP 1: INSERT
-- ============================================================
IF OBJECT_ID('dbo.usp_Insert_DJRequest', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Insert_DJRequest;
GO

CREATE PROCEDURE dbo.usp_Insert_DJRequest
    @DJ_ID       INT,
    @Song_ID     INT          = NULL,
    @Song_Title  VARCHAR(150),
    @Song_Artist VARCHAR(100),
    @Event_Code  CHAR(3),
    @Tip_Amount  DECIMAL(8,2) = 0.00,
    @Tip_Code    VARCHAR(5)   = NULL,
    @DateTime    DATETIME     = NULL,        -- defaults to GETDATE() if not supplied
    @NewReq_ID   INT          OUTPUT         -- returns the new primary key
AS
BEGIN
    SET NOCOUNT ON;

    -- Default DateTime to now if not passed in
    IF @DateTime IS NULL
        SET @DateTime = GETDATE();

    -- Validate Event_Code exists
    IF NOT EXISTS (SELECT 1 FROM dbo.EventType WHERE Event_Code = @Event_Code)
    BEGIN
        RAISERROR('Invalid Event_Code: %s', 16, 1, @Event_Code);
        RETURN;
    END;

    -- Validate Tip_Code exists (only when a value is supplied)
    IF @Tip_Code IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dbo.TipType WHERE Tip_Code = @Tip_Code)
    BEGIN
        RAISERROR('Invalid Tip_Code: %s', 16, 1, @Tip_Code);
        RETURN;
    END;

    INSERT INTO dbo.DJRequest
        (DJ_ID, Song_ID, Song_Title, Song_Artist,
         Event_Code, Tip_Amount, Tip_Code, DateTime)
    VALUES
        (@DJ_ID, @Song_ID, @Song_Title, @Song_Artist,
         @Event_Code, @Tip_Amount, @Tip_Code, @DateTime);

    SET @NewReq_ID = SCOPE_IDENTITY();
END;
GO

/*  USAGE:
    DECLARE @NewID INT;
    EXEC dbo.usp_InsertDJRequest
        @DJ_ID       = 1,
        @Song_ID     = 101,
        @Song_Title  = 'Bohemian Rhapsody',
        @Song_Artist = 'Queen',
        @Event_Code  = 'WED',
        @Tip_Amount  = 5.00,
        @Tip_Code    = 'CC',
        @NewReq_ID   = @NewID OUTPUT;
    SELECT @NewID AS NewReq_ID;
*/


-- ============================================================
--  DJRequest SP 2: UPDATE
-- ============================================================
IF OBJECT_ID('dbo.usp_Update_DJRequest', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Update_DJRequest;
GO

CREATE PROCEDURE dbo.usp_Update_DJRequest
    @Req_ID      INT,
    @DJ_ID       INT          = NULL,
    @Song_ID     INT          = NULL,
    @Song_Title  VARCHAR(150) = NULL,
    @Song_Artist VARCHAR(100) = NULL,
    @Event_Code  CHAR(3)      = NULL,
    @Tip_Amount  DECIMAL(8,2) = NULL,
    @Tip_Code    VARCHAR(5)   = NULL,
    @DateTime    DATETIME     = NULL,
    @RowsAffected INT         OUTPUT        -- returns 0 if Req_ID not found
AS
BEGIN
    SET NOCOUNT ON;

    -- Confirm the request exists
    IF NOT EXISTS (SELECT 1 FROM dbo.DJRequest WHERE Req_ID = @Req_ID)
    BEGIN
        SET @RowsAffected = 0;
        RAISERROR('Req_ID %d not found.', 16, 1, @Req_ID);
        RETURN;
    END;

    -- Validate Event_Code if supplied
    IF @Event_Code IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dbo.EventType WHERE Event_Code = @Event_Code)
    BEGIN
        RAISERROR('Invalid Event_Code: %s', 16, 1, @Event_Code);
        RETURN;
    END;

    -- Validate Tip_Code if supplied
    IF @Tip_Code IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dbo.TipType WHERE Tip_Code = @Tip_Code)
    BEGIN
        RAISERROR('Invalid Tip_Code: %s', 16, 1, @Tip_Code);
        RETURN;
    END;

    -- Only update columns that were explicitly passed in (ISNULL pattern)
    UPDATE dbo.DJRequest
    SET
        DJ_ID       = ISNULL(@DJ_ID,       DJ_ID),
        Song_ID     = ISNULL(@Song_ID,      Song_ID),
        Song_Title  = ISNULL(@Song_Title,   Song_Title),
        Song_Artist = ISNULL(@Song_Artist,  Song_Artist),
        Event_Code  = ISNULL(@Event_Code,   Event_Code),
        Tip_Amount  = ISNULL(@Tip_Amount,   Tip_Amount),
        Tip_Code    = ISNULL(@Tip_Code,     Tip_Code),
        DateTime    = ISNULL(@DateTime,     DateTime)
    WHERE
        Req_ID = @Req_ID;

    SET @RowsAffected = @@ROWCOUNT;
END;
GO

/*  USAGE — update tip info only, leave everything else untouched:
    DECLARE @Rows INT;
    EXEC dbo.usp_UpdateDJRequest
        @Req_ID       = 1,
        @Tip_Amount   = 20.00,
        @Tip_Code     = 'VNM',
        @RowsAffected = @Rows OUTPUT;
    SELECT @Rows AS RowsAffected;
*/


-- ============================================================
--  DJRequest SP 3: SELECT  (flexible — filter by any combo)
-- ============================================================
IF OBJECT_ID('dbo.usp_Get_DJRequest', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Get_DJRequest;
GO

CREATE PROCEDURE dbo.usp_Get_DJRequest
    @Req_ID      INT          = NULL,   -- single request lookup
    @DJ_ID       INT          = NULL,   -- all requests for a DJ
    @Event_Code  CHAR(3)      = NULL,   -- all requests for an event type
    @Tip_Code    VARCHAR(5)   = NULL,   -- filter by payment type
    @DateFrom    DATETIME     = NULL,   -- date range start
    @DateTo      DATETIME     = NULL    -- date range end
AS
BEGIN
    SET NOCOUNT ON;

    -- Default DateTo to end of today if a DateFrom was given but DateTo was not
    IF @DateFrom IS NOT NULL AND @DateTo IS NULL
        SET @DateTo = DATEADD(SECOND, -1, DATEADD(DAY, 1, CAST(GETDATE() AS DATE)));

    SELECT
        r.Req_ID,
        r.DJ_ID,
        r.Song_ID,
        r.Song_Title,
        r.Song_Artist,
        r.Event_Code,
        e.Event_Type,
        e.Event_Date,
        r.Tip_Amount,
        r.Tip_Code,
        t.Tip_Type,
        t.Bank_Type,
        r.DateTime
    FROM       dbo.DJRequest  r
    INNER JOIN dbo.EventType  e ON e.Event_Code = r.Event_Code
    LEFT  JOIN dbo.TipType    t ON t.Tip_Code   = r.Tip_Code
    WHERE
        (@Req_ID     IS NULL OR r.Req_ID     = @Req_ID)
        AND (@DJ_ID      IS NULL OR r.DJ_ID      = @DJ_ID)
        AND (@Event_Code IS NULL OR r.Event_Code = @Event_Code)
        AND (@Tip_Code   IS NULL OR r.Tip_Code   = @Tip_Code)
        AND (@DateFrom   IS NULL OR r.DateTime  >= @DateFrom)
        AND (@DateTo     IS NULL OR r.DateTime  <= @DateTo)
    ORDER BY
        r.DateTime DESC;
END;
GO

/*  USAGE examples:

    -- All requests (no filter)
    EXEC dbo.usp_SelectDJRequest;

    -- Single request by ID
    EXEC dbo.usp_SelectDJRequest @Req_ID = 1;

    -- All requests for DJ 3
    EXEC dbo.usp_SelectDJRequest @DJ_ID = 3;

    -- All Wedding requests paid by Credit Card
    EXEC dbo.usp_SelectDJRequest @Event_Code = 'WED', @Tip_Code = 'CC';

    -- Date range
    EXEC dbo.usp_SelectDJRequest
        @DateFrom = '2025-01-01',
        @DateTo   = '2025-12-31';
*/