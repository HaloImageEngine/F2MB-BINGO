USE [haloimag_djgogi]
GO

/****** Object:  Table [dbo].[GameNight]    Script Date: 4/25/2026 8:45:09 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

SET ANSI_PADDING ON
GO

CREATE TABLE [dbo].[GameNight](
	[GN_ID] [int] IDENTITY(1,1) NOT NULL,
	[GN_Name] [varchar](100) NOT NULL,
	[GN_Date] [date] NOT NULL,
	[GN_Venue] [varchar](150) NULL,
	[GN_HostName] [varchar](100) NULL,
	[GN_MaxPlayers] [int] NULL,
	[GN_Notes] [nvarchar](max) NULL,
	[GN_IsActive] [bit] NOT NULL,
	[GN_CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_GameNight] PRIMARY KEY CLUSTERED 
(
	[GN_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[GameNight] ADD  CONSTRAINT [DF_GameNight_IsActive]  DEFAULT ((1)) FOR [GN_IsActive]
GO

ALTER TABLE [dbo].[GameNight] ADD  CONSTRAINT [DF_GameNight_CreatedAt]  DEFAULT (sysdatetime()) FOR [GN_CreatedAt]
GO


