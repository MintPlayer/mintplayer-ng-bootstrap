using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MintPlayer.NgBootstrap.Api.Data;
using MintPlayer.NgBootstrap.Api.Models;
using MintPlayer.NgBootstrap.Api.QueryBuilder;

namespace MintPlayer.NgBootstrap.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController(DemoDbContext db) : ControllerBase
{
    [HttpPost("search")]
    public async Task<ActionResult<PagedResult<OrderDto>>> Search([FromBody] QueryRequest req, CancellationToken ct)
    {
        if (req.Query is null) return BadRequest(new { code = "EMPTY_QUERY" });

        var schemas = EntitySchemaService.AllForOrders();
        var rootEntity = schemas[0]; // orders
        Validator.Validate(req.Query, rootEntity, schemas);

        var tz = TzDateMath.ResolveTimezone(req.Timezone);
        var walker = new QueryBuilderWalker<Order>(tz);
        var predicate = walker.Build(req.Query);

        var q = db.Orders.AsQueryable().Where(predicate);

        // Sort.
        if (req.Sort is { Count: > 0 })
        {
            q = ApplySort(q, req.Sort);
        }
        else
        {
            q = q.OrderBy(o => o.Id);
        }

        var totalCount = await q.CountAsync(ct);
        var page = Math.Max(1, req.Page);
        var pageSize = Math.Min(100, Math.Max(1, req.PageSize));
        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                CustomerId = o.CustomerId,
                Total = o.Total,
                Status = o.Status,
                OrderDate = o.OrderDate,
                Tags = o.Tags,
            })
            .ToListAsync(ct);

        return Ok(new PagedResult<OrderDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        });
    }

    [HttpGet("schema")]
    public ActionResult<List<EntitySchemaDto>> Schema() => EntitySchemaService.AllForOrders();

    private static IQueryable<Order> ApplySort(IQueryable<Order> q, List<SortDescriptor> sort)
    {
        IOrderedQueryable<Order>? ordered = null;
        foreach (var s in sort)
        {
            ordered = (ordered, s.Field, s.Direction) switch
            {
                (null, "total", "desc") => q.OrderByDescending(o => o.Total),
                (null, "total", _) => q.OrderBy(o => o.Total),
                (null, "orderDate", "desc") => q.OrderByDescending(o => o.OrderDate),
                (null, "orderDate", _) => q.OrderBy(o => o.OrderDate),
                (null, "status", "desc") => q.OrderByDescending(o => o.Status),
                (null, "status", _) => q.OrderBy(o => o.Status),
                (var o, "total", "desc") => o!.ThenByDescending(x => x.Total),
                (var o, "total", _) => o!.ThenBy(x => x.Total),
                (var o, "orderDate", "desc") => o!.ThenByDescending(x => x.OrderDate),
                (var o, "orderDate", _) => o!.ThenBy(x => x.OrderDate),
                (var o, "status", "desc") => o!.ThenByDescending(x => x.Status),
                (var o, "status", _) => o!.ThenBy(x => x.Status),
                _ => ordered ?? q.OrderBy(o => o.Id),
            };
        }
        return ordered ?? q.OrderBy(o => o.Id);
    }
}

public class OrderDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string Tags { get; set; } = "[]";
}
