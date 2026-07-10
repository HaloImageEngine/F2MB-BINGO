-- ============================================================
-- Create Table : dbo.CallList_Master
-- Database     : haloimag_djgogi
-- Author       : William D Beaty
-- Created      : April 22, 2026
-- Description  : Parent record for a Music Bingo call list.
--                Each master record represents a curated set
--                of songs for a game night. Child records
--                live in dbo.CallList_Songs.
-- ============================================================

CREATE TABLE dbo.CallList_Master (

    -- ── Identity ──────────────────────────────────────────
    Call_List_ID          INT           NOT NULL IDENTITY(1,1)
                                        CONSTRAINT PK_CallList_Master PRIMARY KEY,

    -- ── List Info ─────────────────────────────────────────
    Call_List_Name        VARCHAR(150)  NOT NULL,
    Call_List_Date        DATE          NOT NULL,
    Call_List_Description NVARCHAR(500) NULL,

    -- ── Classification ────────────────────────────────────
    Call_List_Genre       VARCHAR(100)  NULL,
    Call_List_Decade      VARCHAR(5)    NULL,
    Call_List_Era         VARCHAR(100)  NULL,
    Call_List_SongCount   INT           NOT NULL CONSTRAINT DF_CallList_Master_SongCount  DEFAULT 0,

    -- ── Status ────────────────────────────────────────────
    Call_List_IsActive    BIT           NOT NULL CONSTRAINT DF_CallList_Master_IsActive   DEFAULT 1,

    -- ── Audit ─────────────────────────────────────────────
    Call_List_CreatedAt   DATETIME2     NOT NULL CONSTRAINT DF_CallList_Master_CreatedAt  DEFAULT SYSDATETIME(),
    Call_List_UpdatedAt   DATETIME2     NULL
);
GO

-- ============================================================
-- Create Table : dbo.CallList_Songs
-- Database     : haloimag_djgogi
-- Author       : William D Beaty
-- Created      : April 22, 2026
-- Description  : Child table to CallList_Master. Contains the
--                individual songs that make up a call list.
--                One row per song per call list.
-- ============================================================

CREATE TABLE dbo.CallList_Songs (

    -- ── Identity ──────────────────────────────────────────
    song_id             INT             NOT NULL IDENTITY(1,1)
                                        CONSTRAINT PK_CallList_Songs PRIMARY KEY,

    -- ── Parent Reference ──────────────────────────────────
    Call_List_ID        INT             NOT NULL,   -- references CallList_Master.Call_List_ID

    -- ── Song Info ─────────────────────────────────────────
    title               NVARCHAR(255)   NOT NULL,
    artist              NVARCHAR(255)   NOT NULL,
    featured_artist     NVARCHAR(255)   NULL,
    lead_vocalist       NVARCHAR(255)   NULL,
    artist_type         VARCHAR(20)     NULL,

    -- ── Classification ────────────────────────────────────
    genre               VARCHAR(100)    NULL,
    explicit            BIT             NOT NULL CONSTRAINT DF_CallList_Songs_Explicit     DEFAULT 0,
    release_year        SMALLINT        NULL,
    decade              VARCHAR(5)      NULL,
    era                 VARCHAR(10)     NULL,

    -- ── Play History ──────────────────────────────────────
    last_played         DATETIME2(7)    NULL
);
GO