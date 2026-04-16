using System.Data;
using System.Diagnostics;
using Microsoft.Data.SqlClient;
using SqlQueryAPI.Exceptions;
using SqlQueryAPI.Models;

namespace SqlQueryAPI.Services;

/// <summary>
/// Service for executing SQL queries against SQL Server database
/// </summary>
public class SqlQueryService
{
    private readonly string _connectionString;
    private readonly ILogger<SqlQueryService> _logger;
    private readonly QueryValidatorService _validatorService;

    public SqlQueryService(
        IConfiguration configuration,
        ILogger<SqlQueryService> logger,
        QueryValidatorService validatorService)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        
        _logger = logger;
        _validatorService = validatorService;
    }

    /// <summary>
    /// Executes a SQL query and returns the results as a list of dictionaries
    /// </summary>
    /// <param name="request">Query request containing SQL and pagination info</param>
    /// <returns>Query response with results and metadata</returns>
    public async Task<QueryResponse> ExecuteQueryAsync(QueryRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            // Validate the query
            _validatorService.ValidateQuery(request.Query);

            // Validate pagination parameters
            if (request.PageNumber < 1)
                request.PageNumber = 1;

            if (request.PageSize < 1 || request.PageSize > 1000)
                request.PageSize = 100;

            _logger.LogInformation(
                "Executing query with pagination - Page: {PageNumber}, PageSize: {PageSize}",
                request.PageNumber, request.PageSize);

            using (var connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                // First, get the total row count
                var countQuery = BuildCountQuery(request.Query);
                var totalRows = await GetRowCountAsync(connection, countQuery, request.CommandTimeout);

                // Then, get the paginated results
                var paginatedQuery = BuildPaginatedQuery(request.Query, request.PageNumber, request.PageSize);
                var results = await ExecuteDataQueryAsync(
                    connection, 
                    paginatedQuery, 
                    request.CommandTimeout);

                stopwatch.Stop();

                var totalPages = (totalRows + request.PageSize - 1) / request.PageSize;

                _logger.LogInformation(
                    "Query executed successfully - Total Rows: {TotalRows}, Pages: {TotalPages}, Execution Time: {ExecutionTime}ms",
                    totalRows, totalPages, stopwatch.ElapsedMilliseconds);

                return new QueryResponse
                {
                    Success = true,
                    Data = results,
                    TotalRows = totalRows,
                    PageNumber = request.PageNumber,
                    PageSize = request.PageSize,
                    TotalPages = totalPages,
                    ExecutionTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
        }
        catch (InvalidQueryException ex)
        {
            stopwatch.Stop();
            _logger.LogWarning("Invalid query: {Message}", ex.Message);
            
            return new QueryResponse
            {
                Success = false,
                ErrorMessage = ex.Message,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (SqlException ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Database error during query execution");
            
            return new QueryResponse
            {
                Success = false,
                ErrorMessage = "Database error occurred during query execution.",
                StackTrace = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" 
                    ? ex.ToString() 
                    : null,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Unexpected error during query execution");
            
            return new QueryResponse
            {
                Success = false,
                ErrorMessage = "An unexpected error occurred during query execution.",
                StackTrace = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" 
                    ? ex.ToString() 
                    : null,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    /// <summary>
    /// Gets the total row count for a query
    /// </summary>
    private async Task<int> GetRowCountAsync(SqlConnection connection, string countQuery, int commandTimeout)
    {
        using (var command = new SqlCommand(countQuery, connection))
        {
            command.CommandTimeout = commandTimeout;
            var result = await command.ExecuteScalarAsync();
            
            return result == null || result == DBNull.Value ? 0 : (int)result;
        }
    }

    /// <summary>
    /// Executes a query and returns results as a list of dictionaries
    /// </summary>
    private async Task<List<Dictionary<string, object?>>> ExecuteDataQueryAsync(
        SqlConnection connection, 
        string query, 
        int commandTimeout)
    {
        var results = new List<Dictionary<string, object?>>();

        using (var command = new SqlCommand(query, connection))
        {
            command.CommandTimeout = commandTimeout;
            
            using (var reader = await command.ExecuteReaderAsync(CommandBehavior.SequentialAccess))
            {
                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object?>();
                    
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        var fieldName = reader.GetName(i);
                        var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                        
                        row[fieldName] = value;
                    }
                    
                    results.Add(row);
                }
            }
        }

        return results;
    }

    /// <summary>
    /// Builds a COUNT query from the original SELECT query
    /// </summary>
    private string BuildCountQuery(string originalQuery)
    {
        // Extract the base query without ORDER BY
        var query = RemoveOrderByClause(originalQuery);
        
        // Wrap it in a COUNT query
        return $"SELECT COUNT(*) FROM ({query}) AS CountQuery";
    }

    /// <summary>
    /// Builds a paginated query using OFFSET and FETCH
    /// </summary>
    private string BuildPaginatedQuery(string originalQuery, int pageNumber, int pageSize)
    {
        var offset = (pageNumber - 1) * pageSize;
        
        // If the query doesn't have ORDER BY, add a default one
        if (!originalQuery.Contains("ORDER BY", StringComparison.OrdinalIgnoreCase))
        {
            return $"{originalQuery} ORDER BY (SELECT NULL) OFFSET {offset} ROWS FETCH NEXT {pageSize} ROWS ONLY";
        }

        return $"{originalQuery} OFFSET {offset} ROWS FETCH NEXT {pageSize} ROWS ONLY";
    }

    /// <summary>
    /// Removes the ORDER BY clause from a query (for counting)
    /// </summary>
    private string RemoveOrderByClause(string query)
    {
        var orderByIndex = query.LastIndexOf("ORDER BY", StringComparison.OrdinalIgnoreCase);
        
        if (orderByIndex == -1)
            return query;

        return query[..orderByIndex].TrimEnd();
    }
}
