-- usp_Get_QRSponsors_ByPosition: Retrieves sponsor records filtered by AdPosition or by most recently entered.
-- Pass @AdPosition to filter by a specific position (e.g. 'Top', 'Bottom', 'Sidebar').
-- Pass @AdPosition = NULL to return all positions.
-- Pass @LatestOnly = 1 to return only the single most recently entered sponsor per position.
-- Always restricts to currently active sponsors (ActiveStartDate <= today <= ActiveEndDate).
CREATE  PROCEDURE usp_Get_QRSponsors_ByPosition
    @AdPosition  VARCHAR(20) = NULL,
    @LatestOnly  BIT         = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @LatestOnly = 1
    BEGIN
        -- Return the most recently entered sponsor for each position (or the specified position)
        SELECT
            s.QRID,
            s.Title,
            s.URL,
            s.EnterDate,
            s.ActiveStartDate,
            s.ActiveEndDate,
            s.Contact,
            s.Phone,
            s.ContactURL,
            s.AdPosition
        FROM QRSponsors s
        INNER JOIN (
            SELECT AdPosition, MAX(EnterDate) AS LatestEnterDate
            FROM QRSponsors
            WHERE
                ActiveStartDate <= CAST(GETDATE() AS DATE)
                AND ActiveEndDate >= CAST(GETDATE() AS DATE)
                AND (@AdPosition IS NULL OR AdPosition = @AdPosition)
            GROUP BY AdPosition
        ) latest ON s.AdPosition = latest.AdPosition AND s.EnterDate = latest.LatestEnterDate
        WHERE
            s.ActiveStartDate <= CAST(GETDATE() AS DATE)
            AND s.ActiveEndDate >= CAST(GETDATE() AS DATE)
            AND (@AdPosition IS NULL OR s.AdPosition = @AdPosition)
        ORDER BY s.AdPosition, s.Title;
    END
    ELSE
    BEGIN
        -- Return all active sponsors for the given position (or all positions)
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
            ActiveStartDate <= CAST(GETDATE() AS DATE)
            AND ActiveEndDate >= CAST(GETDATE() AS DATE)
            AND (@AdPosition IS NULL OR AdPosition = @AdPosition)
        ORDER BY AdPosition, EnterDate DESC, Title;
    END
END;
