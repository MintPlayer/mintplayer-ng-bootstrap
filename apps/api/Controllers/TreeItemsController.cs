using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MintPlayer.NgBootstrap.Api.Data;
using MintPlayer.NgBootstrap.Api.Models;
using MintPlayer.NgBootstrap.Api.QueryBuilder;

namespace MintPlayer.NgBootstrap.Api.Controllers;

[ApiController]
[Route("api/treeItems")]
public class TreeItemsController(DemoDbContext db) : ControllerBase
{
    /// <summary>
    /// GET /api/treeItems?page=&amp;perPage=&amp;sort=name:asc
    /// Returns the root rows (ParentId == null). Paged.
    /// </summary>
    [HttpGet]
    public Task<ActionResult<PagedResult<TreeItemDto>>> GetRoots(
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 50,
        [FromQuery] string? sort = null,
        CancellationToken ct = default)
        => PageAsync(db.TreeItems.Where(t => t.ParentId == null), sort, page, perPage, ct);

    /// <summary>
    /// GET /api/treeItems/{parentId}/children?page=&amp;perPage=&amp;sort=name:asc
    /// Returns the direct children of the given item. Works for any depth (root or nested).
    /// </summary>
    [HttpGet("{parentId:int}/children")]
    public Task<ActionResult<PagedResult<TreeItemDto>>> GetChildren(
        int parentId,
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 50,
        [FromQuery] string? sort = null,
        CancellationToken ct = default)
        => PageAsync(db.TreeItems.Where(t => t.ParentId == parentId), sort, page, perPage, ct);

    /// <summary>
    /// GET /api/treeItems/search?q=&amp;page=&amp;perPage=
    /// Server-side search across the whole tree. Returns a flat, paged list of
    /// items whose Name or Code contains <paramref name="q"/> (case-insensitive).
    /// Empty query returns an empty page. Backs the tree-select server-search demo.
    /// </summary>
    [HttpGet("search")]
    public Task<ActionResult<PagedResult<TreeItemDto>>> Search(
        [FromQuery] string q = "",
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 50,
        CancellationToken ct = default)
    {
        var term = (q ?? string.Empty).Trim().ToLower();
        if (term.Length == 0)
            return PageAsync(db.TreeItems.Where(_ => false), null, page, perPage, ct);

        return PageAsync(
            db.TreeItems.Where(t => t.Name.ToLower().Contains(term) || t.Code.ToLower().Contains(term)),
            "name:asc", page, perPage, ct);
    }

    private static async Task<ActionResult<PagedResult<TreeItemDto>>> PageAsync(
        IQueryable<TreeItem> q, string? sort, int page, int perPage, CancellationToken ct)
    {
        q = ApplySort(q, sort);
        var totalCount = await q.CountAsync(ct);
        var clampedPerPage = Math.Min(200, Math.Max(1, perPage));
        var clampedPage = Math.Max(1, page);
        var items = await q
            .Skip((clampedPage - 1) * clampedPerPage)
            .Take(clampedPerPage)
            .Select(t => new TreeItemDto
            {
                Id = t.Id,
                ParentId = t.ParentId,
                Name = t.Name,
                Code = t.Code,
                Headcount = t.Headcount,
                ChildCount = t.ChildCount,
            })
            .ToListAsync(ct);

        return new OkObjectResult(new PagedResult<TreeItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = clampedPage,
            PageSize = clampedPerPage,
        });
    }

    private static IQueryable<TreeItem> ApplySort(IQueryable<TreeItem> q, string? sort)
    {
        if (string.IsNullOrWhiteSpace(sort)) return q.OrderBy(t => t.Id);
        var parts = sort.Split(':');
        var field = parts[0].ToLowerInvariant();
        var desc = parts.Length > 1 && parts[1].Equals("desc", StringComparison.OrdinalIgnoreCase);
        return (field, desc) switch
        {
            ("name",       false) => q.OrderBy(t => t.Name),
            ("name",       true)  => q.OrderByDescending(t => t.Name),
            ("code",       false) => q.OrderBy(t => t.Code),
            ("code",       true)  => q.OrderByDescending(t => t.Code),
            ("headcount",  false) => q.OrderBy(t => t.Headcount),
            ("headcount",  true)  => q.OrderByDescending(t => t.Headcount),
            ("childcount", false) => q.OrderBy(t => t.ChildCount),
            ("childcount", true)  => q.OrderByDescending(t => t.ChildCount),
            _                     => q.OrderBy(t => t.Id),
        };
    }
}

public class TreeItemDto
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int Headcount { get; set; }
    public int ChildCount { get; set; }
}
