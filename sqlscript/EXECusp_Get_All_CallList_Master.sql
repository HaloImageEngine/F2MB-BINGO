-- =============================================
-- TEST EXECs
-- =============================================

-- 1) Return ALL records (active and inactive)
EXEC [dbo].[usp_Get_All_CallList_Master];

-- 2) Return ACTIVE records only
EXEC [dbo].[usp_Get_All_CallList_Master]
    @IsActive = 1;

-- 3) Return INACTIVE records only
EXEC [dbo].[usp_Get_All_CallList_Master]
    @IsActive = 0;