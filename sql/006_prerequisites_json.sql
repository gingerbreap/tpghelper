/*
  PrerequisitesJson + PrerequisiteNotesJson on ProgrammeCourse.
  Safe to re-run (IF COL_LENGTH checks).
*/

IF COL_LENGTH('dbo.ProgrammeCourse', 'PrerequisitesJson') IS NULL
BEGIN
  ALTER TABLE dbo.ProgrammeCourse ADD PrerequisitesJson NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.ProgrammeCourse', 'PrerequisiteNotesJson') IS NULL
BEGIN
  ALTER TABLE dbo.ProgrammeCourse ADD PrerequisiteNotesJson NVARCHAR(MAX) NULL;
END
GO
