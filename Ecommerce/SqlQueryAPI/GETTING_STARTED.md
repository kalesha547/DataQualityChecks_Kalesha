# Getting Started Guide

This guide will help you quickly get the SQL Query Web API up and running.

## 5-Minute Quick Start

### Step 1: Configure Database Connection

Edit `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=YOUR_DATABASE;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=true;"
  }
}
```

Replace placeholders with your SQL Server details.

### Step 2: Run the API

```bash
cd SqlQueryAPI
dotnet run
```

### Step 3: Test the API

Open your browser: **https://localhost:5001/swagger**

### Step 4: Execute Your First Query

In Swagger UI, click on **POST** `/api/query/execute` and try:

```json
{
  "query": "SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName, CURRENT_USER AS CurrentUser, GETDATE() AS ServerTime",
  "pageNumber": 1,
  "pageSize": 100
}
```

Click **Execute** to see the results!

---

## Feature Overview

### 1. Execute SQL Queries

The API allows you to execute SELECT queries safely:

```json
POST /api/query/execute

{
  "query": "SELECT TOP 100 * FROM YourTable WHERE Status = 'Active'",
  "pageNumber": 1,
  "pageSize": 100
}
```

### 2. Pagination

Automatically handle large result sets with pagination:

```json
{
  "query": "SELECT * FROM Orders",
  "pageNumber": 2,
  "pageSize": 50
}
```

Response includes:
- `totalRows` - Total matching records
- `totalPages` - Total pages available
- `pageNumber` - Current page
- `pageSize` - Rows per page

### 3. Security

Only SELECT queries are allowed. The API blocks:
- ❌ DROP, DELETE, TRUNCATE (data deletion)
- ❌ INSERT, UPDATE (data modification)
- ❌ ALTER, CREATE (schema changes)
- ❌ SQL injection attempts
- ❌ Dynamic SQL execution (EXEC, xp_, sp_)

### 4. Error Handling

Comprehensive error responses with clear messages:

```json
{
  "success": false,
  "errorMessage": "Query contains dangerous SQL keywords. Only SELECT queries are allowed.",
  "executionTimeMs": 5
}
```

### 5. Logging

All operations are logged to:
- Console (real-time)
- Files in `logs/` directory (daily rolling)

### 6. Performance Metrics

Each response includes execution time:

```json
{
  "success": true,
  "data": [...],
  "executionTimeMs": 245
}
```

---

## Common Use Cases

### Query with Filtering

```json
{
  "query": "SELECT ProductId, ProductName, Price FROM Products WHERE Category = 'Electronics' AND Price > 100",
  "pageNumber": 1,
  "pageSize": 20
}
```

### Query with Sorting

```json
{
  "query": "SELECT * FROM Orders ORDER BY OrderDate DESC",
  "pageNumber": 1,
  "pageSize": 50
}
```

### Query with Aggregation

```json
{
  "query": "SELECT Status, COUNT(*) AS OrderCount, SUM(Amount) AS TotalAmount FROM Orders GROUP BY Status",
  "pageNumber": 1,
  "pageSize": 100
}
```

### Query with Joins

```json
{
  "query": "SELECT o.OrderId, o.OrderDate, c.CustomerName FROM Orders o JOIN Customers c ON o.CustomerId = c.CustomerId WHERE o.OrderDate > '2024-01-01'",
  "pageNumber": 1,
  "pageSize": 100
}
```

### Query with Complex Conditions

```json
{
  "query": "SELECT * FROM Products WHERE (Category = 'Electronics' OR Category = 'Computers') AND Price BETWEEN 100 AND 5000 AND Stock > 0",
  "pageNumber": 1,
  "pageSize": 25
}
```

---

## API Response Examples

### Successful Response

```json
{
  "success": true,
  "data": [
    {
      "Id": 1,
      "Name": "John Doe",
      "Email": "john@example.com",
      "Status": "Active"
    },
    {
      "Id": 2,
      "Name": "Jane Smith",
      "Email": "jane@example.com",
      "Status": "Active"
    }
  ],
  "totalRows": 250,
  "pageNumber": 1,
  "pageSize": 2,
  "totalPages": 125,
  "errorMessage": null,
  "executionTimeMs": 156
}
```

### Error Response (Invalid Query)

```json
{
  "success": false,
  "data": null,
  "totalRows": 0,
  "pageNumber": 1,
  "pageSize": 100,
  "totalPages": 0,
  "errorMessage": "Query contains dangerous SQL keywords. Only SELECT queries are allowed.",
  "executionTimeMs": 3
}
```

### Error Response (Database Error)

```json
{
  "success": false,
  "data": null,
  "totalRows": 0,
  "pageNumber": 1,
  "pageSize": 100,
  "totalPages": 0,
  "errorMessage": "Database error occurred during query execution.",
  "stackTrace": null,
  "executionTimeMs": 45
}
```

---

## Testing the API

### Using cURL

```bash
# Basic query
curl -X POST https://localhost:5001/api/query/execute \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "query": "SELECT TOP 10 * FROM YourTable"
  }'

# Health check
curl -X GET https://localhost:5001/api/query/health -k
```

### Using PowerShell

```powershell
# Execute query
$uri = "https://localhost:5001/api/query/execute"
$body = @{
    query = "SELECT TOP 10 * FROM YourTable"
    pageNumber = 1
    pageSize = 100
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri $uri `
  -Method POST `
  -ContentType "application/json" `
  -Body $body `
  -SkipCertificateCheck

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

### Using Python

```python
import requests
import json
import urllib3

# Disable SSL warning for self-signed certificates
urllib3.disable_warnings()

url = "https://localhost:5001/api/query/execute"
headers = {"Content-Type": "application/json"}
payload = {
    "query": "SELECT TOP 10 * FROM YourTable",
    "pageNumber": 1,
    "pageSize": 100
}

response = requests.post(url, json=payload, headers=headers, verify=False)
result = response.json()
print(json.dumps(result, indent=2))
```

### Using Node.js

```javascript
const axios = require('axios');
const https = require('https');

// Skip certificate verification for self-signed certificates
const agent = new https.Agent({ rejectUnauthorized: false });

const url = 'https://localhost:5001/api/query/execute';
const data = {
    query: 'SELECT TOP 10 * FROM YourTable',
    pageNumber: 1,
    pageSize: 100
};

axios.post(url, data, { httpsAgent: agent })
    .then(response => {
        console.log(JSON.stringify(response.data, null, 2));
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
```

---

## Project Structure

```
SqlQueryAPI/
├── Controllers/
│   └── QueryController.cs              # API endpoints
├── Services/
│   ├── SqlQueryService.cs              # Database operations
│   └── QueryValidatorService.cs        # Query validation & security
├── Models/
│   ├── QueryRequest.cs                 # Request model
│   ├── QueryResponse.cs                # Response model
│   └── PaginationInfo.cs               # Pagination model
├── Exceptions/
│   ├── InvalidQueryException.cs        # Invalid query errors
│   └── DatabaseException.cs            # Database errors
├── Program.cs                          # Application configuration
└── appsettings.json                    # Settings
```

---

## Configuration Files

### appsettings.json
Main application settings including connection strings and logging.

### appsettings.Development.json
Development-specific settings (debug logging, local database).

### appsettings.Production.json
Production-specific settings (reduced logging, production database).

---

## Database Requirements

The API works with any SQL Server database. No special setup required, just basic access permissions:

- SELECT permission on required tables
- VIEW DEFINITION permission (for query optimization)

Example permission script:

```sql
-- Create API user
CREATE LOGIN api_user WITH PASSWORD = 'YourSecurePassword123!';

-- Create database user
CREATE USER api_user FOR LOGIN api_user;

-- Grant SELECT permission to specific schemas
GRANT SELECT ON SCHEMA::dbo TO api_user;
```

---

## Troubleshooting

### Port 5001 Already in Use

Change the port in `appsettings.json`:

```json
{
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://localhost:5002"
      }
    }
  }
}
```

### Connection String Error

Test your connection string with SQL Server Management Studio first, then update the configuration.

### SSL Certificate Error

For development, the self-signed certificate is normal. When testing, use `-k` flag (cURL) or `verify=False` (Python).

### Query Returns No Results

1. Verify the query is valid in SQL Server Management Studio
2. Check table and column names (case-sensitive properties)
3. Verify user has SELECT permissions
4. Check any WHERE clause filters

### Timeout Errors

Increase the `commandTimeout` in the request:

```json
{
  "query": "SELECT * FROM LargeTable",
  "commandTimeout": 60
}
```

---

## Next Steps

1. **Review Security** - Read [CONFIGURATION.md](CONFIGURATION.md) for security best practices
2. **Integrate with MCP** - See [MCP_INTEGRATION.md](MCP_INTEGRATION.md) for integration examples
3. **Deploy to Production** - Follow [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options
4. **Monitor Performance** - Check logs in the `logs/` directory
5. **Customize** - Extend the API for your specific needs

---

## Support & Resources

- Swagger UI Documentation: https://localhost:5001/swagger
- README.md: Full documentation
- Configuration Guide: [CONFIGURATION.md](CONFIGURATION.md)
- MCP Integration: [MCP_INTEGRATION.md](MCP_INTEGRATION.md)
- Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Tips & Best Practices

✅ Always use pagination for large queries
✅ Use appropriate query timeouts
✅ Keep API connection string secure
✅ Monitor logs for errors and performance
✅ Test queries in SSMS before using API
✅ Use specific column names instead of SELECT *
✅ Add appropriate indexes for frequently queried columns
✅ Implement row-level security at the database level

---

Happy querying! 🚀
