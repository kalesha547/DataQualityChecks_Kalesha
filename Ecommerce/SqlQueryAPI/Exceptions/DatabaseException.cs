namespace SqlQueryAPI.Exceptions;

/// <summary>
/// Exception thrown when database operations fail
/// </summary>
public class DatabaseException : Exception
{
    public DatabaseException(string message) : base(message)
    {
    }

    public DatabaseException(string message, Exception innerException) 
        : base(message, innerException)
    {
    }
}
