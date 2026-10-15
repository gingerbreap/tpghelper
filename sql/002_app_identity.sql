/*
  Grant read-only access to the App Service system-assigned managed identity.

  Object (principal) ID from App Service → Identity (system assigned):
    7736104c-5f1a-469a-8510-675140b4ada4

  Run in Azure Portal → SQL database [tpghelper] → Query editor,
  signed in with the Microsoft Entra admin account.
*/

-- Website (App Service "tpghelper"): SELECT only
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'tpghelper')
BEGIN
  CREATE USER [tpghelper]
    FROM EXTERNAL PROVIDER
    WITH OBJECT_ID = N'7736104c-5f1a-469a-8510-675140b4ada4';
END
GO

ALTER ROLE db_datareader ADD MEMBER [tpghelper];
GO

PRINT 'Granted db_datareader to [tpghelper].';
GO
