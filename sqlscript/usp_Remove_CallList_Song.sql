USE [haloimag_djgogi]
GO

/****** Object:  StoredProcedure [dbo].[usp_Remove_CallList_Song]    Script Date: 4/25/2026 9:01:40 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- Stored Procedure : dbo.usp_Remove_CallList_Song
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Removes a single song from dbo.CallList_Songs and
--   automatically decrements the parent CallList_Master.
--   Call_List_SongCount by 1. Also stamps Call_List_UpdatedAt
--   on the parent record with the current timestamp.
--   This proc removes by song_id so the exact record is
--   always targeted - no ambiguity if duplicate titles exist
--   across different call lists.
--
-- PARAMETERS:
--   @song_id          INT  -- Required. The song_id of the
--                          -- CallList_Songs record to remove.
--                          -- Must exist in CallList_Songs.
--   @Call_List_ID     INT  -- Required. The parent
--                          -- CallList_Master record the song
--                          -- belongs to. Used to validate the
--                          -- song belongs to the correct list
--                          -- and to decrement SongCount.
--
-- HOW IT WORKS:
--   Validates that @Call_List_ID exists in CallList_Master
--   and that @song_id exists in CallList_Songs under that
--   Call_List_ID. Deletes the song row then decrements
--   Call_List_SongCount by 1 on the parent master record
--   and stamps Call_List_UpdatedAt. SongCount will never
--   go below 0 - a floor check is applied on the update.
--
-- USAGE:
--   EXEC dbo.usp_Remove_CallList_Song
--       @song_id      = 5,
--       @Call_List_ID = 1;
--
-- RETURNS:
--   Single row summary:
--     - Call_List_ID        : Parent list ID
--     - song_id_removed     : The song_id that was deleted
--     - title               : Title of the removed song
--     - artist              : Artist of the removed song
--     - Call_List_SongCount : Updated total songs remaining
--
-- ERROR CONDITIONS:
--   - @Call_List_ID not found      : Call list does not exist
--   - @song_id not found in list   : Song does not exist in
--                                    this call list
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
-- ============================================================

CREATE  PROCEDURE [dbo].[usp_Remove_CallList_Song]
    @song_id      INT,
    @Call_List_ID INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validate CallList_Master exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.CallList_Master WHERE Call_List_ID = @Call_List_ID)
    BEGIN
        RAISERROR('Call_List_ID %d does not exist in CallList_Master.', 16, 1, @Call_List_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Validate song exists in this call list
    ------------------------------------------------------------
    IF NOT EXISTS (
        SELECT 1 FROM dbo.CallList_Songs
        WHERE song_id     = @song_id
        AND   Call_List_ID = @Call_List_ID
    )
    BEGIN
        RAISERROR('song_id %d does not exist in Call_List_ID %d.', 16, 1, @song_id, @Call_List_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Capture song details before deleting for return summary
    ------------------------------------------------------------
    DECLARE @RemovedTitle  NVARCHAR(255);
    DECLARE @RemovedArtist NVARCHAR(255);

    SELECT
        @RemovedTitle  = title,
        @RemovedArtist = artist
    FROM dbo.CallList_Songs
    WHERE song_id      = @song_id
    AND   Call_List_ID = @Call_List_ID;

    ------------------------------------------------------------
    -- Delete the song
    ------------------------------------------------------------
    DELETE FROM dbo.CallList_Songs
    WHERE song_id      = @song_id
    AND   Call_List_ID = @Call_List_ID;

    ------------------------------------------------------------
    -- Decrement SongCount on parent - floor at 0
    ------------------------------------------------------------
    UPDATE dbo.CallList_Master
    SET
        Call_List_SongCount = CASE
                                WHEN Call_List_SongCount > 0
                                THEN Call_List_SongCount - 1
                                ELSE 0
                              END,
        Call_List_UpdatedAt = SYSDATETIME()
    WHERE Call_List_ID = @Call_List_ID;

    ------------------------------------------------------------
    -- Return summary
    ------------------------------------------------------------
    SELECT
        @Call_List_ID       AS Call_List_ID,
        @song_id            AS song_id_removed,
        @RemovedTitle       AS title,
        @RemovedArtist      AS artist,
        Call_List_SongCount AS Call_List_SongCount
    FROM dbo.CallList_Master
    WHERE Call_List_ID = @Call_List_ID;

END;

GO


