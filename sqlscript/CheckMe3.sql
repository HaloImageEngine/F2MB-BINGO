/****** Script for SelectTopNRows command from SSMS  ******/
SELECT *
  FROM [dbo].[GameNight]

  SELECT TOP 1000 *
  FROM [dbo].[Game]

  select * 
  from dbo.cards