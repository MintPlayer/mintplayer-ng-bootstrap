using Microsoft.EntityFrameworkCore;
using MintPlayer.NgBootstrap.Api.Models;

namespace MintPlayer.NgBootstrap.Api.Data;

public class DemoDbContext(DbContextOptions<DemoDbContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<LineItem> LineItems => Set<LineItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>(b =>
        {
            b.HasOne(o => o.Customer)
                .WithMany(c => c.Orders)
                .HasForeignKey(o => o.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(o => o.OrderDate);
            b.HasIndex(o => o.CustomerId);
            b.HasIndex(o => o.Status);
            b.Property(o => o.Total).HasColumnType("decimal(18, 2)");
        });

        modelBuilder.Entity<LineItem>(b =>
        {
            b.HasOne(li => li.Order)
                .WithMany(o => o.LineItems)
                .HasForeignKey(li => li.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            b.Property(li => li.UnitPrice).HasColumnType("decimal(18, 2)");
        });
    }
}
