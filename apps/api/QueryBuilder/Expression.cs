using System.Text.Json.Serialization;

namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

/// <summary>
/// C# DTO mirror of the canonical JSON expression tree shipped by
/// `mp-query-builder` / `bs-query-builder`. See PRD Appendix B for the
/// wire format and Appendix C for value-shape rules.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(GroupNode), typeDiscriminator: "group")]
[JsonDerivedType(typeof(ConditionNode), typeDiscriminator: "condition")]
[JsonDerivedType(typeof(SubQueryNode), typeDiscriminator: "subquery")]
public abstract class ExpressionNode
{
    public string Id { get; set; } = string.Empty;
}

public class GroupNode : ExpressionNode
{
    public string Logic { get; set; } = "and"; // "and" | "or"
    public List<ExpressionNode> Children { get; set; } = new();
}

public class ConditionNode : ExpressionNode
{
    public string Field { get; set; } = string.Empty;
    public string Operator { get; set; } = string.Empty;
    public object? Value { get; set; }
}

public class SubQueryNode : ExpressionNode
{
    public string Field { get; set; } = string.Empty;
    public string Operator { get; set; } = "in"; // "in" | "not-in"
    public GroupNode SubQuery { get; set; } = new();
}

public class QueryRequest
{
    public ExpressionNode? Query { get; set; }
    public string? Timezone { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public List<SortDescriptor>? Sort { get; set; }
}

public class SortDescriptor
{
    public string Field { get; set; } = string.Empty;
    public string Direction { get; set; } = "asc";
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
