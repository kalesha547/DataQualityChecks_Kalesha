# SQL Query Web API

A secure, production-ready ASP.NET Core Web API for executing SQL queries and returning results in JSON format. Built with security, validation, error handling, logging, and pagination support.

## Features

✅ **SQL Query Execution** - Execute SELECT queries safely and securely
✅ **Input Validation & Security** - Prevents SQL injection and dangerous operations
✅ **Error Handling** - Comprehensive exception handling with detailed error messages
✅ **Structured Logging** - Serilog integration for application and request logging
✅ **Pagination Support** - Built-in pagination with configurable page size (1-1000 rows)
✅ **Swagger/OpenAPI** - Interactive API documentation
✅ **Health Check** - Endpoint to verify API health status
✅ **MCP Compatible** - Returns data in JSON format suitable for Model Context Protocol integration
✅ **Execution Metrics** - Tracks query execution time for performance monitoring

## Prerequisites

- .NET 8.0 SDK or later
- SQL Server 2016 or later
- Visual Studio Code or Visual Studio

## Project Structure

```
SqlQueryAPI/
├── Controllers/
│   └── QueryController.cs          # API endpoints
├── Models/
│   ├── QueryRequest.cs             # Request model with query and pagination
│   ├── QueryResponse.cs            # Response model with results and metadata
│   └── PaginationInfo.cs           # Pagination information
├── Services/
│   ├── SqlQueryService.cs          # SQL execution and data retrieval
│   └── QueryValidatorService.cs    # Query validation and security checks
├── Exceptions/
│   ├── InvalidQueryException.cs    # Invalid query exception
│   └── DatabaseException.cs        # Database operation exception
├── Program.cs                       # Application startup configuration
├── appsettings.json                # Application settings
└── SqlQueryAPI.csproj              # Project file
```

## Configuration

### Connection String

Update the connection string in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER_NAME;Database=YOUR_DATABASE_NAME;User Id=YOUR_USERNAME;Password=YOUR_PASSWORD;TrustServerCertificate=true;"
  }
}
```

Replace:
- `YOUR_SERVER_NAME` - Your SQL Server instance name
- `YOUR_DATABASE_NAME` - Your database name
- `YOUR_USERNAME` - Your SQL Server username
- `YOUR_PASSWORD` - Your SQL Server password

## API Endpoints

### Execute Query

**POST** `/api/query/execute`

Execute a SQL SELECT query and retrieve results with pagination.

#### Request Body

```json
{
  "query": "SELECT * FROM YourTable WHERE Status = 'Active'",
  "pageNumber": 1,
  "pageSize": 100,
  "commandTimeout": 30
}
```

#### Request Parameters

- `query` (string, required): The SQL SELECT query to execute
- `pageNumber` (integer, optional): Page number for pagination (default: 1)
- `pageSize` (integer, optional): Rows per page (default: 100, max: 1000)
- `commandTimeout` (integer, optional): Command timeout in seconds (default: 30)

#### Response

```json
{
  "success": true,
  "data": [
    {
      "ColumnName1": "value1",
      "ColumnName2": "value2"
    }
  ],
  "totalRows": 1500,
  "pageNumber": 1,
  "pageSize": 100,
  "totalPages": 15,
  "errorMessage": null,
  "stackTrace": null,
  "executionTimeMs": 245
}
```

#### Response Fields

- `success` (boolean): Whether the query executed successfully
- `data` (array): Array of objects containing the query results
- `totalRows` (integer): Total number of rows in the result set
- `pageNumber` (integer): Current page number
- `pageSize` (integer): Rows per page
- `totalPages` (integer): Total number of pages available
- `errorMessage` (string): Error description if unsuccessful
- `stackTrace` (string): Stack trace (only in Development environment)
- `executionTimeMs` (integer): Query execution time in milliseconds

### Health Check

**GET** `/api/query/health`

Check the API health status.

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-04-15T10:30:45.123Z"
}
```

## Security Features

### Query Validation

The API only allows **SELECT queries** and blocks:
- `DROP`, `DELETE`, `TRUNCATE` - Data deletion operations
- `ALTER`, `CREATE` - Schema modification operations
- `INSERT`, `UPDATE` - Data modification operations
- `EXEC`, `EXECUTE` - Dynamic execution
- `GRANT`, `REVOKE` - Permission management
- SQL injection patterns and suspicious operators

### Input Validation

- Queries must be non-empty and under 50,000 characters
- Pagination limits: 1-1000 rows per page
- Command timeout validation

## Building and Running

### Build the Project

```bash
cd SqlQueryAPI
dotnet build
```

### Run the Project

```bash
dotnet run
```

The API will start at:
- **HTTPS**: https://localhost:5001
- **HTTP**: http://localhost:5000

### Access Swagger UI

Open your browser and navigate to:
```
https://localhost:5001/swagger
```

## Logging

Logs are written to:
- **Console**: Real-time logging output
- **Files**: `logs/sqlquery-api-{date}.txt` (daily rolling files)
  - Up to 7 days of logs retained
  - File size limit: 10 MB per file

## Example Usage

### Using cURL

```bash
curl -X POST https://localhost:5001/api/query/execute \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT TOP 10 * FROM YourTable",
    "pageNumber": 1,
    "pageSize": 100
  }'
```

### Using PowerShell

```powershell
$body = @{
    query = "SELECT TOP 10 * FROM YourTable"
    pageNumber = 1
    pageSize = 100
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://localhost:5001/api/query/execute" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Using Python

```python
import requests
import json

url = "https://localhost:5001/api/query/execute"
payload = {
    "query": "SELECT TOP 10 * FROM YourTable",
    "pageNumber": 1,
    "pageSize": 100
}

response = requests.post(url, json=payload, verify=False)
result = response.json()
print(json.dumps(result, indent=2))
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- **200 OK** - Query executed successfully
- **400 Bad Request** - Invalid query or request parameters
- **500 Internal Server Error** - Unexpected server error

All error responses include detailed error messages to help with debugging.

## Development

### Adding XML Documentation

To enable XML documentation in Swagger, add to your .csproj file:

```xml
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
</PropertyGroup>
```

### Extending Query Validation

The `QueryValidatorService` can be customized to add additional validation rules. Modify the `DangerousKeywords` array or add new validation methods.

### Custom Error Handling

Middleware can be added to `Program.cs` for global exception handling and custom error responses.

## Performance Considerations

1. **Pagination** - Always use pagination for large result sets to reduce memory usage
2. **Query Optimization** - Ensure your SQL queries are optimized
3. **Command Timeout** - Adjust timeout based on query complexity
4. **Logging** - Logs are asynchronous to minimize performance impact

## Troubleshooting

### Connection String Issues

Ensure the connection string is correct and the SQL Server is accessible. For local development, you may need:
```
Server=.;
Server=localhost;
Server=(localdb)\mssqllocaldb;
```

### Query Validation Errors

If you receive "Query contains dangerous SQL keywords" errors, ensure:
- Only SELECT queries are used
- No DROP, DELETE, INSERT, UPDATE, or ALTER statements
- No dynamic SQL or stored procedure calls

### Port Already in Use

If port 5001 is already in use, change it in `launchSettings.json`

## License

This project is provided as-is for educational and commercial use.

## Support

For issues or questions, please check:
1. The Swagger UI documentation at `/swagger`
2. Application logs in the `logs` directory
3. Event Viewer for system-level errors

---

Built with ❤️ using ASP.NET Core and C#
