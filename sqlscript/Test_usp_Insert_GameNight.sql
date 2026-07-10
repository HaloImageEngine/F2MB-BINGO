-- =============================================
-- Author:      DBA / Developer
-- Create Date: 2026-05-04
-- Description: Mockup / Seed data to test the
--              usp_Insert_GameNight stored proc.
--              Covers happy path, optional NULLs,
--              and edge cases.
-- =============================================

-- ----------------------------------------
-- Setup: variable to capture each new GN_ID
-- ----------------------------------------
DECLARE @NewGNID INT;

-- ============================================
-- TEST 1: Full record - all fields populated
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = 'Friday Night Bingo',
    @GN_Date       = '2026-05-09',
    @GN_Venue      = 'Main Hall - Room 4',
    @GN_HostName   = 'John Smith',
    @GN_MaxPlayers = 50,
    @GN_Notes      = 'Bring your own daubers. Doors open at 6PM.',
    @GN_IsActive   = 1,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test1_FullRecord_GN_ID];

-- ============================================
-- TEST 2: Minimal record - only required fields
--         Venue, Host, MaxPlayers, Notes = NULL
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = 'Saturday Quickie Games',
    @GN_Date       = '2026-05-10',
    @GN_Venue      = NULL,
    @GN_HostName   = NULL,
    @GN_MaxPlayers = NULL,
    @GN_Notes      = NULL,
    @GN_IsActive   = 1,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test2_MinimalRecord_GN_ID];

-- ============================================
-- TEST 3: Inactive Game Night
--         GN_IsActive = 0 (cancelled/postponed)
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = 'Cancelled - Holiday Event',
    @GN_Date       = '2026-05-25',
    @GN_Venue      = 'Community Center',
    @GN_HostName   = 'Jane Doe',
    @GN_MaxPlayers = 30,
    @GN_Notes      = 'Event cancelled due to holiday conflict.',
    @GN_IsActive   = 0,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test3_InactiveGameNight_GN_ID];

-- ============================================
-- TEST 4: Large player capacity event
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = 'Grand Bingo Tournament',
    @GN_Date       = '2026-06-01',
    @GN_Venue      = 'City Convention Center - Ballroom A',
    @GN_HostName   = 'Mike Johnson',
    @GN_MaxPlayers = 500,
    @GN_Notes      = 'Annual championship event. Pre-registration required. Cash prizes awarded.',
    @GN_IsActive   = 1,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test4_LargeCapacityEvent_GN_ID];

-- ============================================
-- TEST 5: Small private game night
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = 'Private Game Night - VIP',
    @GN_Date       = '2026-05-15',
    @GN_Venue      = 'Smiths Residence',
    @GN_HostName   = 'Bob Smith',
    @GN_MaxPlayers = 8,
    @GN_Notes      = 'Invite only. BYOB. Starts at 7PM sharp.',
    @GN_IsActive   = 1,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test5_SmallPrivateEvent_GN_ID];

-- ============================================
-- TEST 6: No host assigned yet
--         Host TBD - HostName left NULL
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = 'Thursday League Night',
    @GN_Date       = '2026-05-21',
    @GN_Venue      = 'Legion Hall',
    @GN_HostName   = NULL,
    @GN_MaxPlayers = 75,
    @GN_Notes      = 'Host not yet confirmed. Check back for updates.',
    @GN_IsActive   = 1,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test6_NoHostAssigned_GN_ID];

-- ============================================
-- TEST 7: Long notes field (NVARCHAR MAX test)
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = 'Charity Bingo Fundraiser',
    @GN_Date       = '2026-06-14',
    @GN_Venue      = 'St. Michaels Parish Hall',
    @GN_HostName   = 'Father Murphy',
    @GN_MaxPlayers = 120,
    @GN_Notes      = 'Annual charity fundraiser in support of the local food bank. 
                      All proceeds go directly to the St. Michaels Food Pantry. 
                      Doors open at 5:30PM. Early bird games start at 6PM. 
                      Main session begins at 7PM. Refreshments provided. 
                      Raffle prizes include gift cards, electronics, and more. 
                      Please bring non-perishable food donations if possible. 
                      Parking available in the rear lot. Wheelchair accessible.',
    @GN_IsActive   = 1,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test7_LongNotes_GN_ID];

-- ============================================
-- TEST 8: ERROR CASE - NULL GN_Name
--         Expect: GN_Name cannot be NULL error
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = NULL,
    @GN_Date       = '2026-05-30',
    @GN_Venue      = 'Test Venue',
    @GN_HostName   = 'Test Host',
    @GN_MaxPlayers = 20,
    @GN_Notes      = NULL,
    @GN_IsActive   = 1,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test8_NullName_ShouldError];

-- ============================================
-- TEST 9: ERROR CASE - Invalid MaxPlayers (0)
--         Expect: GN_MaxPlayers must be positive
-- ============================================
EXEC [dbo].[usp_Insert_GameNight]
    @GN_Name       = 'Bad Player Count Night',
    @GN_Date       = '2026-05-30',
    @GN_Venue      = 'Test Venue',
    @GN_HostName   = 'Test Host',
    @GN_MaxPlayers = 0,
    @GN_Notes      = NULL,
    @GN_IsActive   = 1,
    @New_GN_ID     = @NewGNID OUTPUT;
SELECT @NewGNID AS [Test9_ZeroMaxPlayers_ShouldError];

-- ============================================
-- Verify all successfully inserted records
-- ============================================
SELECT
    [GN_ID],
    [GN_Name],
    [GN_Date],
    [GN_Venue],
    [GN_HostName],
    [GN_MaxPlayers],
    [GN_Notes],
    [GN_IsActive],
    [GN_CreatedAt]
FROM [dbo].[GameNight]
ORDER BY [GN_ID] DESC;