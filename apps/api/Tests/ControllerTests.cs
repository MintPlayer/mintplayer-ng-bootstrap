using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MintPlayer.NgBootstrap.Api.QueryBuilder;
using Xunit;

namespace MintPlayer.NgBootstrap.Api.Tests;

/// <summary>
/// End-to-end over the real pipeline: JSON polymorphic deserialization →
/// validation → walker → EF Core → SQLite → camelCase response.
///
/// The unit suites all run the walker's expressions against in-memory lists,
/// where any expression compiles. These are the only tests that prove the same
/// expressions TRANSLATE to SQL — a walker change that produces an untranslatable
/// tree passes every other suite and 500s in production.
/// </summary>
public class ControllerTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly JsonSerializerOptions Camel = new(JsonSerializerDefaults.Web);

    private HttpClient Client => factory.CreateClient();

    private static QueryRequest Search(ExpressionNode query, int page = 1, int pageSize = 20,
        List<SortDescriptor>? sort = null, string? timezone = null) =>
        new() { Query = query, Page = page, PageSize = pageSize, Sort = sort, Timezone = timezone };

    // Node ids must be UUID v4 — Validator rejects anything else with
    // INVALID_NODE_ID before it ever looks at the fields.
    private static string NodeId() => Guid.NewGuid().ToString();

    private static GroupNode All() => new() { Id = NodeId(), Logic = "and", Children = [] };

    private static GroupNode Where(string field, string op, object? value) => new()
    {
        Id = NodeId(),
        Logic = "and",
        Children = [new ConditionNode { Id = NodeId(), Field = field, Operator = op, Value = value }],
    };

    private async Task<PagedResult<T>> PostSearchAsync<T>(string path, QueryRequest request)
    {
        var response = await Client.PostAsJsonAsync(path, request, Camel);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<PagedResult<T>>(Camel))!;
    }

    // ------------------------------------------------------------------- root

    [Fact]
    public async Task Root_ReportsOk()
    {
        var body = await Client.GetFromJsonAsync<JsonElement>("/");
        Assert.Equal("ok", body.GetProperty("status").GetString());
    }

    // --------------------------------------------------------------- schemas

    [Theory]
    [InlineData("/api/orders/schema", "orders")]
    [InlineData("/api/customers/schema", "customers")]
    [InlineData("/api/lineItems/schema", "lineItems")]
    public async Task Schema_DescribesItsRootEntity(string path, string rootName)
    {
        var schemas = await Client.GetFromJsonAsync<JsonElement>(path);
        var names = schemas.EnumerateArray().Select(s => s.GetProperty("name").GetString()).ToArray();
        Assert.Contains(rootName, names);
    }

    // The demos deserialize these responses with camelCase property names; a
    // change to the JSON options in Program.cs breaks every one of them at once.
    [Fact]
    public async Task Schema_IsSerializedInCamelCase()
    {
        var schemas = await Client.GetFromJsonAsync<JsonElement>("/api/orders/schema");
        var propertyNames = schemas.EnumerateArray()
            .SelectMany(entity => entity.EnumerateObject().Select(p => p.Name))
            .Distinct();
        Assert.All(propertyNames, name => Assert.False(char.IsUpper(name[0]), name));
    }

    // ---------------------------------------------------------------- search

    [Fact]
    public async Task Search_WithAnEmptyGroup_ReturnsSeededRows()
    {
        var result = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All()));
        Assert.NotEmpty(result.Items);
        Assert.True(result.TotalCount >= result.Items.Count);
    }

    [Fact]
    public async Task Search_WithoutAQuery_Is400()
    {
        var response = await Client.PostAsJsonAsync("/api/orders/search", new QueryRequest(), Camel);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("EMPTY_QUERY", body.GetProperty("code").GetString());
    }

    // The middleware in Program.cs is the only thing turning a domain error into
    // a typed 400 — without it these surface as a 500 with a stack trace.
    [Fact]
    public async Task Search_WithAnUnknownField_Is400WithATypedCode()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/orders/search", Search(Where("nope", "eq", 1)), Camel);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("UNKNOWN_FIELD", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Search_WithAnInvalidTimezone_Is400()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/orders/search", Search(All(), timezone: "Mars/Olympus_Mons"), Camel);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("INVALID_TIMEZONE", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Search_FiltersOnAStringField()
    {
        var result = await PostSearchAsync<OrderRow>(
            "/api/orders/search", Search(Where("status", "equals", "open"), pageSize: 100));
        Assert.NotEmpty(result.Items);
        Assert.All(result.Items, o => Assert.Equal("open", o.Status));
    }

    [Fact]
    public async Task Search_FiltersOnANumericComparison()
    {
        var result = await PostSearchAsync<OrderRow>(
            "/api/orders/search", Search(Where("total", "gt", 100), pageSize: 100));
        Assert.All(result.Items, o => Assert.True(o.Total > 100));
    }

    // A relative-date operator resolves through TzDateMath and lands in the SQL
    // as a bounded range — the join between that unit and the database.
    [Fact]
    public async Task Search_TranslatesARelativeDateOperator()
    {
        var result = await PostSearchAsync<OrderRow>(
            "/api/orders/search",
            Search(Where("orderDate", "this-year", null), pageSize: 100, timezone: "Europe/Brussels"));
        Assert.All(result.Items, o => Assert.Equal(DateTime.UtcNow.Year, o.OrderDate.Year));
    }

    [Fact]
    public async Task Search_CombinesConditionsWithOr()
    {
        var query = new GroupNode
        {
            Id = NodeId(),
            Logic = "or",
            Children =
            [
                new ConditionNode { Id = NodeId(), Field = "status", Operator = "equals", Value = "open" },
                new ConditionNode { Id = NodeId(), Field = "status", Operator = "equals", Value = "paid" },
            ],
        };
        var result = await PostSearchAsync<OrderRow>("/api/orders/search", Search(query, pageSize: 100));
        Assert.All(result.Items, o => Assert.Contains(o.Status, new[] { "open", "paid" }));
    }

    // --------------------------------------------------------------- paging

    [Fact]
    public async Task Search_PagesWithoutOverlap()
    {
        var first = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All(), page: 1, pageSize: 2));
        var second = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All(), page: 2, pageSize: 2));
        Assert.Equal(2, first.Items.Count);
        Assert.Empty(first.Items.Select(o => o.Id).Intersect(second.Items.Select(o => o.Id)));
        Assert.Equal(first.TotalCount, second.TotalCount);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(-5, 1)]
    public async Task Search_ClampsPageToTheFirst(int requested, int expected)
    {
        var result = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All(), page: requested));
        Assert.Equal(expected, result.Page);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(-1, 1)]
    [InlineData(1000, 100)]
    public async Task Search_ClampsPageSizeToItsBounds(int requested, int expected)
    {
        var result = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All(), pageSize: requested));
        Assert.Equal(expected, result.PageSize);
    }

    [Fact]
    public async Task Search_TotalCountIgnoresPaging()
    {
        var small = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All(), pageSize: 1));
        var large = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All(), pageSize: 100));
        Assert.Equal(large.TotalCount, small.TotalCount);
        Assert.Single(small.Items);
    }

    // --------------------------------------------------------------- sorting

    [Fact]
    public async Task Search_SortsAscendingThroughTheDatabase()
    {
        var sort = new List<SortDescriptor> { new() { Field = "total", Direction = "asc" } };
        var result = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All(), pageSize: 100, sort: sort));
        Assert.Equal(result.Items.Select(o => o.Total).Order(), result.Items.Select(o => o.Total));
    }

    [Fact]
    public async Task Search_SortsDescendingThroughTheDatabase()
    {
        var sort = new List<SortDescriptor> { new() { Field = "total", Direction = "desc" } };
        var result = await PostSearchAsync<OrderRow>("/api/orders/search", Search(All(), pageSize: 100, sort: sort));
        Assert.Equal(result.Items.Select(o => o.Total).OrderDescending(), result.Items.Select(o => o.Total));
    }

    // ------------------------------------------------------- other entities

    [Fact]
    public async Task Customers_Search_Works()
    {
        var result = await PostSearchAsync<CustomerRow>("/api/customers/search", Search(All()));
        Assert.NotEmpty(result.Items);
        Assert.All(result.Items, c => Assert.False(string.IsNullOrWhiteSpace(c.Name)));
    }

    [Fact]
    public async Task LineItems_Search_Works()
    {
        var result = await PostSearchAsync<LineItemRow>("/api/lineItems/search", Search(All()));
        Assert.NotEmpty(result.Items);
        Assert.All(result.Items, li => Assert.True(li.OrderId > 0));
    }

    // -------------------------------------------------------------- treeitems

    [Fact]
    public async Task TreeItems_ReturnsOnlyRoots()
    {
        var roots = await Client.GetFromJsonAsync<PagedResult<TreeRow>>("/api/treeItems?perPage=200", Camel);
        Assert.NotEmpty(roots!.Items);
        Assert.All(roots.Items, t => Assert.Null(t.ParentId));
    }

    [Fact]
    public async Task TreeItems_ReturnsTheChildrenOfARoot()
    {
        var roots = await Client.GetFromJsonAsync<PagedResult<TreeRow>>("/api/treeItems", Camel);
        var parent = roots!.Items.First(t => t.ChildCount > 0);
        var children = await Client.GetFromJsonAsync<PagedResult<TreeRow>>(
            $"/api/treeItems/{parent.Id}/children?perPage=200", Camel);
        Assert.NotEmpty(children!.Items);
        Assert.All(children.Items, t => Assert.Equal(parent.Id, t.ParentId));
    }

    [Fact]
    public async Task TreeItems_ChildrenOfANonExistentParentIsAnEmptyPage()
    {
        var children = await Client.GetFromJsonAsync<PagedResult<TreeRow>>(
            "/api/treeItems/999999/children", Camel);
        Assert.Empty(children!.Items);
        Assert.Equal(0, children.TotalCount);
    }

    [Fact]
    public async Task TreeItems_SortsByName()
    {
        var result = await Client.GetFromJsonAsync<PagedResult<TreeRow>>(
            "/api/treeItems?sort=name:asc&perPage=200", Camel);
        var names = result!.Items.Select(t => t.Name).ToArray();
        Assert.Equal(names.OrderBy(n => n, StringComparer.Ordinal).ToArray(), names);
    }

    [Fact]
    public async Task TreeItems_FallsBackToIdOnAnUnknownSortField()
    {
        var result = await Client.GetFromJsonAsync<PagedResult<TreeRow>>(
            "/api/treeItems?sort=nonsense:asc&perPage=200", Camel);
        var ids = result!.Items.Select(t => t.Id).ToArray();
        Assert.Equal(ids.Order().ToArray(), ids);
    }

    [Fact]
    public async Task TreeItems_EmptySearchReturnsNothing()
    {
        var result = await Client.GetFromJsonAsync<PagedResult<TreeRow>>("/api/treeItems/search?q=", Camel);
        Assert.Empty(result!.Items);
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task TreeItems_SearchMatchesAcrossTheWholeTree()
    {
        var roots = await Client.GetFromJsonAsync<PagedResult<TreeRow>>("/api/treeItems", Camel);
        var parent = roots!.Items.First(t => t.ChildCount > 0);
        var child = (await Client.GetFromJsonAsync<PagedResult<TreeRow>>(
            $"/api/treeItems/{parent.Id}/children", Camel))!.Items.First();

        var result = await Client.GetFromJsonAsync<PagedResult<TreeRow>>(
            $"/api/treeItems/search?q={Uri.EscapeDataString(child.Name)}&perPage=200", Camel);
        Assert.Contains(result!.Items, t => t.Id == child.Id);
    }

    // The SQLite provider translates string.Contains to instr(), which is
    // case-SENSITIVE — the controller's ToLower() calls are load-bearing, and
    // this is the assertion that keeps them.
    [Fact]
    public async Task TreeItems_SearchIsCaseInsensitive()
    {
        var roots = await Client.GetFromJsonAsync<PagedResult<TreeRow>>("/api/treeItems", Camel);
        var name = roots!.Items.First().Name;

        var lower = await Client.GetFromJsonAsync<PagedResult<TreeRow>>(
            $"/api/treeItems/search?q={Uri.EscapeDataString(name.ToLowerInvariant())}&perPage=200", Camel);
        var upper = await Client.GetFromJsonAsync<PagedResult<TreeRow>>(
            $"/api/treeItems/search?q={Uri.EscapeDataString(name.ToUpperInvariant())}&perPage=200", Camel);

        Assert.NotEmpty(lower!.Items);
        Assert.Equal(lower.Items.Select(t => t.Id), upper!.Items.Select(t => t.Id));
    }

    [Fact]
    public async Task TreeItems_ClampsPerPage()
    {
        var result = await Client.GetFromJsonAsync<PagedResult<TreeRow>>("/api/treeItems?perPage=5000", Camel);
        Assert.Equal(200, result!.PageSize);
    }

    // Rows shaped like the DTOs, declared here so a controller's DTO staying
    // internal cannot make these tests stop compiling.
    private sealed record OrderRow(int Id, int CustomerId, decimal Total, string Status, DateTime OrderDate, string Tags);
    private sealed record CustomerRow(int Id, string Name, string Country, string Email, DateTime CreatedAt);
    private sealed record LineItemRow(int Id, int OrderId, string ProductName, decimal UnitPrice, int Quantity);
    private sealed record TreeRow(int Id, int? ParentId, string Name, string Code, int Headcount, int ChildCount);
}
