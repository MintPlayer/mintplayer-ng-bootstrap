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
}
