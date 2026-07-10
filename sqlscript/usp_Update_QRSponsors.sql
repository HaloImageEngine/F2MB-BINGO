-- usp_Update_QRSponsors: Inserts a new sponsor record or updates an existing one.
-- Pass QRID = 0 (or NULL) to insert; pass a valid QRID to update.
-- All non-nullable fields are required on both insert and update.
CREATE OR ALTER PROCEDURE usp_Update_QRSponsors
    @QRID            INT,
    @Title           VARCHAR(50),
    @URL             VARCHAR(300),
    @EnterDate       DATE,
    @ActiveStartDate DATE,
    @ActiveEndDate   DATE,
    @Contact         VARCHAR(100) = NULL,
    @Phone           VARCHAR(12)  = NULL,
    @ContactURL      VARCHAR(300) = NULL,
    @AdPosition      VARCHAR(20)  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @QRID = 0 OR @QRID IS NULL
    BEGIN
        -- Insert new sponsor record
        INSERT INTO QRSponsors (Title, URL, EnterDate, ActiveStartDate, ActiveEndDate, Contact, Phone, ContactURL, AdPosition)
        VALUES (@Title, @URL, @EnterDate, @ActiveStartDate, @ActiveEndDate, @Contact, @Phone, @ContactURL, @AdPosition);

        SELECT SCOPE_IDENTITY() AS NewQRID;
    END
    ELSE
    BEGIN
        -- Update existing sponsor record by QRID
        UPDATE QRSponsors
        SET
            Title           = @Title,
            URL             = @URL,
            EnterDate       = @EnterDate,
            ActiveStartDate = @ActiveStartDate,
            ActiveEndDate   = @ActiveEndDate,
            Contact         = @Contact,
            Phone           = @Phone,
            ContactURL      = @ContactURL,
            AdPosition      = @AdPosition
        WHERE QRID = @QRID;

        SELECT @@ROWCOUNT AS RowsAffected;
    END
END;
