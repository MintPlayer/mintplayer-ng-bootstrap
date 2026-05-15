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
}

public class CustomerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
