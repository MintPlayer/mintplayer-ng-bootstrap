using System.Text.Json;
using MintPlayer.NgBootstrap.Api.QueryBuilder;
using Xunit;

namespace MintPlayer.NgBootstrap.Api.Tests;

public class ValidatorTests
{
    private static List<EntitySchemaDto> Schema => EntitySchemaService.AllForOrders();
    private static EntitySchemaDto RootEntity => Schema[0];

    private static JsonElement Json(object v) =>
        JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(v));

    [Fact]
    public void ValidSimpleQuery_DoesNotThrow()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "total", Operator = "gt", Value = Json(100) },
        } };
        Validator.Validate(tree, RootEntity, Schema);
    }

    [Fact]
    public void UnknownField_ThrowsUNKNOWN_FIELD()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "bogus", Operator = "equals", Value = Json("x") },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("UNKNOWN_FIELD", ex.Code);
    }

    [Fact]
    public void OperatorMismatchedToFieldType_ThrowsINVALID_OPERATOR_FOR_TYPE()
    {
        // "contains" on a number field.
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "total", Operator = "contains", Value = Json("abc") },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_OPERATOR_FOR_TYPE", ex.Code);
    }

    [Fact]
    public void InvalidLogic_ThrowsINVALID_LOGIC()
    {
        var tree = new GroupNode { Id = "g", Logic = "xor", Children = new() };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_LOGIC", ex.Code);
    }

    [Fact]
    public void DuplicateNodeIds_ThrowsDUPLICATE_NODE_ID()
    {
        var tree = new GroupNode { Id = "x", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "x", Field = "total", Operator = "gt", Value = Json(1) },
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
    public void ConditionOnRelationField_ThrowsFIELD_IS_RELATION()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "lineItems", Operator = "equals", Value = Json(1) },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("FIELD_IS_RELATION", ex.Code);
    }

    [Fact]
    public void BetweenWithoutTuple_ThrowsINVALID_VALUE_SHAPE()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "total", Operator = "between", Value = Json(50) },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_VALUE_SHAPE", ex.Code);
    }

    [Fact]
    public void LastNDaysWithNZero_ThrowsINVALID_VALUE_SHAPE()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "orderDate", Operator = "last-n-days", Value = Json(new { n = 0 }) },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Validator.Validate(tree, RootEntity, Schema));
        Assert.Equal("INVALID_VALUE_SHAPE", ex.Code);
    }
}
