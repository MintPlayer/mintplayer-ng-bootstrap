using System.Text.Json;
using MintPlayer.NgBootstrap.Api.QueryBuilder;
using Xunit;

namespace MintPlayer.NgBootstrap.Api.Tests;

/// <summary>
/// The Validator's SubQuery rules, its tree-size limits, and every value-shape
/// case of PRD Appendix C. <see cref="ValidatorTests"/> holds the node-id and
/// field-level rules.
/// </summary>
public class ValidatorShapeTests
{
    private sealed class AlienNode : ExpressionNode { }

    private static string NodeId() => Guid.NewGuid().ToString();

    private static JsonElement Json(object? v) =>
        JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(v));

    private static List<EntitySchemaDto> Orders => EntitySchemaService.AllForOrders();
    private static List<EntitySchemaDto> Customers => EntitySchemaService.AllForCustomers();

    private static GroupNode Group(params ExpressionNode[] children) =>
        new() { Id = NodeId(), Logic = "and", Children = children.ToList() };

    private static ConditionNode Cond(string field, string op, object? value) =>
        new() { Id = NodeId(), Field = field, Operator = op, Value = value };

    private static SubQueryNode Sub(string field, string op, GroupNode? body) =>
        new() { Id = NodeId(), Field = field, Operator = op, SubQuery = body! };

    private static string? CodeOf(ExpressionNode tree, List<EntitySchemaDto> schema)
    {
        try
        {
            Validator.Validate(tree, schema[0], schema);
            return null;
        }
        catch (QueryBuilderException ex)
        {
            return ex.Code;
        }
    }

    // ------------------------------------------------------------ subquery

    [Fact]
    public void Subquery_OverAConfiguredRelation_IsValidAndChecksItsBodyAgainstTheTarget()
    {
        var ok = Group(Sub("lineItems", "in", Group(Cond("unitPrice", "gt", Json(75)))));
        Assert.Null(CodeOf(ok, Orders));

        // "total" exists on orders but not on lineItems: the body is walked
        // against the TARGET entity, not the root.
        var wrongEntity = Group(Sub("lineItems", "not-in", Group(Cond("total", "gt", Json(75)))));
        Assert.Equal("UNKNOWN_FIELD", CodeOf(wrongEntity, Orders));
    }

    [Fact]
    public void Subquery_WithAScalarOperator_IsRejected()
    {
        Assert.Equal("INVALID_SUBQUERY_OPERATOR", CodeOf(Group(Sub("lineItems", "equals", Group())), Orders));
    }

    [Fact]
    public void Subquery_OnAnUnknownField_IsRejected()
    {
        Assert.Equal("UNKNOWN_FIELD", CodeOf(Group(Sub("ghosts", "in", Group())), Orders));
    }

    [Fact]
    public void Subquery_OnAScalarField_IsNotARelation()
    {
        Assert.Equal("SUBQUERY_FIELD_NOT_RELATION", CodeOf(Group(Sub("total", "in", Group())), Orders));
    }

    [Fact]
    public void Subquery_OnARelationWithoutATarget_IsNotARelation()
    {
        var entity = new EntitySchemaDto
        {
            Name = "x",
            Fields = [new FieldDefDto { Name = "kids", Type = "relation", TargetEntity = null }],
        };
        Assert.Equal("SUBQUERY_FIELD_NOT_RELATION", CodeOf(Group(Sub("kids", "in", Group())), [entity]));
    }

    [Fact]
    public void Subquery_WhoseTargetIsMissingFromTheSchema_IsNotConfigured()
    {
        // Only the orders entity is supplied, so its lineItems target cannot resolve.
        Assert.Equal("SUBQUERY_RELATION_NOT_CONFIGURED",
            CodeOf(Group(Sub("lineItems", "in", Group())), [Orders[0]]));
    }

    [Fact]
    public void Subquery_WithoutABody_IsRejected()
    {
        Assert.Equal("SUBQUERY_BODY_NOT_GROUP", CodeOf(Group(Sub("lineItems", "in", null)), Orders));
    }

    // ------------------------------------------------------------- limits

    [Fact]
    public void Tree_NestedDeeperThanMaxDepth_IsRejected()
    {
        GroupNode Nest(int levels) => levels == 0 ? Group() : Group(Nest(levels - 1));

        Assert.Null(CodeOf(Nest(Validator.MaxDepth), Orders));
        Assert.Equal("TREE_TOO_DEEP", CodeOf(Nest(Validator.MaxDepth + 1), Orders));
    }

    [Fact]
    public void Tree_WithMoreThanMaxNodeCountNodes_IsRejected()
    {
        // The root group counts as one node.
        ExpressionNode[] Conds(int n) => Enumerable.Range(0, n).Select(_ => (ExpressionNode)Cond("total", "gt", Json(1))).ToArray();

        Assert.Null(CodeOf(Group(Conds(Validator.MaxNodeCount - 1)), Orders));
        Assert.Equal("TREE_TOO_LARGE", CodeOf(Group(Conds(Validator.MaxNodeCount)), Orders));
    }

    [Fact]
    public void UnknownNodeKind_IsRejected()
    {
        Assert.Equal("UNKNOWN_KIND", CodeOf(Group(new AlienNode { Id = NodeId() }), Orders));
    }

    [Fact]
    public void Condition_OnAFieldTypeTheCatalogDoesNotKnow_HasNoValidOperator()
    {
        var entity = new EntitySchemaDto { Name = "x", Fields = [new FieldDefDto { Name = "blob", Type = "binary" }] };
        Assert.Equal("INVALID_OPERATOR_FOR_TYPE", CodeOf(Group(Cond("blob", "equals", Json(1))), [entity]));
    }

    // -------------------------------------------------------- value shapes

    public static TheoryData<string, string, string?, string?> Shapes => new()
    {
        // field (orders), operator, JSON value (null = C# null), expected code (null = valid)
        { "total",     "is-null",     null,            null },
        { "total",     "is-null",     "null",          null },
        { "total",     "is-null",     "1",             "INVALID_VALUE_SHAPE" },
        { "total",     "between",     "[1,2]",         null },
        { "total",     "not-between", "[1,2,3]",       "INVALID_VALUE_SHAPE" },
        { "total",     "between",     null,            "INVALID_VALUE_SHAPE" },
        { "status",    "in",          "[\"open\"]",    null },
        { "status",    "in",          "\"open\"",      "INVALID_VALUE_SHAPE" },
        { "tags",      "any-of",      null,            "INVALID_VALUE_SHAPE" },
        { "orderDate", "last-n-days", "{\"n\":3}",     null },
        { "orderDate", "next-n-days", "7",             "INVALID_VALUE_SHAPE" },
        { "orderDate", "last-n-days", "{\"m\":3}",     "INVALID_VALUE_SHAPE" },
        { "orderDate", "last-n-days", "{\"n\":\"3\"}", "INVALID_VALUE_SHAPE" },
        { "total",     "equals",      "5",             null },
    };

    [Theory]
    [MemberData(nameof(Shapes))]
    public void ValueShape_IsEnforcedPerOperator(string field, string op, string? json, string? code)
    {
        object? value = json is null ? null : JsonSerializer.Deserialize<JsonElement>(json);
        Assert.Equal(code, CodeOf(Group(Cond(field, op, value)), Orders));
    }

    [Fact]
    public void ArrayValue_LongerThanMaxArrayLength_IsTooLarge()
    {
        var atLimit = Json(Enumerable.Repeat("open", Validator.MaxArrayLength).ToArray());
        var overLimit = Json(Enumerable.Repeat("open", Validator.MaxArrayLength + 1).ToArray());

        Assert.Null(CodeOf(Group(Cond("status", "in", atLimit)), Orders));
        Assert.Equal("VALUE_TOO_LARGE", CodeOf(Group(Cond("status", "not-in", overLimit)), Orders));
    }

    [Fact]
    public void StringValue_LongerThanMaxStringLength_IsTooLargeOnlyOnStringFields()
    {
        var atLimit = Json(new string('a', Validator.MaxStringLength));
        var overLimit = Json(new string('a', Validator.MaxStringLength + 1));

        Assert.Null(CodeOf(Group(Cond("name", "contains", atLimit)), Customers));
        Assert.Equal("VALUE_TOO_LARGE", CodeOf(Group(Cond("name", "contains", overLimit)), Customers));
        // An enum field is bounded by its options, not by the string limit.
        Assert.Null(CodeOf(Group(Cond("country", "equals", overLimit)), Customers));
        // A non-string JSON value on a string field is not length-checked.
        Assert.Null(CodeOf(Group(Cond("name", "equals", Json(42))), Customers));
    }
}
