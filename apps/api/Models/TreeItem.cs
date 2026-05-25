namespace MintPlayer.NgBootstrap.Api.Models;

public class TreeItem
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public TreeItem? Parent { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int Headcount { get; set; }

    /// <summary>Number of DIRECT children (not total descendants). Precomputed at seed time.</summary>
    public int ChildCount { get; set; }

    public List<TreeItem> Children { get; set; } = new();
}
