namespace SqlQueryAPI.Models;

/// <summary>
/// Response model for SQL query results
/// </summary>
public class QueryResponse
{
    /// <summary>
    /// Indicates if the query executed successfully
    /// </summary>
    public required bool Success { get; set; }

    /// <summary>
    /// Query execution result data
    /// </summary>
    public object? Data { get; set; }

    /// <summary>
    /// Total number of rows in the result set
    /// </summary>
    public int TotalRows { get; set; }

    /// <summary>
    /// Current page number
    /// </summary>
    public int PageNumber { get; set; }

    /// <summary>
    /// Number of rows per page
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Total number of pages available
    /// </summary>
    public int TotalPages { get; set; }

    /// <summary>
    /// Error message if the query failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Stack trace for debugging purposes (only in development)
    /// </summary>
    public string? StackTrace { get; set; }

    /// <summary>
    /// Execution time in milliseconds
    /// </summary>
    public long ExecutionTimeMs { get; set; }
}
