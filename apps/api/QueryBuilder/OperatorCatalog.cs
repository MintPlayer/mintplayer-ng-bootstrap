namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

/// <summary>
/// Server-side mirror of the frontend's DEFAULT_OPERATOR_CATALOG.
/// </summary>
public static class OperatorCatalog
{
    private static readonly Dictionary<string, HashSet<string>> ByType = new()
    {
        ["string"] = new()
        {
            "equals", "not-equals",
            "contains", "does-not-contain", "starts-with", "ends-with",
            "is-null", "is-not-null", "in", "not-in",
        },
        ["number"] = new()
        {
            "equals", "not-equals",
            "lt", "lte", "gt", "gte",
            "between", "not-between",
            "is-null", "is-not-null",
            "in", "not-in",
        },
        ["integer"] = new()
        {
            "equals", "not-equals",
            "lt", "lte", "gt", "gte",
            "between", "not-between",
            "is-null", "is-not-null",
            "in", "not-in",
        },
        ["date"] = new()
        {
            "equals", "not-equals",
            "lt", "lte", "gt", "gte",
            "between", "not-between",
            "is-null", "is-not-null",
            "today", "yesterday",
            "this-week", "last-week", "next-week",
            "this-month", "last-month", "next-month",
            "this-year", "last-year", "next-year",
            "last-n-days", "next-n-days",
            "year-to-date",
        },
        ["datetime"] = new()
        {
            "equals", "not-equals",
            "lt", "lte", "gt", "gte",
            "between", "not-between",
            "is-null", "is-not-null",
            "today", "yesterday",
            "this-week", "last-week", "next-week",
            "this-month", "last-month", "next-month",
            "this-year", "last-year", "next-year",
            "last-n-days", "next-n-days",
            "year-to-date",
        },
        ["boolean"] = new() { "is-true", "is-false", "is-null", "is-not-null" },
        ["enum"] = new() { "equals", "not-equals", "in", "not-in", "is-null", "is-not-null" },
        ["relation"] = new() { "in", "not-in" },
        ["array"] = new() { "any-of", "all-of", "none-of", "is-empty", "is-not-empty" },
    };

    private static readonly HashSet<string> Parameterless = new()
    {
        "is-null", "is-not-null", "is-true", "is-false",
        "is-empty", "is-not-empty",
        "today", "yesterday",
        "this-week", "last-week", "next-week",
        "this-month", "last-month", "next-month",
        "this-year", "last-year", "next-year",
        "year-to-date",
    };
    private static readonly HashSet<string> Tuple = new() { "between", "not-between" };
    private static readonly HashSet<string> Array = new() { "in", "not-in", "any-of", "all-of", "none-of" };
    private static readonly HashSet<string> NInput = new() { "last-n-days", "next-n-days" };

    public static bool IsValidFor(string fieldType, string op) =>
        ByType.TryGetValue(fieldType, out var ops) && ops.Contains(op);

    public static string ValueShape(string op)
    {
        if (Parameterless.Contains(op)) return "null";
        if (Tuple.Contains(op)) return "tuple";
        if (Array.Contains(op)) return "array";
        if (NInput.Contains(op)) return "n-input";
        return "scalar";
    }
}
