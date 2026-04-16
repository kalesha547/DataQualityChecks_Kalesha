using System.Text.RegularExpressions;
using SqlQueryAPI.Exceptions;

namespace SqlQueryAPI.Services;

/// <summary>
/// Service for validating SQL queries for security and correctness
/// </summary>
public class QueryValidatorService
{
    private readonly ILogger<QueryValidatorService> _logger;

    // SQL keywords that indicate dangerous operations (case-insensitive)
    private static readonly string[] DangerousKeywords = new[]
    {
        "DROP", "DELETE", "TRUNCATE", "ALTER", "EXEC", "EXECUTE", 
        "GRANT", "REVOKE", "CREATE", "INSERT", "UPDATE",
        "KILL", "SHUTDOWN", "BACKUP", "RESTORE"
    };

    // Pattern to detect SQL injection attempts
    private static readonly Regex SqlInjectionPattern = new(
        @"(--|;|\/\*|\*\/|xp_|sp_|<|>|={2,})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled
    );

    public QueryValidatorService(ILogger<QueryValidatorService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Validates a SQL query for security and correctness
    /// </summary>
    /// <param name="query">The SQL query to validate</param>
    /// <returns>True if the query is valid for execution</returns>
    /// <exception cref="InvalidQueryException">Thrown if the query is invalid or dangerous</exception>
    public bool ValidateQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            _logger.LogWarning("Query validation failed: Query is empty");
            throw new InvalidQueryException("Query cannot be empty or whitespace.");
        }

        if (query.Length > 50000)
        {
            _logger.LogWarning("Query validation failed: Query exceeds maximum length");
            throw new InvalidQueryException("Query exceeds maximum length of 50,000 characters.");
        }

        // Check for dangerous keywords
        if (ContainsDangerousKeywords(query))
        {
            _logger.LogWarning("Query validation failed: Contains dangerous keywords");
            throw new InvalidQueryException(
                "Query contains dangerous SQL keywords. Only SELECT queries are allowed.");
        }

        // Check for SQL injection patterns
        if (ContainsSuspiciousPatterns(query))
        {
            _logger.LogWarning("Query validation failed: Contains suspicious SQL patterns");
            throw new InvalidQueryException(
                "Query contains suspicious patterns that may indicate SQL injection attempts.");
        }

        _logger.LogInformation("Query validation passed");
        return true;
    }

    /// <summary>
    /// Checks if the query contains dangerous keywords
    /// </summary>
    private bool ContainsDangerousKeywords(string query)
    {
        var trimmedQuery = query.Trim();
        
        // Only allow SELECT queries
        if (!trimmedQuery.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Check if any dangerous keywords appear after the initial SELECT
        var queryAfterSelect = trimmedQuery[6..].TrimStart();
        
        foreach (var keyword in DangerousKeywords)
        {
            // Use word boundary matching to avoid false positives
            var pattern = $@"\b{keyword}\b";
            if (Regex.IsMatch(queryAfterSelect, pattern, RegexOptions.IgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Checks for SQL injection and other suspicious patterns
    /// </summary>
    private bool ContainsSuspiciousPatterns(string query)
    {
        // Check for comments and suspicious operators
        var suspiciousMatches = SqlInjectionPattern.Matches(query);
        
        // Allow some limited patterns but flag certain ones
        foreach (Match match in suspiciousMatches)
        {
            var value = match.Value;
            
            // Allow comments at the end for documentation
            if ((value == "--" || value == "/*" || value == "*/") &&
                query.IndexOf(value, StringComparison.Ordinal) > query.LastIndexOf("FROM", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            // Disallow these patterns
            if (value.StartsWith("xp_") || value.StartsWith("sp_") || value == ";")
            {
                return true;
            }
        }

        return false;
    }
}
