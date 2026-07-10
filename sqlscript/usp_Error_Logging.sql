-- =============================================
-- Author: William D. Beaty    
-- Create Date: 2026-05-05
-- Description: Logs application and SQL errors from the REST API.
--              Captures HTTP context, SQL error details, C# exception
--              info, and user/request metadata for diagnostics.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Error_Logging]
    @ErrorSource        NVARCHAR(100)   = NULL,     -- Origin of error: 'SQL', 'API', or 'UI'
    @ErrorNumber        INT             = NULL,     -- SQL Server error number (from ERROR_NUMBER())
    @ErrorSeverity      INT             = NULL,     -- SQL severity level (from ERROR_SEVERITY())
    @ErrorState         INT             = NULL,     -- SQL error state (from ERROR_STATE())
    @ErrorProcedure     NVARCHAR(200)   = NULL,     -- Stored proc or C# method where error occurred
    @ErrorLine          INT             = NULL,     -- Line number of the error
    @ErrorMessage       NVARCHAR(MAX)   = NULL,     -- Full error message text
    @ErrorType          NVARCHAR(100)   = NULL,     -- C# exception type e.g. 'SqlException', 'NullReferenceException'
    @StackTrace         NVARCHAR(MAX)   = NULL,     -- C# stack trace (null for pure SQL errors)
    @RequestUrl         NVARCHAR(500)   = NULL,     -- API endpoint that triggered the error
    @RequestMethod      NVARCHAR(10)    = NULL,     -- HTTP method: GET, POST, PUT, DELETE
    @RequestBody        NVARCHAR(MAX)   = NULL,     -- JSON request payload (sanitize sensitive fields before passing)
    @UserName           NVARCHAR(100)   = NULL,     -- Authenticated user at time of error
    @IPAddress          NVARCHAR(50)    = NULL,     -- Client IP address
    @StatusCode         INT             = NULL,     -- HTTP response status code e.g. 400, 404, 500
    @AdditionalInfo     NVARCHAR(MAX)   = NULL      -- Any extra context or custom diagnostic notes
AS
BEGIN
    SET NOCOUNT ON;  -- Suppress row count messages to prevent interference with calling code

    BEGIN TRY

        INSERT INTO [dbo].[ErrorLog] (
            [ErrorDate],        -- Auto-stamped with GETDATE()
            [ErrorSource],
            [ErrorNumber],
            [ErrorSeverity],
            [ErrorState],
            [ErrorProcedure],
            [ErrorLine],
            [ErrorMessage],
            [ErrorType],
            [StackTrace],
            [RequestUrl],
            [RequestMethod],
            [RequestBody],
            [UserName],
            [IPAddress],
            [StatusCode],
            [AdditionalInfo]
        )
        VALUES (
            GETDATE(),
            @ErrorSource,
            @ErrorNumber,
            @ErrorSeverity,
            @ErrorState,
            @ErrorProcedure,
            @ErrorLine,
            @ErrorMessage,
            @ErrorType,
            @StackTrace,
            @RequestUrl,
            @RequestMethod,
            @RequestBody,
            @UserName,
            @IPAddress,
            @StatusCode,
            @AdditionalInfo
        );

    END TRY
    BEGIN CATCH
        -- Intentional silent failure:
        -- If the ErrorLog insert itself fails, we print a message but do NOT
        -- re-throw. This ensures logging never interrupts the calling application.
        PRINT 'ErrorLog insert failed: ' + ERROR_MESSAGE();
    END CATCH

END;