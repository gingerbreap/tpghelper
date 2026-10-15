/*
  tpghelper catalogue schema (Azure SQL).
  Run as Microsoft Entra admin against database [tpghelper].

  Layers:
    Course          — year + code + title
    Outline         — one or more PDFs per course
    Offering        — year + code + module (shared timetable fact)
    Section/Meeting — class schedule
    ProgrammeCourse — which programme may take which offering (+ role)
*/

IF OBJECT_ID(N'dbo.Meeting', N'U') IS NULL
  AND OBJECT_ID(N'dbo.Section', N'U') IS NULL
  AND OBJECT_ID(N'dbo.ProgrammeCourse', N'U') IS NULL
  AND OBJECT_ID(N'dbo.Offering', N'U') IS NULL
  AND OBJECT_ID(N'dbo.Outline', N'U') IS NULL
  AND OBJECT_ID(N'dbo.Course', N'U') IS NULL
BEGIN
  PRINT 'Creating catalogue tables…';
END
GO

IF OBJECT_ID(N'dbo.Course', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Course (
    AcademicYear   NVARCHAR(10)  NOT NULL,  -- e.g. 26-27
    CourseCode     NVARCHAR(32)  NOT NULL,  -- e.g. PMGM7001
    CoursePrefix   NVARCHAR(16)  NOT NULL,  -- PMGM
    CourseNumber   NVARCHAR(16)  NOT NULL,  -- 7001
    CourseTitle    NVARCHAR(500) NOT NULL,
    UpdatedAt      DATETIME2     NOT NULL CONSTRAINT DF_Course_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Course PRIMARY KEY (AcademicYear, CourseCode)
  );
END
GO

IF OBJECT_ID(N'dbo.Outline', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Outline (
    OutlineId      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Outline_Id DEFAULT NEWSEQUENTIALID(),
    AcademicYear   NVARCHAR(10)  NOT NULL,
    CourseCode     NVARCHAR(32)  NOT NULL,
    OutlineKey     NVARCHAR(64)  NOT NULL,  -- shared | AB | CD | M1 | …
    PdfUrl         NVARCHAR(1000) NULL,     -- absolute https or site-root path
    CONSTRAINT PK_Outline PRIMARY KEY (OutlineId),
    CONSTRAINT UQ_Outline UNIQUE (AcademicYear, CourseCode, OutlineKey),
    CONSTRAINT FK_Outline_Course FOREIGN KEY (AcademicYear, CourseCode)
      REFERENCES dbo.Course (AcademicYear, CourseCode) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'dbo.Offering', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Offering (
    OfferingId     UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Offering_Id DEFAULT NEWSEQUENTIALID(),
    AcademicYear   NVARCHAR(10)  NOT NULL,
    CourseCode     NVARCHAR(32)  NOT NULL,
    Module         INT           NOT NULL,
    HostProgramme  NVARCHAR(16)  NOT NULL,  -- msba | mgm | mecon (TP source)
    ExamOrFinalJson NVARCHAR(MAX) NULL,
    PartsJson      NVARCHAR(MAX) NULL,
    CONSTRAINT PK_Offering PRIMARY KEY (OfferingId),
    CONSTRAINT UQ_Offering UNIQUE (AcademicYear, CourseCode, Module),
    CONSTRAINT FK_Offering_Course FOREIGN KEY (AcademicYear, CourseCode)
      REFERENCES dbo.Course (AcademicYear, CourseCode) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'dbo.Section', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Section (
    SectionRowId   UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Section_Id DEFAULT NEWSEQUENTIALID(),
    OfferingId     UNIQUEIDENTIFIER NOT NULL,
    SectionId      NVARCHAR(8)   NOT NULL,  -- A | B | …
    Part           NVARCHAR(16)  NULL,
    OutlineId      UNIQUEIDENTIFIER NULL,
    InstructorsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Section_Instructors DEFAULT N'[]',
    TimeBucket     NVARCHAR(8)   NOT NULL,
    DayPattern     NVARCHAR(200) NULL,
    MeetingDaysJson NVARCHAR(100) NULL,
    OutlinePdfPath NVARCHAR(1000) NULL,     -- legacy relative path if OutlineId unset
    ExamOrFinalJson NVARCHAR(MAX) NULL,
    CONSTRAINT PK_Section PRIMARY KEY (SectionRowId),
    CONSTRAINT UQ_Section UNIQUE (OfferingId, SectionId),
    CONSTRAINT FK_Section_Offering FOREIGN KEY (OfferingId)
      REFERENCES dbo.Offering (OfferingId) ON DELETE CASCADE,
    CONSTRAINT FK_Section_Outline FOREIGN KEY (OutlineId)
      REFERENCES dbo.Outline (OutlineId)
  );
END
GO

IF OBJECT_ID(N'dbo.Meeting', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Meeting (
    MeetingId      BIGINT IDENTITY(1,1) NOT NULL,
    SectionRowId   UNIQUEIDENTIFIER NOT NULL,
    MeetingDate    DATE          NOT NULL,
    StartTime      NVARCHAR(8)   NOT NULL,
    EndTime        NVARCHAR(8)   NOT NULL,
    Venue          NVARCHAR(200) NULL,
    SessionType    NVARCHAR(20)  NOT NULL,  -- lecture | tutorial
    InstructorsJson NVARCHAR(MAX) NULL,
    TutorialForJson NVARCHAR(MAX) NULL,
    CONSTRAINT PK_Meeting PRIMARY KEY (MeetingId),
    CONSTRAINT FK_Meeting_Section FOREIGN KEY (SectionRowId)
      REFERENCES dbo.Section (SectionRowId) ON DELETE CASCADE
  );
  CREATE INDEX IX_Meeting_Section ON dbo.Meeting (SectionRowId);
END
GO

IF OBJECT_ID(N'dbo.ProgrammeCourse', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ProgrammeCourse (
    ProgrammeId    NVARCHAR(16)  NOT NULL,  -- msba | mgm | mecon
    AcademicYear   NVARCHAR(10)  NOT NULL,
    CourseCode     NVARCHAR(32)  NOT NULL,
    Module         INT           NOT NULL,
    CourseType     NVARCHAR(32)  NOT NULL,  -- Core | Elective | …
    CourseTypesJson NVARCHAR(MAX) NULL,
    StreamTagsJson NVARCHAR(MAX) NULL,
    OfferedToStreamsJson NVARCHAR(MAX) NULL,
    CapstoneForStreamsJson NVARCHAR(MAX) NULL,
    StreamCoreForStreamsJson NVARCHAR(MAX) NULL,
    CoreForStreamsJson NVARCHAR(MAX) NULL,
    CONSTRAINT PK_ProgrammeCourse PRIMARY KEY (ProgrammeId, AcademicYear, CourseCode, Module),
    CONSTRAINT FK_ProgrammeCourse_Offering FOREIGN KEY (AcademicYear, CourseCode, Module)
      REFERENCES dbo.Offering (AcademicYear, CourseCode, Module) ON DELETE CASCADE
  );
END
GO

PRINT 'Schema 001 applied.';
GO
