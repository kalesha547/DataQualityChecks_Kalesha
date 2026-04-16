namespace SqlQueryAPI.Models;

/// <summary>
/// Request model for executing SQL queries
/// </summary>
public class QueryRequest
{
    /// <summary>
    /// The SQL query to execute
    /// </summary>
    public required string Query { get; set; }

    /// <summary>
    /// Page number for pagination (default: 1)
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// Page size for pagination (default: 100, max: 1000)
    /// </summary>
    public int PageSize { get; set; } = 100;

    /// <summary>
    /// Connection timeout in seconds (default: 30)
    /// </summary>
    public int CommandTimeout { get; set; } = 30;
}
