CREATE PROCEDURE usp_Create_NewGameNight
    @GN_Name       VARCHAR(100),
    @GN_Date       DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Validation
    IF @GN_Name IS NULL OR LTRIM(RTRIM(@GN_Name)) = ''
    BEGIN
        RAISERROR('GN_Name is required and cannot be empty.', 16, 1);
        RETURN;
    END

    IF @GN_Date IS NULL
    BEGIN
        RAISERROR('GN_Date is required.', 16, 1);
        RETURN;
    END

    INSERT INTO GameNight (
        GN_Name,
        GN_Date,
        GN_Venue,
        GN_HostName,
        GN_MaxPlayers,
        GN_Notes,
        GN_IsActive,
        GN_CreatedAt
    )
    VALUES (
        @GN_Name,
        @GN_Date,
        'HillTop',
        'DJGogi',
        200,
        'Random Notes',
        1,
        GETDATE()
    );

    -- Return the newly created GN_ID
    SELECT SCOPE_IDENTITY() AS GN_ID;

END;
GO