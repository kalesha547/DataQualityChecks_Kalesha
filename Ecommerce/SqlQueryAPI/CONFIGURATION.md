# Configuration Guide

## SQL Server Connection String

The API connects to SQL Server using the connection string in `appsettings.json`.

### Configuration Examples

#### Local SQL Server (Windows Authentication)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=YourDatabaseName;Trusted_Connection=True;TrustServerCertificate=true;"
  }
}
```

#### Local SQL Server (SQL Authentication)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=YourDatabaseName;User Id=sa;Password=YourPassword;TrustServerCertificate=true;"
  }
}
```

#### Local Database (LocalDB)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=YourDatabaseName;Integrated Security=true;TrustServerCertificate=true;"
  }
}
```

#### Azure SQL Database
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:yourserver.database.windows.net,1433;Initial Catalog=YourDatabaseName;Persist Security Info=False;User ID=youruser@yourserver;Password=YourPassword;Encrypt=True;Connection Timeout=30;"
  }
}
```

#### Remote SQL Server
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=192.168.1.100;Database=YourDatabaseName;User Id=username;Password=password;TrustServerCertificate=true;"
  }
}
```

#### Named Instance
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=ServerName\\InstanceName;Database=YourDatabaseName;Trusted_Connection=True;TrustServerCertificate=true;"
  }
}
```

## Environment-Specific Configuration

Create environment-specific settings files:

### Development Configuration
**appsettings.Development.json**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=YourDev;Integrated Security=true;TrustServerCertificate=true;"
  }
}
```

### Production Configuration
**appsettings.Production.json**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:yourserver.database.windows.net,1433;Initial Catalog=YourProdDB;User ID=produser;Password=SecurePassword123!;Encrypt=True;Connection Timeout=30;"
  }
}
```

### Staging Configuration
**appsettings.Staging.json**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=staging-server;Database=YourStaging;Trusted_Connection=True;TrustServerCertificate=true;"
  }
}
```

## Connection String Parameters Explanation

### Common Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `Server` | SQL Server instance | `.`, `localhost`, `server.database.windows.net` |
| `Database` | Database name | `YourDatabaseName` |
| `User Id` | Login username | `sa`, `username@domain` |
| `Password` | Login password | `YourSecurePassword` |
| `Trusted_Connection` | Windows authentication | `True` / `False` |
| `Integrated Security` | Windows authentication (alternative) | `true` / `false` |
| `TrustServerCertificate` | Accept self-signed certs | `true` / `false` |
| `Encrypt` | Encrypt connection | `True` / `False` |
| `Connection Timeout` | Connection timeout (seconds) | `30` |
| `Pooling` | Use connection pooling | `True` / `False` |
| `Max Pool Size` | Maximum connections in pool | `100` |
| `Min Pool Size` | Minimum connections in pool | `5` |

## Using Environment Variables

For sensitive data like passwords, use environment variables:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=YourDB;User Id=${SQL_USER};Password=${SQL_PASSWORD};TrustServerCertificate=true;"
  }
}
```

Set environment variables:

**Windows Command Prompt:**
```cmd
setx SQL_USER "username"
setx SQL_PASSWORD "password"
```

**PowerShell:**
```powershell
$env:SQL_USER = "username"
$env:SQL_PASSWORD = "password"
```

**Linux/Mac:**
```bash
export SQL_USER="username"
export SQL_PASSWORD="password"
```

## Application Settings

### Logging Configuration

Configure logging levels in `appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "SqlQueryAPI": "Debug"
    }
  }
}
```

Log levels (in order of severity):
- `Trace` - Most detailed (rarely used)
- `Debug` - Detailed information for debugging
- `Information` - General informational messages
- `Warning` - Warning messages
- `Error` - Error messages
- `Critical` - Critical errors
- `None` - No logging

### API Settings

```json
{
  "ApiSettings": {
    "MaxQueryLength": 50000,
    "MaxPageSize": 1000,
    "DefaultPageSize": 100,
    "CommandTimeout": 30,
    "EnableDetailedErrors": true
  }
}
```

## Running with Different Environments

Set the environment before running:

**Development:**
```bash
set ASPNETCORE_ENVIRONMENT=Development
dotnet run
```

**Production:**
```bash
set ASPNETCORE_ENVIRONMENT=Production
dotnet run
```

**Staging:**
```bash
set ASPNETCORE_ENVIRONMENT=Staging
dotnet run
```

## Secrets Management

For production, use safe storage for sensitive configuration:

### User Secrets (Development)
```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "your_connection_string"
dotnet user-secrets list
```

### Azure Key Vault (Production)
```csharp
// In Program.cs
var builder = WebApplication.CreateBuilder(args);

var keyVaultEndpoint = new Uri(builder.Configuration["KeyVault:VaultUri"]);
builder.Configuration.AddAzureKeyVault(
    keyVaultEndpoint,
    new DefaultAzureCredential());
```

## Testing the Connection

Use this query to test database connectivity:

```sql
SELECT 
    @@SERVERNAME AS ServerName,
    DB_NAME() AS DatabaseName,
    CURRENT_USER AS CurrentUser,
    GETDATE() AS CurrentDateTime
```

**cURL Test:**
```bash
curl -X POST https://localhost:5001/api/query/execute \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName, CURRENT_USER AS CurrentUser, GETDATE() AS CurrentDateTime"
  }'
```

## Troubleshooting Connection Issues

### Issue: "Unable to connect to server"
- Verify SQL Server is running
- Check server name/address
- Verify network connectivity
- Check firewall rules

### Issue: "Login failed for user"
- Verify username and password
- Check SQL Server authentication mode (Windows/Mixed)
- Verify user permissions

### Issue: "Database not found"
- Verify database name spelling
- Check user has access to database
- Create database if it doesn't exist

### Issue: "Timeout expired"
- Increase CommandTimeout in request
- Check SQL Server performance
- Optimize queries
- Verify network latency

## Connection String Encryption

For production, encrypt sensitive configuration:

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "your_encrypted_string"
```

Or use Azure Key Vault, AWS Secrets Manager, or similar services.
