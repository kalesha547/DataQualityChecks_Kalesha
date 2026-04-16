namespace SqlQueryAPI.Exceptions;

/// <summary>
/// Exception thrown when a SQL query is invalid or dangerous
/// </summary>
public class InvalidQueryException : Exception
{
    public InvalidQueryException(string message) : base(message)
    {
    }

    public InvalidQueryException(string message, Exception innerException) 
        : base(message, innerException)
    {
    }
}
