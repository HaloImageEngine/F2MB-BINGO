USE [haloimag_djgogi]
GO

/****** Object:  Table [dbo].[songs]    Script Date: 4/25/2026 8:46:10 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

SET ANSI_PADDING ON
GO

CREATE TABLE [dbo].[songs](
	[song_id] [int] IDENTITY(1,1) NOT NULL,
	[title] [nvarchar](255) NOT NULL,
	[artist] [nvarchar](255) NOT NULL,
	[featured_artist] [nvarchar](255) NULL,
	[lead_vocalist] [nvarchar](255) NULL,
	[artist_type] [varchar](20) NULL,
	[is_cover] [bit] NOT NULL,
	[is_instrumental] [bit] NOT NULL,
	[genre] [varchar](100) NULL,
	[subgenre] [varchar](100) NULL,
	[mood] [varchar](50) NULL,
	[tempo] [varchar](10) NULL,
	[bpm] [smallint] NULL,
	[language] [varchar](50) NULL,
	[explicit] [bit] NOT NULL,
	[release_year] [smallint] NULL,
	[decade] [varchar](5) NULL,
	[era] [varchar](10) NULL,
	[streaming_era] [varchar](20) NULL,
	[bingo_category] [varchar](100) NULL,
	[difficulty] [varchar](10) NULL,
	[play_count] [int] NOT NULL,
	[last_played] [datetime2](7) NULL,
	[active] [bit] NOT NULL,
	[chart_peak_position] [tinyint] NULL,
	[chart_country] [varchar](10) NULL,
	[spotify_popularity] [tinyint] NULL,
	[duration_seconds] [smallint] NULL,
	[created_at] [datetime2](7) NOT NULL,
	[updated_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_songs] PRIMARY KEY CLUSTERED 
(
	[song_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT ((0)) FOR [is_cover]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT ((0)) FOR [is_instrumental]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT ('English') FOR [language]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT ((0)) FOR [explicit]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT ('medium') FOR [difficulty]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT ((0)) FOR [play_count]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT ((1)) FOR [active]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT ('UK') FOR [chart_country]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT (sysutcdatetime()) FOR [created_at]
GO

ALTER TABLE [dbo].[songs] ADD  DEFAULT (sysutcdatetime()) FOR [updated_at]
GO

ALTER TABLE [dbo].[songs]  WITH CHECK ADD  CONSTRAINT [CHK_artist_type] CHECK  (([artist_type]='other' OR [artist_type]='choir' OR [artist_type]='dj_producer' OR [artist_type]='supergroup' OR [artist_type]='band' OR [artist_type]='duo' OR [artist_type]='solo'))
GO

ALTER TABLE [dbo].[songs] CHECK CONSTRAINT [CHK_artist_type]
GO

ALTER TABLE [dbo].[songs]  WITH CHECK ADD  CONSTRAINT [CHK_decade] CHECK  (([decade]='20s' OR [decade]='10s' OR [decade]='00s' OR [decade]='90s' OR [decade]='80s' OR [decade]='70s' OR [decade]='60s' OR [decade]='50s' OR [decade]='40s'))
GO

ALTER TABLE [dbo].[songs] CHECK CONSTRAINT [CHK_decade]
GO

ALTER TABLE [dbo].[songs]  WITH CHECK ADD  CONSTRAINT [CHK_difficulty] CHECK  (([difficulty]='hard' OR [difficulty]='medium' OR [difficulty]='easy'))
GO

ALTER TABLE [dbo].[songs] CHECK CONSTRAINT [CHK_difficulty]
GO

ALTER TABLE [dbo].[songs]  WITH CHECK ADD  CONSTRAINT [CHK_era] CHECK  (([era]='Current' OR [era]='Modern' OR [era]='Retro' OR [era]='Classic'))
GO

ALTER TABLE [dbo].[songs] CHECK CONSTRAINT [CHK_era]
GO

ALTER TABLE [dbo].[songs]  WITH CHECK ADD  CONSTRAINT [CHK_streaming_era] CHECK  (([streaming_era]='post_streaming' OR [streaming_era]='pre_streaming'))
GO

ALTER TABLE [dbo].[songs] CHECK CONSTRAINT [CHK_streaming_era]
GO

ALTER TABLE [dbo].[songs]  WITH CHECK ADD  CONSTRAINT [CHK_tempo] CHECK  (([tempo]='dance' OR [tempo]='fast' OR [tempo]='medium' OR [tempo]='slow'))
GO

ALTER TABLE [dbo].[songs] CHECK CONSTRAINT [CHK_tempo]
GO


