USE [haloimag_djgogi]
GO

/****** Object:  Table [dbo].[CallList_Master]    Script Date: 4/25/2026 8:36:25 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

SET ANSI_PADDING ON
GO

CREATE TABLE [dbo].[CallList_Master](
	[Call_List_ID] [int] IDENTITY(1,1) NOT NULL,
	[Call_List_Name] [varchar](150) NOT NULL,
	[Call_List_Date] [date] NOT NULL,
	[Call_List_Description] [nvarchar](500) NULL,
	[Call_List_Genre] [varchar](100) NULL,
	[Call_List_Decade] [varchar](5) NULL,
	[Call_List_Era] [varchar](100) NULL,
	[Call_List_SongCount] [int] NOT NULL,
	[Call_List_IsActive] [bit] NOT NULL,
	[Call_List_CreatedAt] [datetime2](7) NOT NULL,
	[Call_List_UpdatedAt] [datetime2](7) NULL,
 CONSTRAINT [PK_CallList_Master] PRIMARY KEY CLUSTERED 
(
	[Call_List_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[CallList_Master] ADD  CONSTRAINT [DF_CallList_Master_SongCount]  DEFAULT ((0)) FOR [Call_List_SongCount]
GO

ALTER TABLE [dbo].[CallList_Master] ADD  CONSTRAINT [DF_CallList_Master_IsActive]  DEFAULT ((1)) FOR [Call_List_IsActive]
GO

ALTER TABLE [dbo].[CallList_Master] ADD  CONSTRAINT [DF_CallList_Master_CreatedAt]  DEFAULT (sysdatetime()) FOR [Call_List_CreatedAt]
GO


