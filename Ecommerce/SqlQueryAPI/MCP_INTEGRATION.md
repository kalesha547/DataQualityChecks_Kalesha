# MCP Integration Guide

This document provides guidance on integrating the SQL Query Web API with Model Context Protocol (MCP) servers.

## Overview

The SQL Query Web API returns data in JSON format that is fully compatible with MCP specification. The API can be easily integrated as a tool or resource within MCP servers.

## API Response Format

The API returns JSON responses with the following structure:

```json
{
  "success": true,
  "data": [
    {
      "column1": "value1",
      "column2": "value2"
    }
  ],
  "totalRows": 100,
  "pageNumber": 1,
  "pageSize": 100,
  "totalPages": 1,
  "errorMessage": null,
  "stackTrace": null,
  "executionTimeMs": 150
}
```

## Integration Approaches

### 1. Direct HTTP Integration

Use standard HTTP client libraries to call the API:

```python
import requests
import json

class SQLQueryMCPTool:
    def __init__(self, api_url: str = "https://localhost:5001"):
        self.api_url = api_url
    
    def execute_query(self, query: str, page_number: int = 1, page_size: int = 100):
        """Execute a SQL query through the API"""
        response = requests.post(
            f"{self.api_url}/api/query/execute",
            json={
                "query": query,
                "pageNumber": page_number,
                "pageSize": page_size
            },
            verify=False  # For development/self-signed certificates
        )
        return response.json()
```

### 2. As an MCP Tool

Register the API as an MCP tool that can be called by language models:

**Tool Configuration Example:**

```json
{
  "name": "execute_sql_query",
  "description": "Execute a read-only SQL query and retrieve results",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The SQL SELECT query to execute"
      },
      "pageNumber": {
        "type": "integer",
        "description": "Page number for pagination (default: 1)",
        "default": 1
      },
      "pageSize": {
        "type": "integer",
        "description": "Rows per page (default: 100, max: 1000)",
        "default": 100
      }
    },
    "required": ["query"]
  }
}
```

### 3. As an MCP Resource

Expose database metadata as MCP resources:

**Example Resource:**

```
resource://database/schema
resource://database/tables/{tableName}
resource://database/query/{queryId}
```

## Example: Node.js MCP Server Integration

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";

const server = new Server({
  name: "sql-query-server",
  version: "1.0.0",
});

const API_URL = process.env.SQL_API_URL || "https://localhost:5001";

// Register the execute_sql_query tool
server.setRequestHandler(resources.ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "database://health",
        name: "API Health Status",
        mimeType: "application/json",
      },
    ],
  };
});

// Register tool for executing queries
server.setRequestHandler(tools.ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_sql_query",
        description: "Execute a read-only SQL query",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL SELECT query",
            },
            pageNumber: {
              type: "integer",
              default: 1,
            },
            pageSize: {
              type: "integer",
              default: 100,
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(tools.CallToolRequestSchema, async (request) => {
  if (request.params.name === "execute_sql_query") {
    const { query, pageNumber, pageSize } = request.params.arguments;

    try {
      const response = await axios.post(`${API_URL}/api/query/execute`, {
        query,
        pageNumber: pageNumber || 1,
        pageSize: pageSize || 100,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
server.connect(transport);
```

## Example: Python MCP Server Integration

```python
from mcp.server import Server
from mcp.types import Tool, TextContent
import httpx
import json

server = Server("sql-query-mcp")
client = httpx.AsyncClient(
    verify=False,  # For development
    base_url="https://localhost:5001"
)

@server.call_tool()
async def execute_sql_query(query: str, pageNumber: int = 1, pageSize: int = 100):
    """Execute a SQL query and return results"""
    try:
        response = await client.post(
            "/api/query/execute",
            json={
                "query": query,
                "pageNumber": pageNumber,
                "pageSize": pageSize,
            }
        )
        result = response.json()
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}", is_error=True)]

@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="execute_sql_query",
            description="Execute a read-only SQL query",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "SQL SELECT query"
                    },
                    "pageNumber": {
                        "type": "integer",
                        "default": 1
                    },
                    "pageSize": {
                        "type": "integer",
                        "default": 100
                    }
                },
                "required": ["query"]
            }
        )
    ]
```

## Data Transformation for MCP

The API response can be transformed for MCP compatibility:

```python
def transform_for_mcp(api_response: dict) -> dict:
    """Transform API response to MCP format"""
    if not api_response["success"]:
        return {
            "error": api_response["errorMessage"],
            "executionTime": api_response["executionTimeMs"]
        }
    
    return {
        "rows": api_response["data"],
        "metadata": {
            "totalRows": api_response["totalRows"],
            "pageNumber": api_response["pageNumber"],
            "pageSize": api_response["pageSize"],
            "totalPages": api_response["totalPages"],
            "executionTimeMs": api_response["executionTimeMs"]
        }
    }
```

## Security Considerations for MCP

1. **Authentication**: Add API key validation to `QueryController.cs`
2. **Rate Limiting**: Implement rate limiting middleware
3. **Query Logging**: Audit all queries executed through MCP
4. **CORS Configuration**: Configure appropriate CORS policies
5. **HTTPS**: Always use HTTPS in production
6. **Certificate Validation**: Handle certificate validation in MCP clients

## Example: Adding API Key Authentication

```csharp
// In Program.cs
builder.Services.AddScoped<ApiKeyValidationMiddleware>();

// Middleware
public class ApiKeyValidationMiddleware
{
    private readonly RequestDelegate _next;
    private const string ApiKeyHeader = "X-API-Key";

    public ApiKeyValidationMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue(ApiKeyHeader, out var apiKey) ||
            !IsValidApiKey(apiKey))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" });
            return;
        }

        await _next(context);
    }

    private bool IsValidApiKey(string? key) =>
        key == Environment.GetEnvironmentVariable("SQL_API_KEY");
}
```

## Testing with MCP CLI

Example commands for testing the API:

```bash
# Health check
curl https://localhost:5001/api/query/health

# Execute query with MCP-compatible response
curl -X POST https://localhost:5001/api/query/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "query": "SELECT * FROM YourTable WHERE Status = '\''Active'\''",
    "pageNumber": 1,
    "pageSize": 100
  }'
```

## Performance Optimization for MCP

1. **Use pagination** for large result sets
2. **Set appropriate timeouts** based on query complexity
3. **Cache frequently accessed queries**
4. **Monitor execution times** in logs
5. **Optimize SQL queries** before exposing via MCP

## Troubleshooting

### SSL Certificate Issues

For development with self-signed certificates:

```python
import httpx
import ssl

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

client = httpx.AsyncClient(verify=ssl_context)
```

### Connection Timeouts

Adjust timeouts in the query request:

```json
{
  "query": "SELECT * FROM LargeTable",
  "commandTimeout": 60
}
```

### Response Size Limits

Use pagination to manage response sizes:

```json
{
  "query": "SELECT * FROM HugeTable",
  "pageNumber": 1,
  "pageSize": 50
}
```

## Additional Resources

- [MCP Specification](https://spec.modelcontextprotocol.io)
- [SQL Server Documentation](https://docs.microsoft.com/sql)
- [ASP.NET Core Documentation](https://learn.microsoft.com/aspnet/core)
