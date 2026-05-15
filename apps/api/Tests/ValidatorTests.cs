using System.Text.Json;
using MintPlayer.NgBootstrap.Api.QueryBuilder;
using Xunit;

namespace MintPlayer.NgBootstrap.Api.Tests;

public class ValidatorTests
{
    // Fixed UUID v4 strings used as test ids — the validator now enforces
    // PRD Appendix D rule #4 (every id MUST be syntactically UUID v4).
    private const string GroupId = "11111111-1111-4111-8111-111111111111";
    private const string ConditionId = "22222222-2222-4222-8222-222222222222";
    private const string SubId = "33333333-3333-4333-8333-333333333333";

    private static List<EntitySchemaDto> Schema => EntitySchemaService.AllForOrders();
    private static EntitySchemaDto RootEntity => Schema[0];

    private static JsonElement Json(object v) =>
        JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(v));

    [Fact]
    public void ValidSimpleQuery_DoesNotThrow()
    {
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = ConditionId, Field = "total", Operator = "gt", Value = Json(100) },
        } };
        Validator.Validate(tree, RootEntity, Schema);
    }

    [Fact]
    public void UnknownField_ThrowsUNKNOWN_FIELD()
    {
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = ConditionId, Field = "bogus", Operator = "equals", Value = Json("x") },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("UNKNOWN_FIELD", ex.Code);
    }

    [Fact]
    public void OperatorMismatchedToFieldType_ThrowsINVALID_OPERATOR_FOR_TYPE()
    {
        // "contains" on a number field.
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = ConditionId, Field = "total", Operator = "contains", Value = Json("abc") },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_OPERATOR_FOR_TYPE", ex.Code);
    }

    [Fact]
    public void InvalidLogic_ThrowsINVALID_LOGIC()
    {
        var tree = new GroupNode { Id = GroupId, Logic = "xor", Children = new() };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_LOGIC", ex.Code);
    }

    [Fact]
    public void DuplicateNodeIds_ThrowsDUPLICATE_NODE_ID()
    {
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = GroupId, Field = "total", Operator = "gt", Value = Json(1) },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("DUPLICATE_NODE_ID", ex.Code);
    }

    [Fact]
    public void EmptyNodeId_ThrowsINVALID_NODE_ID()
    {
        var tree = new GroupNode { Id = "", Logic = "and", Children = new() };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_NODE_ID", ex.Code);
    }

    [Fact]
    public void NonUuidNodeId_ThrowsINVALID_NODE_ID()
    {
        var tree = new GroupNode { Id = "not-a-uuid", Logic = "and", Children = new() };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_NODE_ID", ex.Code);
    }

    [Fact]
    public void UuidWithWrongVersionNibble_ThrowsINVALID_NODE_ID()
    {
        // Valid syntax, but version nibble is 1 instead of 4 → not v4.
        var tree = new GroupNode { Id = "11111111-1111-1111-8111-111111111111", Logic = "and", Children = new() };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_NODE_ID", ex.Code);
    }

    [Fact]
    public void ConditionOnRelationField_ThrowsFIELD_IS_RELATION()
    {
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = ConditionId, Field = "lineItems", Operator = "equals", Value = Json(1) },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("FIELD_IS_RELATION", ex.Code);
    }

    [Fact]
    public void BetweenWithoutTuple_ThrowsINVALID_VALUE_SHAPE()
    {
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = ConditionId, Field = "total", Operator = "between", Value = Json(50) },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_VALUE_SHAPE", ex.Code);
    }

    [Fact]
    public void LastNDaysWithNZero_ThrowsINVALID_VALUE_SHAPE()
    {
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = ConditionId, Field = "orderDate", Operator = "last-n-days", Value = Json(new { n = 0 }) },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_VALUE_SHAPE", ex.Code);
    }

    [Fact]
    public void NullScalarValue_ThrowsINVALID_VALUE_SHAPE()
    {
        // `equals` on a number requires a non-null scalar; without this guard
        // the walker would attempt Expression.Constant on a non-nullable decimal
        // and crash at request time.
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = ConditionId, Field = "total", Operator = "equals", Value = null },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_VALUE_SHAPE", ex.Code);
    }

    [Fact]
    public void JsonNullScalarValue_AlsoThrowsINVALID_VALUE_SHAPE()
    {
        // Same as above but the value is an explicit JsonElement of null kind.
        var tree = new GroupNode { Id = GroupId, Logic = "and", Children = new()
        {
            new ConditionNode { Id = ConditionId, Field = "status", Operator = "equals", Value = Json((string?)null!) },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_VALUE_SHAPE", ex.Code);
    }
}
