USE [haloimag_djgogi]
GO

/****** Object:  Table [dbo].[Cards]    Script Date: 4/25/2026 8:41:46 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

SET ANSI_PADDING ON
GO

CREATE TABLE [dbo].[Cards](
	[Card_ID] [int] IDENTITY(1,1) NOT NULL,
	[Game_ID] [int] NOT NULL,
	[Card_Date_Create] [datetime2](7) NOT NULL,
	[Card_PlayerName] [varchar](100) NULL,
	[Card_PlayerEmail] [varchar](150) NULL,
	[PlayCount] [int] NOT NULL,
	[Card_IsWinner] [bit] NOT NULL,
	[Card_SeedKey] [varchar](64) NULL,
	[Card_PrintedAt] [datetime2](7) NULL,
	[Sq_B1] [int] NULL,
	[Sq_B1_Called] [bit] NOT NULL,
	[Sq_B2] [int] NULL,
	[Sq_B2_Called] [bit] NOT NULL,
	[Sq_B3] [int] NULL,
	[Sq_B3_Called] [bit] NOT NULL,
	[Sq_B4] [int] NULL,
	[Sq_B4_Called] [bit] NOT NULL,
	[Sq_B5] [int] NULL,
	[Sq_B5_Called] [bit] NOT NULL,
	[Sq_I1] [int] NULL,
	[Sq_I1_Called] [bit] NOT NULL,
	[Sq_I2] [int] NULL,
	[Sq_I2_Called] [bit] NOT NULL,
	[Sq_I3] [int] NULL,
	[Sq_I3_Called] [bit] NOT NULL,
	[Sq_I4] [int] NULL,
	[Sq_I4_Called] [bit] NOT NULL,
	[Sq_I5] [int] NULL,
	[Sq_I5_Called] [bit] NOT NULL,
	[Sq_N1] [int] NULL,
	[Sq_N1_Called] [bit] NOT NULL,
	[Sq_N2] [int] NULL,
	[Sq_N2_Called] [bit] NOT NULL,
	[Sq_N3] [int] NULL,
	[Sq_N3_Called] [bit] NOT NULL,
	[Sq_N4] [int] NULL,
	[Sq_N4_Called] [bit] NOT NULL,
	[Sq_N5] [int] NULL,
	[Sq_N5_Called] [bit] NOT NULL,
	[Sq_G1] [int] NULL,
	[Sq_G1_Called] [bit] NOT NULL,
	[Sq_G2] [int] NULL,
	[Sq_G2_Called] [bit] NOT NULL,
	[Sq_G3] [int] NULL,
	[Sq_G3_Called] [bit] NOT NULL,
	[Sq_G4] [int] NULL,
	[Sq_G4_Called] [bit] NOT NULL,
	[Sq_G5] [int] NULL,
	[Sq_G5_Called] [bit] NOT NULL,
	[Sq_O1] [int] NULL,
	[Sq_O1_Called] [bit] NOT NULL,
	[Sq_O2] [int] NULL,
	[Sq_O2_Called] [bit] NOT NULL,
	[Sq_O3] [int] NULL,
	[Sq_O3_Called] [bit] NOT NULL,
	[Sq_O4] [int] NULL,
	[Sq_O4_Called] [bit] NOT NULL,
	[Sq_O5] [int] NULL,
	[Sq_O5_Called] [bit] NOT NULL,
 CONSTRAINT [PK_Cards] PRIMARY KEY CLUSTERED 
(
	[Card_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_DateCreate]  DEFAULT (sysdatetime()) FOR [Card_Date_Create]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_PlayCount]  DEFAULT ((0)) FOR [PlayCount]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_IsWinner]  DEFAULT ((0)) FOR [Card_IsWinner]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_B1_Called]  DEFAULT ((0)) FOR [Sq_B1_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_B2_Called]  DEFAULT ((0)) FOR [Sq_B2_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_B3_Called]  DEFAULT ((0)) FOR [Sq_B3_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_B4_Called]  DEFAULT ((0)) FOR [Sq_B4_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_B5_Called]  DEFAULT ((0)) FOR [Sq_B5_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_I1_Called]  DEFAULT ((0)) FOR [Sq_I1_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_I2_Called]  DEFAULT ((0)) FOR [Sq_I2_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_I3_Called]  DEFAULT ((0)) FOR [Sq_I3_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_I4_Called]  DEFAULT ((0)) FOR [Sq_I4_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_I5_Called]  DEFAULT ((0)) FOR [Sq_I5_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_N1_Called]  DEFAULT ((0)) FOR [Sq_N1_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_N2_Called]  DEFAULT ((0)) FOR [Sq_N2_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_N3_Called]  DEFAULT ((1)) FOR [Sq_N3_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_N4_Called]  DEFAULT ((0)) FOR [Sq_N4_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_N5_Called]  DEFAULT ((0)) FOR [Sq_N5_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_G1_Called]  DEFAULT ((0)) FOR [Sq_G1_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_G2_Called]  DEFAULT ((0)) FOR [Sq_G2_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_G3_Called]  DEFAULT ((0)) FOR [Sq_G3_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_G4_Called]  DEFAULT ((0)) FOR [Sq_G4_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_G5_Called]  DEFAULT ((0)) FOR [Sq_G5_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_O1_Called]  DEFAULT ((0)) FOR [Sq_O1_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_O2_Called]  DEFAULT ((0)) FOR [Sq_O2_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_O3_Called]  DEFAULT ((0)) FOR [Sq_O3_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_O4_Called]  DEFAULT ((0)) FOR [Sq_O4_Called]
GO

ALTER TABLE [dbo].[Cards] ADD  CONSTRAINT [DF_Cards_Sq_O5_Called]  DEFAULT ((0)) FOR [Sq_O5_Called]
GO


