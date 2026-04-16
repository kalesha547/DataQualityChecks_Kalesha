namespace SqlQueryAPI.Models;

/// <summary>
/// Pagination information for query results
/// </summary>
public class PaginationInfo
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalRows { get; set; }
    public int TotalPages => (TotalRows + PageSize - 1) / PageSize;
    public int SkipRows => (PageNumber - 1) * PageSize;
}
