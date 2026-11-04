/*
  Common Elective / cross-list metadata on ProgrammeCourse.
  Safe to re-run (IF COL_LENGTH checks).
*/

IF COL_LENGTH('dbo.ProgrammeCourse', 'CommonElective') IS NULL
BEGIN
  ALTER TABLE dbo.ProgrammeCourse ADD CommonElective BIT NOT NULL
    CONSTRAINT DF_ProgrammeCourse_CommonElective DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.ProgrammeCourse', 'OtherRequirementsJson') IS NULL
BEGIN
  ALTER TABLE dbo.ProgrammeCourse ADD OtherRequirementsJson NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.ProgrammeCourse', 'CrossListJson') IS NULL
BEGIN
  ALTER TABLE dbo.ProgrammeCourse ADD CrossListJson NVARCHAR(MAX) NULL;
END
GO
