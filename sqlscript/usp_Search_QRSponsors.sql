-- usp_Search_QRSponsors: Searches QRSponsors across major fields using optional parameters.
-- All parameters are optional; omit or pass NULL to ignore that filter.
-- @Keyword searches Title, URL, Contact, and ContactURL via partial match (LIKE).
-- @ActiveOnly = 1 restricts results to sponsors active as of today.
CREATE  PROCEDURE usp_Search_QRSponsors
    @Keyword        VARCHAR(300) = NULL,  -- Partial match against Title, URL, Contact, ContactURL
    @AdPosition     VARCHAR(20)  = NULL,  -- Exact match on AdPosition
    @Phone          VARCHAR(12)  = NULL,  -- Exact match on Phone
    @ActiveStartDate DATE        = NULL,  -- Sponsors with ActiveStartDate >= this date
    @ActiveEndDate   DATE        = NULL,  -- Sponsors with ActiveEndDate <= this date
    @ActiveOnly      BIT         = 0      -- 1 = only return currently active sponsors
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
        -- Keyword partial match across major text fields
        (@Keyword IS NULL OR
            Title      LIKE '%' + @Keyword + '%' OR
            URL        LIKE '%' + @Keyword + '%' OR
            Contact    LIKE '%' + @Keyword + '%' OR
            ContactURL LIKE '%' + @Keyword + '%'
        )
        -- Exact filter on AdPosition
        AND (@AdPosition IS NULL OR AdPosition = @AdPosition)
        -- Exact filter on Phone
        AND (@Phone IS NULL OR Phone = @Phone)
        -- Date range filters on active window
        AND (@ActiveStartDate IS NULL OR ActiveStartDate >= @ActiveStartDate)
        AND (@ActiveEndDate   IS NULL OR ActiveEndDate   <= @ActiveEndDate)
        -- Restrict to currently active sponsors if requested
        AND (@ActiveOnly = 0 OR (ActiveStartDate <= CAST(GETDATE() AS DATE) AND ActiveEndDate >= CAST(GETDATE() AS DATE)))
    ORDER BY ActiveStartDate DESC, Title;
END;
