using Microsoft.AspNetCore.Mvc;
using SqlQueryAPI.Models;
using SqlQueryAPI.Services;

namespace SqlQueryAPI.Controllers;

/// <summary>
/// API controller for executing SQL queries
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class QueryController : ControllerBase
{
    private readonly SqlQueryService _queryService;
    private readonly ILogger<QueryController> _logger;

    public QueryController(SqlQueryService queryService, ILogger<QueryController> logger)
    {
        _queryService = queryService;
        _logger = logger;
    }

    /// <summary>
    /// Executes a SQL query and returns results in JSON format
    /// </summary>
    /// <param name="request">The query request containing SQL and pagination parameters</param>
    /// <returns>Query results with metadata and pagination information</returns>
    /// <remarks>
    /// Sample request:
    ///
    ///     POST /api/query/execute
    ///     {
    ///       "query": "SELECT * FROM YourTable WHERE Status = 'Active'",
    ///       "pageNumber": 1,
    ///       "pageSize": 100,
    ///       "commandTimeout": 30
    ///     }
    ///
    /// Note: Only SELECT queries are allowed. Other operations (INSERT, UPDATE, DELETE, DROP, etc.) are blocked for security.
    /// </remarks>
    [HttpPost("execute")]
    [ProducesResponseType(typeof(QueryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(QueryResponse), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<QueryResponse>> ExecuteQuery([FromBody] QueryRequest request)
    {
        _logger.LogInformation("Query execution request received");

        if (request == null)
        {
            _logger.LogWarning("Query request is null");
            return BadRequest(new QueryResponse
            {
                Success = false,
                ErrorMessage = "Request body cannot be null."
            });
        }

        var response = await _queryService.ExecuteQueryAsync(request);

        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    /// <summary>
    /// Health check endpoint
    /// </summary>
    /// <returns>Simple health status</returns>
    [HttpGet("health")]
    public IActionResult Health()
    {
        _logger.LogInformation("Health check requested");
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}
