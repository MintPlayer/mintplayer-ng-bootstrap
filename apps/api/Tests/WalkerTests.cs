using System.Text.Json;
using MintPlayer.NgBootstrap.Api.Models;
using MintPlayer.NgBootstrap.Api.QueryBuilder;
using Xunit;

namespace MintPlayer.NgBootstrap.Api.Tests;

public class WalkerTests
{
    private static JsonElement Json(object value) =>
        JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(value));

    private static List<Order> SampleOrders() => new()
    {
        new Order { Id = 1, CustomerId = 1, Total = 150m, Status = "open",      OrderDate = new DateTime(2026, 5, 10, 0, 0, 0, DateTimeKind.Utc), Tags = "[\"urgent\"]" },
        new Order { Id = 2, CustomerId = 1, Total =  50m, Status = "paid",      OrderDate = new DateTime(2026, 5, 14, 0, 0, 0, DateTimeKind.Utc), Tags = "[]" },
        new Order { Id = 3, CustomerId = 2, Total = 500m, Status = "open",      OrderDate = new DateTime(2026, 4, 30, 0, 0, 0, DateTimeKind.Utc), Tags = "[\"blocked\"]" },
        new Order { Id = 4, CustomerId = 3, Total = 999m, Status = "cancelled", OrderDate = new DateTime(2025, 1,  1, 0, 0, 0, DateTimeKind.Utc), Tags = "[]" },
    };

    private static int[] RunQuery(ExpressionNode tree, DateTime? now = null)
    {
        var tz = TimeZoneInfo.Utc;
        var walker = new QueryBuilderWalker<Order>(tz, now ?? DateTime.UtcNow);
        var predicate = walker.Build(tree).Compile();
        return SampleOrders().Where(predicate).Select(o => o.Id).ToArray();
    }

    [Fact]
    public void EmptyAndGroup_ReturnsAll()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new() };
        Assert.Equal(new[] { 1, 2, 3, 4 }, RunQuery(tree));
    }

    [Fact]
    public void EmptyOrGroup_ReturnsNone()
    {
        var tree = new GroupNode { Id = "g", Logic = "or", Children = new() };
        Assert.Empty(RunQuery(tree));
    }

    [Fact]
    public void EqualsNumber_FiltersByExactMatch()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "total", Operator = "equals", Value = Json(50) },
        } };
        Assert.Equal(new[] { 2 }, RunQuery(tree));
    }

    [Fact]
    public void GreaterThan_FiltersAbove()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "total", Operator = "gt", Value = Json(100) },
        } };
        Assert.Equal(new[] { 1, 3, 4 }, RunQuery(tree));
    }

    [Fact]
    public void Between_InclusiveBothEnds()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "total", Operator = "between", Value = Json(new[] { 50, 500 }) },
        } };
        Assert.Equal(new[] { 1, 2, 3 }, RunQuery(tree));
    }

    [Fact]
    public void StringEquals_MatchesValue()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "status", Operator = "equals", Value = Json("open") },
        } };
        Assert.Equal(new[] { 1, 3 }, RunQuery(tree));
    }

    [Fact]
    public void StringContains_SubstringMatch()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "status", Operator = "contains", Value = Json("pen") },
        } };
        Assert.Equal(new[] { 1, 3 }, RunQuery(tree));
    }

    [Fact]
    public void In_ArrayContains()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "status", Operator = "in", Value = Json(new[] { "open", "paid" }) },
        } };
        Assert.Equal(new[] { 1, 2, 3 }, RunQuery(tree));
    }

    [Fact]
    public void IsNull_AgainstNonNullField_ReturnsEmpty()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "status", Operator = "is-null", Value = null },
        } };
        Assert.Empty(RunQuery(tree));
    }

    [Fact]
    public void NestedAndOr_ComputesCorrectly()
    {
        // total > 100 AND (status = "open" OR status = "paid")
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c1", Field = "total", Operator = "gt", Value = Json(100) },
            new GroupNode { Id = "g2", Logic = "or", Children = new()
            {
                new ConditionNode { Id = "c2", Field = "status", Operator = "equals", Value = Json("open") },
                new ConditionNode { Id = "c3", Field = "status", Operator = "equals", Value = Json("paid") },
            } },
        } };
        Assert.Equal(new[] { 1, 3 }, RunQuery(tree));
    }

    [Fact]
    public void Today_FiltersToDateRange()
    {
        var now = new DateTime(2026, 5, 14, 12, 0, 0, DateTimeKind.Utc);
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "orderDate", Operator = "today", Value = null },
        } };
        Assert.Equal(new[] { 2 }, RunQuery(tree, now));
    }

    [Fact]
    public void LastNDays_FiltersBack()
    {
        // 2026-05-14 (now). last-n-days(7) → 2026-05-08 00:00 UTC ≤ d ≤ 2026-05-14 12:00 UTC.
        // Order 1 (2026-05-10) and Order 2 (2026-05-14) qualify; Order 3 (2026-04-30) doesn't.
        var now = new DateTime(2026, 5, 14, 12, 0, 0, DateTimeKind.Utc);
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new ConditionNode { Id = "c", Field = "orderDate", Operator = "last-n-days", Value = Json(new { n = 7 }) },
        } };
        Assert.Equal(new[] { 1, 2 }, RunQuery(tree, now));
    }
}
