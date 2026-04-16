# SQL Query Web API Project

ASP.NET Core Web API for executing SQL queries and returning JSON results with security, validation, error handling, logging, and pagination.

## Project Details
- **Type**: ASP.NET Core Web API
- **Language**: C#
- **Database**: SQL Server
- **Format**: JSON
- **Features**: Query validation, Security, Error handling, Logging, Pagination

## Completion Status
- [x] Project scaffolding - ASP.NET Core Web API created with .NET 8.0
- [x] Project customization - Services, models, controllers, and configuration implemented
- [x] Build compilation - Project builds successfully
- [x] Task creation - Ready for launch
- [x] Documentation complete - README.md and MCP_INTEGRATION.md created

## Quick Start

1. **Configure Connection String**
   - Edit `SqlQueryAPI/appsettings.json`
   - Update SQL Server connection string with your server details

2. **Run the API**
   ```bash
   cd SqlQueryAPI
   dotnet run
   ```

3. **Access Swagger UI**
   - Open: https://localhost:5001/swagger
   - Try the `/api/query/execute` endpoint

## Key Features Implemented

✅ SQL Query Execution - Execute SELECT queries safely
✅ Security - SQL injection prevention, dangerous keyword blocking
✅ Validation - Input validation with query length limits
✅ Error Handling - Comprehensive exception handling
✅ Logging - Serilog integration with file and console output
✅ Pagination - Configurable page size (1-1000 rows)
✅ MCP Integration - JSON format compatible with Model Context Protocol
✅ Health Check - API status verification endpoint
✅ Swagger/OpenAPI - Interactive API documentation

## Project Structure

```
SqlQueryAPI/
├── Controllers/QueryController.cs      - API endpoints
├── Services/
│   ├── SqlQueryService.cs             - Query execution
│   └── QueryValidatorService.cs       - Security validation
├── Models/                            - Request/response models
├── Exceptions/                        - Custom exceptions
├── Program.cs                         - Configuration
├── appsettings.json                   - Settings
├── README.md                          - Full documentation
└── MCP_INTEGRATION.md                 - MCP integration guide
```

## API Endpoints

- **POST** `/api/query/execute` - Execute SQL query with pagination
- **GET** `/api/query/health` - Health check endpoint

## Next Steps

1. Configure your SQL Server connection string
2. Deploy or run the API
3. Test with Swagger UI
4. Integrate with MCP servers using guidance in MCP_INTEGRATION.md

See README.md for comprehensive documentation.

