-- usp_Get_QRSponsors: Retrieves sponsor records from QRSponsors.
-- Pass a specific QRID to fetch a single record, or 0 (NULL) to return all records.
-- Pass @ActiveOnly = 1 to filter only sponsors whose active date range covers today.
CREATE OR ALTER PROCEDURE usp_Get_QRSponsors
    @QRID       INT  = NULL,
    @ActiveOnly BIT  = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        QRID,
        Title,
        URL,
        EnterDate,
        ActiveStartDate,
        ActiveEndDate,
        Contact,
        Phone,
        ContactURL,
        AdPosition
    FROM QRSponsors
    WHERE
        -- Filter by QRID if provided
        (@QRID IS NULL OR @QRID = 0 OR QRID = @QRID)
        -- Optionally restrict to currently active sponsors
        AND (@ActiveOnly = 0 OR (ActiveStartDate <= CAST(GETDATE() AS DATE) AND ActiveEndDate >= CAST(GETDATE() AS DATE)))
    ORDER BY ActiveStartDate DESC, Title;
END;
