using Microsoft.EntityFrameworkCore;
using MintPlayer.NgBootstrap.Api.Models;

namespace MintPlayer.NgBootstrap.Api.Data;

public class DemoDbContext(DbContextOptions<DemoDbContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<LineItem> LineItems => Set<LineItem>();
    public DbSet<TreeItem> TreeItems => Set<TreeItem>();

    // Every DateTime is stored as UTC, but SQLite hands it back as Unspecified, which serializes
    // without a "Z" and a browser then reads as local time. Restore the kind on read (#448 D10).
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }

    private sealed class UtcDateTimeConverter() : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

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

        modelBuilder.Entity<TreeItem>(b =>
        {
            b.HasOne(t => t.Parent)
                .WithMany(t => t.Children)
                .HasForeignKey(t => t.ParentId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(t => t.ParentId);
            b.HasIndex(t => t.Name);
        });
    }
}
