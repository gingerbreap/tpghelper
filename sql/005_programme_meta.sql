/*
  Per-programme metadata (data last-updated stamp for About page).
  One row per programme — the live site always shows the current stamp.
  DataSyncHkt is a timezone-naive DATETIME2 meaning Hong Kong wall clock.

  Run as Microsoft Entra admin against database [tpghelper].
*/

IF OBJECT_ID(N'dbo.ProgrammeMeta', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ProgrammeMeta (
    ProgrammeId   NVARCHAR(16)  NOT NULL,  -- msba | mgm | mecon
    DataSyncHkt   DATETIME2(0)  NOT NULL,  -- HKT wall clock (no offset stored)
    CONSTRAINT PK_ProgrammeMeta PRIMARY KEY (ProgrammeId)
  );
END
GO

PRINT 'Schema 005 ProgrammeMeta applied.';
GO
