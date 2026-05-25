using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MintPlayer.NgBootstrap.Api.Models;

namespace MintPlayer.NgBootstrap.Api.Data;

public static class DemoSeed
{
    private static readonly string[] Countries = { "BE", "NL", "FR", "DE", "IT" };
    private static readonly string[] Statuses = { "open", "paid", "shipped", "cancelled" };
    private static readonly string[] Tags = { "urgent", "blocked", "vip", "low-priority" };
    private static readonly string[] Products = {
        "Widget A", "Widget B", "Gadget C", "Gizmo D", "Doohickey E",
        "Thingamajig F", "Whatchamacallit G", "Doodad H", "Contraption I", "Apparatus J",
    };

    private static readonly string[] DivisionPool = {
        "Engineering", "Sales", "Marketing", "Operations", "Finance",
        "HR", "Research", "Customer Success", "Legal", "IT",
    };

    public static async Task RunAsync(DemoDbContext db, CancellationToken ct = default)
    {
        if (await db.Customers.AnyAsync(ct)) return;

        // Deterministic RNG so test row-counts are stable across runs.
        var rng = new Random(42);

        var customers = new List<Customer>(200);
        for (int i = 0; i < 200; i++)
        {
            var country = Countries[rng.Next(Countries.Length)];
            customers.Add(new Customer
            {
                Name = $"Customer {i + 1:0000}",
                Country = country,
                Email = $"customer{i + 1:0000}@example.com",
                CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 1000)),
            });
        }
        db.Customers.AddRange(customers);
        await db.SaveChangesAsync(ct);

        var orders = new List<Order>(1000);
        for (int i = 0; i < 1000; i++)
        {
            var customer = customers[rng.Next(customers.Count)];
            var orderDate = DateTime.UtcNow.AddDays(-rng.Next(0, 365));
            var tagCount = rng.Next(0, 4);
            var tags = new List<string>(tagCount);
            for (int t = 0; t < tagCount; t++)
            {
                var tag = Tags[rng.Next(Tags.Length)];
                if (!tags.Contains(tag)) tags.Add(tag);
            }
            orders.Add(new Order
            {
                CustomerId = customer.Id,
                Total = (decimal)(rng.NextDouble() * 5000),
                Status = Statuses[rng.Next(Statuses.Length)],
                OrderDate = orderDate,
                Tags = JsonSerializer.Serialize(tags),
            });
        }
        db.Orders.AddRange(orders);
        await db.SaveChangesAsync(ct);

        var lineItems = new List<LineItem>(5000);
        foreach (var order in orders)
        {
            var liCount = rng.Next(1, 8);
            for (int li = 0; li < liCount; li++)
            {
                lineItems.Add(new LineItem
                {
                    OrderId = order.Id,
                    ProductName = Products[rng.Next(Products.Length)],
                    UnitPrice = (decimal)(rng.NextDouble() * 200),
                    Quantity = rng.Next(1, 10),
                });
            }
            if (lineItems.Count >= 5000) break;
        }
        db.LineItems.AddRange(lineItems);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Seeds a deterministic 4-level tree (~26k rows) for the tree-mode datatable demo.
    /// Idempotent — skips if TreeItems already has any rows. Independent of <see cref="RunAsync"/>
    /// so it runs even on a database that already has Customers seeded.
    /// </summary>
    public static async Task SeedTreeItemsAsync(DemoDbContext db, CancellationToken ct = default)
    {
        if (await db.TreeItems.AnyAsync(ct)) return;

        var rng = new Random(99);
        var roots = new List<TreeItem>(50);
        for (int i = 0; i < 50; i++)
        {
            var divisionName = DivisionPool[i % DivisionPool.Length];
            var groupIndex = (i / DivisionPool.Length) + 1;
            var rootCode = $"D{i + 1:D2}";
            roots.Add(BuildTreeNode(rng, depth: 0, code: rootCode, name: $"{divisionName} {groupIndex:D2}"));
        }

        // EF Core walks navigation properties when adding aggregate roots, so the entire
        // forest is inserted in one SaveChangesAsync call.
        db.TreeItems.AddRange(roots);
        await db.SaveChangesAsync(ct);
    }

    private static TreeItem BuildTreeNode(Random rng, int depth, string code, string name)
    {
        var node = new TreeItem { Name = name, Code = code };

        int childCount = depth switch
        {
            0 => rng.Next(10, 26),  // L0 → L1: 10-25 children per division
            1 => rng.Next(3, 11),   // L1 → L2:  3-10 teams per department
            2 => rng.Next(0, 9),    // L2 → L3:  0-8  members per team (0 makes some L2 nodes leaves)
            _ => 0,
        };

        node.ChildCount = childCount;

        if (childCount == 0)
        {
            node.Headcount = rng.Next(1, 6);
            return node;
        }

        int totalHeadcount = 0;
        for (int j = 1; j <= childCount; j++)
        {
            var (childName, childCodeSuffix) = depth switch
            {
                0 => ($"Department {j:D2}", $".D{j:D2}"),
                1 => ($"Team {j:D2}",       $".T{j:D2}"),
                _ => ($"Member {j:D3}",     $".M{j:D3}"),
            };
            var child = BuildTreeNode(rng, depth + 1, code + childCodeSuffix, childName);
            node.Children.Add(child);
            totalHeadcount += child.Headcount;
        }
        node.Headcount = totalHeadcount;
        return node;
    }
}
