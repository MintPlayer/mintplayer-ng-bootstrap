using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MintPlayer.NgBootstrap.Api.Data;
using MintPlayer.NgBootstrap.Api.Models;
using MintPlayer.NgBootstrap.Api.QueryBuilder;

namespace MintPlayer.NgBootstrap.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomersController(DemoDbContext db) : ControllerBase
{
    [HttpPost("search")]
    public async Task<ActionResult<PagedResult<CustomerDto>>> Search([FromBody] QueryRequest req, CancellationToken ct)
    {
        if (req.Query is null) return BadRequest(new { code = "EMPTY_QUERY" });

        var schemas = EntitySchemaService.AllForCustomers();
        var rootEntity = schemas.FirstOrDefault(s => s.Name == "customers")
            ?? throw new QueryBuilderException("SCHEMA_NOT_FOUND", "customers");
        Validator.Validate(req.Query, rootEntity, schemas);

        var tz = TzDateMath.ResolveTimezone(req.Timezone);
        var walker = new QueryBuilderWalker<Customer>(tz);
        var predicate = walker.Build(req.Query);

        var q = SortApplier.Apply(db.Customers.AsQueryable().Where(predicate), req.Sort, c => c.Id);
        var totalCount = await q.CountAsync(ct);
        var page = Math.Max(1, req.Page);
        var pageSize = Math.Min(100, Math.Max(1, req.PageSize));
        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                Country = c.Country,
                Email = c.Email,
                CreatedAt = c.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(new PagedResult<CustomerDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        });
    }

    [HttpGet("schema")]
    public ActionResult<List<EntitySchemaDto>> Schema() => EntitySchemaService.AllForCustomers();

    /// <summary>The columns the datatable demo may filter and list values of (#448).</summary>
    private static readonly IReadOnlySet<string> Filterable = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        nameof(Customer.Name), nameof(Customer.Country), nameof(Customer.Email), nameof(Customer.CreatedAt),
    };

    /// <summary>The demo's <c>fetchParams</c>: <c>{ "search": "…" }</c> narrows by name.</summary>
    private IQueryable<Customer> Filtered(Dictionary<string, DatatableFilter>? filters, System.Text.Json.JsonElement? parameters)
    {
        var q = DatatableFilterApplier.Apply(db.Customers.AsQueryable(), filters, Filterable);
        if (parameters is { ValueKind: System.Text.Json.JsonValueKind.Object } p
            && p.TryGetProperty("search", out var search)
            && search.ValueKind == System.Text.Json.JsonValueKind.String
            && search.GetString() is { Length: > 0 } term)
        {
            var lower = term.ToLower();
            q = q.Where(c => c.Name.ToLower().Contains(lower));
        }
        return q;
    }

    /// <summary>A datatable <c>fetch</c>: page, sort, server-side filters and params in one body (#448).</summary>
    [HttpPost("table")]
    public async Task<ActionResult<DatatableResponse<CustomerDto>>> Table([FromBody] DatatableRequest req, CancellationToken ct)
    {
        var sort = req.SortColumns?
            .Select(c => new SortDescriptor { Field = c.Property, Direction = c.Direction == "descending" ? "desc" : "asc" })
            .ToList();
        var q = SortApplier.Apply(Filtered(req.Filters, req.Params), sort, c => c.Id);
        var perPage = Math.Min(100, Math.Max(1, req.PerPage));
        var page = Math.Max(1, req.Page);
        var totalRecords = await q.CountAsync(ct);
        var data = await q
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .Select(c => new CustomerDto { Id = c.Id, Name = c.Name, Country = c.Country, Email = c.Email, CreatedAt = c.CreatedAt })
            .ToListAsync(ct);
        return Ok(new DatatableResponse<CustomerDto> { Data = data, TotalRecords = totalRecords });
    }

    /// <summary>A datatable <c>distincts</c>: a column's values over the other columns' filters.</summary>
    [HttpPost("distincts")]
    public async Task<ActionResult<DistinctValuesDto>> Distincts([FromBody] DatatableDistinctsRequest req, CancellationToken ct)
    {
        return Ok(await DatatableFilterApplier.DistinctsAsync(
            Filtered(req.Filters, req.Params), req.Column, req.Search, Filterable, 50, (q, token) => q.ToListAsync(token), ct));
    }
}

public class CustomerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
