CREATE TABLE [dbo].[CallList_Winner](
	[Call_List_Winner_ID] [int] IDENTITY(1,1) NOT NULL,
	[Game_ID] [int] NOT NULL,
	[Call_List_ID] [int] NOT NULL,
	[Inning] [int] NOT NULL,
	[Call_List_WinningCard] [int] NOT NULL,
	[Call_List_CreatedAt] [datetime2](7) NOT NULL DEFAULT SYSDATETIME(),
	[Call_List_UpdatedAt] [datetime2](7) NULL,
 CONSTRAINT [PK_CallList_Winner] PRIMARY KEY CLUSTERED 
(
	[Call_List_Winner_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY];
GO

-- Optional: Add foreign key constraints if the referenced tables exist
-- ALTER TABLE [dbo].[CallList_Winner]  WITH CHECK ADD CONSTRAINT [FK_CallList_Winner_Game] 
-- FOREIGN KEY([Game_ID]) REFERENCES [dbo].[Game] ([Game_ID]);
-- GO

-- ALTER TABLE [dbo].[CallList_Winner]  WITH CHECK ADD CONSTRAINT [FK_CallList_Winner_CallList] 
-- FOREIGN KEY([Call_List_ID]) REFERENCES [dbo].[CallList] ([Call_List_ID]);
-- GO

-- ALTER TABLE [dbo].[CallList_Winner]  WITH CHECK ADD CONSTRAINT [FK_CallList_Winner_Card] 
-- FOREIGN KEY([Call_List_WinningCard]) REFERENCES [dbo].[Cards] ([Card_ID]);
-- GO