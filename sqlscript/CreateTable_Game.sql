USE [haloimag_djgogi]
GO

/****** Object:  Table [dbo].[Game]    Script Date: 4/25/2026 8:42:29 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

SET ANSI_PADDING ON
GO

CREATE TABLE [dbo].[Game](
	[Game_ID] [int] IDENTITY(1,1) NOT NULL,
	[GN_ID] [int] NOT NULL,
	[Game_Number] [tinyint] NOT NULL,
	[Game_Name] [varchar](100) NULL,
	[Game_StartTime] [datetime2](7) NULL,
	[Game_EndTime] [datetime2](7) NULL,
	[Game_WinPattern] [varchar](50) NULL,
	[Game_WinnerCard_ID] [int] NULL,
	[Game_Status] [varchar](20) NOT NULL,
	[Game_CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Game] PRIMARY KEY CLUSTERED 
(
	[Game_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [UQ_Game_Number] UNIQUE NONCLUSTERED 
(
	[GN_ID] ASC,
	[Game_Number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[Game] ADD  CONSTRAINT [DF_Game_Status]  DEFAULT ('Pending') FOR [Game_Status]
GO

ALTER TABLE [dbo].[Game] ADD  CONSTRAINT [DF_Game_CreatedAt]  DEFAULT (sysdatetime()) FOR [Game_CreatedAt]
GO

ALTER TABLE [dbo].[Game]  WITH CHECK ADD  CONSTRAINT [CHK_Game_Number] CHECK  (([Game_Number]>=(1) AND [Game_Number]<=(5)))
GO

ALTER TABLE [dbo].[Game] CHECK CONSTRAINT [CHK_Game_Number]
GO

ALTER TABLE [dbo].[Game]  WITH CHECK ADD  CONSTRAINT [CHK_Game_Status] CHECK  (([Game_Status]='Complete' OR [Game_Status]='Active' OR [Game_Status]='Pending'))
GO

ALTER TABLE [dbo].[Game] CHECK CONSTRAINT [CHK_Game_Status]
GO


