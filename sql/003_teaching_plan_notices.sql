/*
  Teaching Plan notices (per programme). Full notice payload as JSON
  so the React UI can keep the existing TeachingPlanNotice shape.

  Run as Microsoft Entra admin against database [tpghelper].
*/

IF OBJECT_ID(N'dbo.TeachingPlanNotice', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.TeachingPlanNotice (
    ProgrammeId   NVARCHAR(16)  NOT NULL,  -- msba | mgm | mecon
    NoticeId      NVARCHAR(64)  NOT NULL,
    AcademicYear  NVARCHAR(10)  NOT NULL CONSTRAINT DF_TPN_Year DEFAULT N'26-27',
    PublishedAt   NVARCHAR(32)  NOT NULL,  -- display stamp, e.g. 2026/10/12 18:36
    SortIndex     INT           NOT NULL CONSTRAINT DF_TPN_Sort DEFAULT 0, -- 0 = newest
    PayloadJson   NVARCHAR(MAX) NOT NULL,
    UpdatedAt     DATETIME2     NOT NULL CONSTRAINT DF_TPN_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TeachingPlanNotice PRIMARY KEY (ProgrammeId, NoticeId)
  );
  CREATE INDEX IX_TPN_Programme_Sort
    ON dbo.TeachingPlanNotice (ProgrammeId, SortIndex, PublishedAt DESC);
END
GO

PRINT 'Schema 003 TeachingPlanNotice applied.';
GO
