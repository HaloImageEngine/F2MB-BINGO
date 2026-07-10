USE [haloimag_djgogi]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		William D Beaty
-- Create Date:	2026-05-08
-- Procedure:	usp_Update_CallList_Songs
-- Description:
--		Updates an existing record in the CallList_Songs table.
--
-- Features:
--		1. Updates song and metadata information for a specific song_id.
--		2. Validates that the supplied song_id exists.
--		3. Allows updating music details such as title, artist,
--		   genre, release year, decade, and era.
--		4. Updates playlist-related information including:
--			 - Call_List_ID
--			 - Inning
--			 - last_played
--		5. Returns success/failure status message.
--
-- Notes:
--		- song_id is required.
--		- title and artist are required fields.
--		- Inning is required.
--		- explicit defaults to 0 if not provided.
--
-- Example:
--
-- EXEC dbo.usp_Update_CallList_Songs
--		@song_id = 101,
--		@Call_List_ID = 2001,
--		@title = 'Billie Jean',
--		@artist = 'Michael Jackson',
--		@featured_artist = NULL,
--		@lead_vocalist = 'Michael Jackson',
--		@artist_type = 'Solo',
--		@genre = 'Pop',
--		@explicit = 0,
--		@release_year = 1982,
--		@decade = '1980',
--		@era = '80s',
--		@last_played = GETDATE(),
--		@Inning = 3
--
-- =============================================
CREATE PROCEDURE [dbo].[usp_Update_CallList_Songs]
(
	@song_id				INT,
	@Call_List_ID			INT,
	@title					NVARCHAR(255),
	@artist					NVARCHAR(255),
	@featured_artist		NVARCHAR(255) = NULL,
	@lead_vocalist			NVARCHAR(255) = NULL,
	@artist_type			VARCHAR(20) = NULL,
	@genre					VARCHAR(100) = NULL,
	@explicit				BIT = 0,
	@release_year			SMALLINT = NULL,
	@decade					VARCHAR(5) = NULL,
	@era					VARCHAR(10) = NULL,
	@last_played			DATETIME2(7) = NULL,
	@Inning					INT
)
AS
BEGIN

	SET NOCOUNT ON;

	BEGIN TRY

		-- =============================================
		-- Validation Section
		-- =============================================

		IF @song_id IS NULL
		BEGIN
			RAISERROR('song_id is required.', 16, 1);
			RETURN;
		END

		IF NOT EXISTS
		(
			SELECT 1
			FROM dbo.CallList_Songs
			WHERE song_id = @song_id
		)
		BEGIN
			RAISERROR('The specified song_id does not exist.', 16, 1);
			RETURN;
		END

		IF ISNULL(LTRIM(RTRIM(@title)), '') = ''
		BEGIN
			RAISERROR('title is required.', 16, 1);
			RETURN;
		END

		IF ISNULL(LTRIM(RTRIM(@artist)), '') = ''
		BEGIN
			RAISERROR('artist is required.', 16, 1);
			RETURN;
		END

		IF @Inning IS NULL
		BEGIN
			RAISERROR('Inning is required.', 16, 1);
			RETURN;
		END

		-- =============================================
		-- Update Record
		-- =============================================

		UPDATE dbo.CallList_Songs
		SET
			Call_List_ID		= @Call_List_ID,
			title				= @title,
			artist				= @artist,
			featured_artist		= @featured_artist,
			lead_vocalist		= @lead_vocalist,
			artist_type		= @artist_type,
			genre				= @genre,
			explicit			= @explicit,
			release_year		= @release_year,
			decade				= @decade,
			era					= @era,
			last_played		= @last_played,
			Inning				= @Inning
		WHERE
			song_id = @song_id;

		-- =============================================
		-- Success Response
		-- =============================================

		SELECT
			1 AS Success,
			'Song record updated successfully.' AS Message,
			@song_id AS song_id;

	END TRY

	BEGIN CATCH

		-- =============================================
		-- Error Handling
		-- =============================================

		SELECT
			0 AS Success,
			ERROR_MESSAGE() AS ErrorMessage,
			ERROR_NUMBER() AS ErrorNumber,
			ERROR_LINE() AS ErrorLine;

	END CATCH

END
GO