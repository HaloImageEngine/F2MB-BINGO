USE [haloimag_djgogi]
GO

/****** Object:  Table [dbo].[CallList_Songs]    Script Date: 5/8/2026 12:53:02 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

SET ANSI_PADDING ON
GO

CREATE TABLE [dbo].[CallList_Songs](
	[song_id] [int] IDENTITY(1,1) NOT NULL,
	[Call_List_ID] [int] NOT NULL,
	[title] [nvarchar](255) NOT NULL,
	[artist] [nvarchar](255) NOT NULL,
	[featured_artist] [nvarchar](255) NULL,
	[lead_vocalist] [nvarchar](255) NULL,
	[artist_type] [varchar](20) NULL,
	[genre] [varchar](100) NULL,
	[explicit] [bit] NOT NULL,
	[release_year] [smallint] NULL,
	[decade] [varchar](5) NULL,
	[era] [varchar](10) NULL,
	[last_played] [datetime2](7) NULL,
	[Inning] [int] NOT NULL,
 CONSTRAINT [PK_CallList_Songs] PRIMARY KEY CLUSTERED 
(
	[song_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[CallList_Songs] ADD  CONSTRAINT [DF_CallList_Songs_Explicit]  DEFAULT ((0)) FOR [explicit]
GO

ALTER TABLE [dbo].[CallList_Songs] ADD  CONSTRAINT [DF_CallList_Songs_Inning]  DEFAULT ((0)) FOR [Inning]
GO


