-- usp_Delete_QRSponsors: Permanently deletes a sponsor record by QRID.
-- Returns RowsAffected so the caller can confirm deletion succeeded.
CREATE OR ALTER PROCEDURE usp_Delete_QRSponsors
    @QRID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM QRSponsors
    WHERE QRID = @QRID;

    SELECT @@ROWCOUNT AS RowsAffected;
END;
