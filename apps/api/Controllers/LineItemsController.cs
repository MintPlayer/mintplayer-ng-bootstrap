using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MintPlayer.NgBootstrap.Api.Data;
using MintPlayer.NgBootstrap.Api.Models;
using MintPlayer.NgBootstrap.Api.QueryBuilder;

namespace MintPlayer.NgBootstrap.Api.Controllers;

[ApiController]
[Route("api/lineItems")]
public class LineItemsController(DemoDbContext db) : ControllerBase
{
    [HttpPost("search")]
    public async Task<ActionResult<PagedResult<LineItemDto>>> Search([FromBody] QueryRequest req, CancellationToken ct)
    {
        if (req.Query is null) return BadRequest(new { code = "EMPTY_QUERY" });

        var schemas = EntitySchemaService.AllForLineItems();
        var rootEntity = schemas.FirstOrDefault(s => s.Name == "lineItems")
            ?? throw new QueryBuilderException("SCHEMA_NOT_FOUND", "lineItems");
        Validator.Validate(req.Query, rootEntity, schemas);

        var tz = TzDateMath.ResolveTimezone(req.Timezone);
        var walker = new QueryBuilderWalker<LineItem>(tz);
        var predicate = walker.Build(req.Query);

        var q = SortApplier.Apply(db.LineItems.AsQueryable().Where(predicate), req.Sort, li => li.Id);
        var totalCount = await q.CountAsync(ct);
        var page = Math.Max(1, req.Page);
        var pageSize = Math.Min(100, Math.Max(1, req.PageSize));
        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(li => new LineItemDto
            {
                Id = li.Id,
                OrderId = li.OrderId,
                ProductName = li.ProductName,
                UnitPrice = li.UnitPrice,
                Quantity = li.Quantity,
            })
            .ToListAsync(ct);

        return Ok(new PagedResult<LineItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        });
    }

    [HttpGet("schema")]
    public ActionResult<List<EntitySchemaDto>> Schema() => EntitySchemaService.AllForLineItems();
}

public class LineItemDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}
