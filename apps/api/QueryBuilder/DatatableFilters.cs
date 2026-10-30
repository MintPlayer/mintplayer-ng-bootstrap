using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using LinqExpression = System.Linq.Expressions.Expression;

namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

/// <summary>
/// One column filter as the datatable sends it (<c>DatatableFilter</c>, #448):
/// a values filter (<see cref="Values"/>, <see cref="Inverse"/>) or a
/// comparison (<see cref="Operator"/> + <see cref="Operand"/>). Values are the
/// raw JSON of the column's distinct values; a datetime operand is a UTC
/// instant (<c>…Z</c>), a date operand a calendar <c>yyyy-mm-dd</c>.
/// </summary>
public class DatatableFilter
{
    public List<JsonElement> Values { get; set; } = new();
    public bool Inverse { get; set; }
    public string? Operator { get; set; }
    public JsonElement? Operand { get; set; }
}

public class DatatableSortColumn
{
    public string Property { get; set; } = string.Empty;
    public string Direction { get; set; } = "ascending";
}

/// <summary>The body of a datatable <c>fetch</c>: page, sort, filters and the consumer's <c>fetchParams</c>.</summary>
public class DatatableRequest
{
    public int Page { get; set; } = 1;
    public int PerPage { get; set; } = 20;
    public List<DatatableSortColumn>? SortColumns { get; set; }
    public Dictionary<string, DatatableFilter>? Filters { get; set; }
    public JsonElement? Params { get; set; }
}

/// <summary>The body of a datatable <c>distincts</c> call: the other columns' filters, never the column's own.</summary>
public class DatatableDistinctsRequest
{
    public string Column { get; set; } = string.Empty;
    public string Search { get; set; } = string.Empty;
    public Dictionary<string, DatatableFilter>? Filters { get; set; }
    public JsonElement? Params { get; set; }
}

public class DatatableResponse<T>
{
    public List<T> Data { get; set; } = new();
    public int TotalRecords { get; set; }
}

public class DistinctValueDto
{
    public object? Value { get; set; }
    public string Label { get; set; } = string.Empty;
}

public class DistinctValuesDto
{
    public List<DistinctValueDto> Matching { get; set; } = new();
    public List<DistinctValueDto> Remaining { get; set; } = new();
    public bool HasMore { get; set; }
}

/// <summary>
/// Applies datatable filters to an <see cref="IQueryable{T}"/> as one
/// <c>Where</c> per column, so EF translates them to SQL. Only the
/// <paramref name="allowed"/> properties can be filtered; anything else is a
/// 400, never a silently ignored filter.
/// </summary>
public static partial class DatatableFilterApplier
{
    [GeneratedRegex(@"^\d{4}-\d{2}-\d{2}$")]
    private static partial Regex CalendarDate();

    public static IQueryable<T> Apply<T>(IQueryable<T> source, IReadOnlyDictionary<string, DatatableFilter>? filters, IReadOnlySet<string> allowed)
    {
        if (filters is null) return source;
        foreach (var (name, filter) in filters)
        {
            var property = Resolve<T>(name, allowed);
            var x = LinqExpression.Parameter(typeof(T), "x");
            LinqExpression member = LinqExpression.Property(x, property);
            var body = filter.Operator is not null
                ? Compare(member, property.PropertyType, filter.Operator, filter.Operand)
                : AnyOf(member, property.PropertyType, filter.Values, filter.Inverse);
            if (body is null) continue;
            source = source.Where(LinqExpression.Lambda<Func<T, bool>>(body, x));
        }
        return source;
    }

    public static PropertyInfo Resolve<T>(string name, IReadOnlySet<string> allowed)
    {
        if (!allowed.Contains(name)) throw new QueryBuilderException("UNKNOWN_FILTER_FIELD", name);
        return typeof(T).GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
            ?? throw new QueryBuilderException("UNKNOWN_FILTER_FIELD", name);
    }

    private static LinqExpression? AnyOf(LinqExpression member, Type type, List<JsonElement> values, bool inverse)
    {
        if (values.Count == 0) return null;
        var any = values
            .Select(v => (LinqExpression)LinqExpression.Equal(member, LinqExpression.Constant(ToClr(v, type), type)))
            .Aggregate(LinqExpression.OrElse);
        return inverse ? LinqExpression.Not(any) : any;
    }

    private static LinqExpression? Compare(LinqExpression member, Type type, string op, JsonElement? operand)
    {
        if (operand is null || operand.Value.ValueKind == JsonValueKind.Null) return null;
        var underlying = Nullable.GetUnderlyingType(type) ?? type;
        // A calendar date compares against the day, whatever the time of day stored.
        if (underlying == typeof(DateTime) && operand.Value.ValueKind == JsonValueKind.String && CalendarDate().IsMatch(operand.Value.GetString()!))
        {
            var day = DateTime.ParseExact(operand.Value.GetString()!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            var date = LinqExpression.Property(underlying == type ? member : LinqExpression.Property(member, "Value"), nameof(DateTime.Date));
            return Operator(op, date, LinqExpression.Constant(day));
        }
        return Operator(op, member, LinqExpression.Constant(ToClr(operand.Value, type), type));
    }

    private static LinqExpression Operator(string op, LinqExpression left, LinqExpression right) => op switch
    {
        "eq" => LinqExpression.Equal(left, right),
        "neq" => LinqExpression.NotEqual(left, right),
        "lt" => LinqExpression.LessThan(left, right),
        "lte" => LinqExpression.LessThanOrEqual(left, right),
        "gt" => LinqExpression.GreaterThan(left, right),
        "gte" => LinqExpression.GreaterThanOrEqual(left, right),
        _ => throw new QueryBuilderException("UNKNOWN_OPERATOR", op),
    };

    /// <summary>A JSON value as the property's CLR type. Datetimes are instants: parsed with their offset, kept as UTC.</summary>
    public static object? ToClr(JsonElement value, Type type)
    {
        if (value.ValueKind == JsonValueKind.Null) return null;
        var underlying = Nullable.GetUnderlyingType(type) ?? type;
        try
        {
            if (underlying == typeof(string)) return value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText();
            if (underlying == typeof(DateTime)) return DateTimeOffset.Parse(value.GetString()!, CultureInfo.InvariantCulture).UtcDateTime;
            if (underlying == typeof(bool)) return value.GetBoolean();
            if (value.ValueKind == JsonValueKind.Number) return Convert.ChangeType(value.GetDecimal(), underlying, CultureInfo.InvariantCulture);
            return Convert.ChangeType(value.GetString(), underlying, CultureInfo.InvariantCulture);
        }
        catch (Exception e) when (e is FormatException or InvalidCastException or InvalidOperationException or OverflowException)
        {
            throw new QueryBuilderException("INVALID_FILTER_VALUE", value.GetRawText());
        }
    }

    /// <summary>
    /// The distinct values of <paramref name="column"/> over <paramref name="source"/>
    /// (already filtered by the other columns), narrowed by <paramref name="search"/>.
    /// </summary>
    public static async Task<DistinctValuesDto> DistinctsAsync<T>(
        IQueryable<T> source, string column, string search, IReadOnlySet<string> allowed, int limit, Func<IQueryable<object?>, CancellationToken, Task<List<object?>>> toList, CancellationToken ct)
    {
        var property = Resolve<T>(column, allowed);
        var x = LinqExpression.Parameter(typeof(T), "x");
        var member = LinqExpression.Property(x, property);
        var values = source.Select(LinqExpression.Lambda<Func<T, object?>>(LinqExpression.Convert(member, typeof(object)), x)).Distinct();
        if (search.Length > 0 && property.PropertyType == typeof(string))
        {
            var term = search.ToLower();
            values = values.Where(v => v != null && ((string)v).ToLower().Contains(term));
        }
        var found = await toList(values.OrderBy(v => v).Take(limit + 1), ct);
        return new DistinctValuesDto
        {
            Matching = found.Take(limit).Select(v => new DistinctValueDto { Value = v, Label = v?.ToString() ?? string.Empty }).ToList(),
            HasMore = found.Count > limit,
        };
    }
}
