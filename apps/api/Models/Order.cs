namespace MintPlayer.NgBootstrap.Api.Models;

public class Order
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    /// <summary>JSON-encoded array of tag strings (SQLite has no array type).</summary>
    public string Tags { get; set; } = "[]";

    public List<LineItem> LineItems { get; set; } = new();
}
