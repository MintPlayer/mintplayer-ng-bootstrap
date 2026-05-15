namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

public class QueryBuilderException(string code, string? detail = null)
    : Exception($"{code}{(detail is null ? string.Empty : $": {detail}")}")
{
    public string Code { get; } = code;
    public string? Detail { get; } = detail;
}
