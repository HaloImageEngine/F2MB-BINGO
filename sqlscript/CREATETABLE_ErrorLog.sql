CREATE TABLE [dbo].[ErrorLog] (
    [ErrorLog_ID]       INT             IDENTITY(1,1)   NOT NULL,
    [ErrorDate]         DATETIME        NOT NULL        DEFAULT GETDATE(),
    [ErrorSource]       NVARCHAR(100)   NULL,           -- 'SQL' or 'UI' or 'API'
    [ErrorNumber]       INT             NULL,           -- SQL error number
    [ErrorSeverity]     INT             NULL,           -- SQL severity level
    [ErrorState]        INT             NULL,           -- SQL error state
    [ErrorProcedure]    NVARCHAR(200)   NULL,           -- Stored proc or C# method name
    [ErrorLine]         INT             NULL,           -- Line number where error occurred
    [ErrorMessage]      NVARCHAR(MAX)   NOT NULL,       -- Full error message
    [ErrorType]         NVARCHAR(100)   NULL,           -- e.g. 'SqlException', 'NullReferenceException'
    [StackTrace]        NVARCHAR(MAX)   NULL,           -- C# stack trace
    [RequestUrl]        NVARCHAR(500)   NULL,           -- API endpoint that was called
    [RequestMethod]     NVARCHAR(10)    NULL,           -- GET, POST, PUT, DELETE
    [RequestBody]       NVARCHAR(MAX)   NULL,           -- JSON payload (sanitized)
    [UserName]          NVARCHAR(100)   NULL,           -- Authenticated user if available
    [IPAddress]         NVARCHAR(50)    NULL,           -- Client IP address
    [StatusCode]        INT             NULL,           -- HTTP status code (400, 500, etc.)
    [AdditionalInfo]    NVARCHAR(MAX)   NULL,           -- Any extra context

    CONSTRAINT [PK_ErrorLog] PRIMARY KEY CLUSTERED ([ErrorLog_ID] ASC)
);