using MintPlayer.NgBootstrap.Api.Models;
using MintPlayer.NgBootstrap.Api.QueryBuilder;
using Xunit;

namespace MintPlayer.NgBootstrap.Api.Tests;

public class SortApplierTests
{
    private static List<Order> Sample() => new()
    {
        new Order { Id = 3, CustomerId = 1, Total = 100m, Status = "open",      OrderDate = new DateTime(2026, 4, 1,  0, 0, 0, DateTimeKind.Utc), Tags = "[\"urgent\"]" },
        new Order { Id = 1, CustomerId = 3, Total =  50m, Status = "paid",      OrderDate = new DateTime(2026, 4, 2,  0, 0, 0, DateTimeKind.Utc), Tags = "[\"blocked\"]" },
        new Order { Id = 4, CustomerId = 1, Total = 200m, Status = "cancelled", OrderDate = new DateTime(2026, 5, 10, 0, 0, 0, DateTimeKind.Utc), Tags = "[]" },
        new Order { Id = 2, CustomerId = 2, Total = 200m, Status = "open",      OrderDate = new DateTime(2026, 5, 14, 0, 0, 0, DateTimeKind.Utc), Tags = "[]" },
    };

    private static int[] Apply(List<SortDescriptor>? sort) =>
        SortApplier.Apply(Sample().AsQueryable(), sort, o => o.Id).Select(o => o.Id).ToArray();

    [Fact]
    public void NullSort_FallsBackToDefaultKey()
    {
        Assert.Equal(new[] { 1, 2, 3, 4 }, Apply(null));
    }

    [Fact]
    public void EmptySort_FallsBackToDefaultKey()
    {
        Assert.Equal(new[] { 1, 2, 3, 4 }, Apply(new()));
    }

    [Fact]
    public void TotalAsc_SortsByTotal()
    {
        Assert.Equal(new[] { 1, 3, 4, 2 }, Apply(new() { new() { Field = "total", Direction = "asc" } }));
    }

    [Fact]
    public void TotalDesc_SortsByTotalDescending()
    {
        // Id-tie between 4 and 2 (both total=200); native sort isn't stable per LINQ,
        // but with .NET 6+ the in-memory provider preserves insertion order. Sample()
        // inserts 4 before 2 → expect 4, 2, 3, 1.
        Assert.Equal(new[] { 4, 2, 3, 1 }, Apply(new() { new() { Field = "total", Direction = "desc" } }));
    }

    [Fact]
    public void OrderDateAsc_SortsByDate()
    {
        Assert.Equal(new[] { 3, 1, 4, 2 }, Apply(new() { new() { Field = "orderDate", Direction = "asc" } }));
    }

    [Fact]
    public void StatusAsc_AlphabetizesStatus()
    {
        // cancelled, open, open, paid → ids 4, 3, 2 (open ties), 1.
        var result = Apply(new() { new() { Field = "status", Direction = "asc" } });
        Assert.Equal("cancelled", Sample().First(o => o.Id == result[0]).Status);
        Assert.Equal("paid", Sample().First(o => o.Id == result[^1]).Status);
    }

    [Fact]
    public void CustomerIdSort_NowWorks_WasBrokenInOldSwitch()
    {
        // Was silently falling back to OrderBy(Id) before the schema-driven
        // refactor. Now sorts by CustomerId — expect 3, 4 (both 1), 2, 1.
        var result = Apply(new() { new() { Field = "customerId", Direction = "asc" } });
        Assert.Equal(1, Sample().First(o => o.Id == result[0]).CustomerId);
        Assert.Equal(3, Sample().First(o => o.Id == result[^1]).CustomerId);
    }

    [Fact]
    public void TagsSort_NowWorks_WasBrokenInOldSwitch()
    {
        // Sorting by the raw Tags JSON string is admittedly weird UX, but it
        // shouldn't no-op. After the refactor, the field is honored.
        var result = Apply(new() { new() { Field = "tags", Direction = "asc" } });
        Assert.NotEqual(new[] { 1, 2, 3, 4 }, result); // would-be default fallback
    }

    [Fact]
    public void UnknownField_IsSkippedNotThrown()
    {
        // Stray sort descriptor with a non-existent field name should be
        // silently dropped; remaining (or default) sort applies.
        var result = Apply(new()
        {
            new() { Field = "does_not_exist", Direction = "asc" },
            new() { Field = "total", Direction = "asc" },
        });
        Assert.Equal(new[] { 1, 3, 4, 2 }, result);
    }

    [Fact]
    public void AllUnknownFields_FallBackToDefaultKey()
    {
        var result = Apply(new()
        {
            new() { Field = "does_not_exist", Direction = "asc" },
            new() { Field = "also_missing", Direction = "desc" },
        });
        Assert.Equal(new[] { 1, 2, 3, 4 }, result);
    }

    [Fact]
    public void MultiSort_AppliesOrderBy_ThenThenBy()
    {
        // Primary by Total asc, secondary by OrderDate desc to tie-break 200/200.
        // Total: 50, 100, 200, 200. Then for the two 200s (ids 4, 2),
        // OrderDate desc → 2 (2026-05-14) before 4 (2026-05-10).
        var result = Apply(new()
        {
            new() { Field = "total", Direction = "asc" },
            new() { Field = "orderDate", Direction = "desc" },
        });
        Assert.Equal(new[] { 1, 3, 2, 4 }, result);
    }
}
