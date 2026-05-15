using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using LinqExpression = System.Linq.Expressions.Expression;

namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

/// <summary>
/// Walks an Expression tree and produces an `Expression&lt;Func&lt;T,bool&gt;&gt;`
/// predicate the caller applies via `IQueryable&lt;T&gt;.Where(...)`. EF Core
/// translates the result to parameterised SQL.
///
/// The walker honours PRD Appendix A semantics: relative-date operators
/// resolve in the request's IANA timezone via TzDateMath, set ops on
/// JSON-encoded arrays deserialise per-row to apply Any/All/None.
/// </summary>
public sealed class QueryBuilderWalker<T> where T : class
{
    private readonly TimeZoneInfo _timezone;
    private readonly DateTime _now;

    public QueryBuilderWalker(TimeZoneInfo timezone)
        : this(timezone, DateTime.UtcNow) { }

    public QueryBuilderWalker(TimeZoneInfo timezone, DateTime now)
    {
        _timezone = timezone;
        _now = now;
    }

    public Expression<Func<T, bool>> Build(ExpressionNode tree)
    {
        var param = LinqExpression.Parameter(typeof(T), "x");
        var body = Visit(tree, param);
        return LinqExpression.Lambda<Func<T, bool>>(body, param);
    }

    private LinqExpression Visit(ExpressionNode node, ParameterExpression param)
    {
        return node switch
        {
            GroupNode g => VisitGroup(g, param),
            ConditionNode c => VisitCondition(c, param),
            SubQueryNode sq => VisitSubquery(sq, param),
            _ => throw new QueryBuilderException("UNKNOWN_KIND", node.GetType().Name),
        };
    }

    private LinqExpression VisitGroup(GroupNode g, ParameterExpression param)
    {
        if (g.Children.Count == 0)
        {
            // Vacuous: empty AND → true, empty OR → false.
            return LinqExpression.Constant(g.Logic == "and");
        }
        var parts = g.Children.Select(c => Visit(c, param)).ToList();
        return g.Logic == "and"
            ? parts.Aggregate(LinqExpression.AndAlso)
            : parts.Aggregate(LinqExpression.OrElse);
    }

    // Reflection cache keyed by (declaring type, camelCase field name). Walker
    // instances are short-lived but the cache survives across requests, so
    // hot-path lookups become single ConcurrentDictionary reads.
    private static readonly ConcurrentDictionary<(Type, string), PropertyInfo> PropertyCache = new();

    private LinqExpression VisitCondition(ConditionNode c, ParameterExpression param)
    {
        var propertyInfo = PropertyCache.GetOrAdd((param.Type, c.Field), key =>
            key.Item1.GetProperty(
                PascalCase(key.Item2),
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
            ?? throw new QueryBuilderException("UNKNOWN_FIELD", $"{key.Item1.Name}.{key.Item2}"));
        var prop = LinqExpression.Property(param, propertyInfo);

        return c.Operator switch
        {
            "equals" => Eq(prop, c.Value, propertyInfo.PropertyType),
            "not-equals" => LinqExpression.Not(Eq(prop, c.Value, propertyInfo.PropertyType)),
            "lt" => Cmp(prop, c.Value, propertyInfo.PropertyType, LinqExpression.LessThan),
            "lte" => Cmp(prop, c.Value, propertyInfo.PropertyType, LinqExpression.LessThanOrEqual),
            "gt" => Cmp(prop, c.Value, propertyInfo.PropertyType, LinqExpression.GreaterThan),
            "gte" => Cmp(prop, c.Value, propertyInfo.PropertyType, LinqExpression.GreaterThanOrEqual),
            "between" => Between(prop, c.Value, propertyInfo.PropertyType, inclusive: true),
            "not-between" => LinqExpression.Not(Between(prop, c.Value, propertyInfo.PropertyType, inclusive: true)),
            "contains" => StringCall(prop, c.Value, "Contains"),
            "does-not-contain" => LinqExpression.Not(StringCall(prop, c.Value, "Contains")),
            "starts-with" => StringCall(prop, c.Value, "StartsWith"),
            "ends-with" => StringCall(prop, c.Value, "EndsWith"),
            "in" => InOp(prop, c.Value, propertyInfo.PropertyType, negate: false),
            "not-in" => InOp(prop, c.Value, propertyInfo.PropertyType, negate: true),
            "is-null" => LinqExpression.Equal(prop, LinqExpression.Constant(null, propertyInfo.PropertyType)),
            "is-not-null" => LinqExpression.NotEqual(prop, LinqExpression.Constant(null, propertyInfo.PropertyType)),
            "is-true" => LinqExpression.Equal(prop, LinqExpression.Constant(true, propertyInfo.PropertyType)),
            "is-false" => LinqExpression.Equal(prop, LinqExpression.Constant(false, propertyInfo.PropertyType)),
            "today" => DateRange(prop, TzDateMath.DayBounds(_now, _timezone)),
            "yesterday" => DateRange(prop, TzDateMath.YesterdayBounds(_now, _timezone)),
            "this-week" => DateRange(prop, TzDateMath.WeekBounds(_now, _timezone)),
            "last-week" => DateRange(prop, TzDateMath.WeekBounds(_now, _timezone, -1)),
            "next-week" => DateRange(prop, TzDateMath.WeekBounds(_now, _timezone, +1)),
            "this-month" => DateRange(prop, TzDateMath.MonthBounds(_now, _timezone)),
            "last-month" => DateRange(prop, TzDateMath.MonthBounds(_now, _timezone, -1)),
            "next-month" => DateRange(prop, TzDateMath.MonthBounds(_now, _timezone, +1)),
            "this-year" => DateRange(prop, TzDateMath.YearBounds(_now, _timezone)),
            "last-year" => DateRange(prop, TzDateMath.YearBounds(_now, _timezone, -1)),
            "next-year" => DateRange(prop, TzDateMath.YearBounds(_now, _timezone, +1)),
            "last-n-days" => DateRange(prop, TzDateMath.LastNDaysBounds(_now, _timezone, ReadN(c.Value))),
            "next-n-days" => DateRange(prop, TzDateMath.NextNDaysBounds(_now, _timezone, ReadN(c.Value))),
            "year-to-date" => DateRange(prop, TzDateMath.YearToDateBounds(_now, _timezone)),
            // Array operators on JSON-encoded string columns. Per PRD: tags is a
            // string holding a JSON array like `["urgent","blocked"]`. We translate
            // each operator to `Contains("\"<token>\"")` which EF Core emits as
            // SQL LIKE '%"<token>"%' — matches the exact JSON string token and
            // excludes prefix-overlap (e.g. "urgent" won't match "urgent-care").
            "any-of" => ArrayAny(prop, c.Value, negate: false),
            "none-of" => ArrayAny(prop, c.Value, negate: true),
            "all-of" => ArrayAll(prop, c.Value),
            "is-empty" => ArrayIsEmpty(prop, negate: false),
            "is-not-empty" => ArrayIsEmpty(prop, negate: true),
            _ => throw new QueryBuilderException("UNSUPPORTED_OPERATOR", c.Operator),
        };
    }

    private static readonly MethodInfo StringContainsMethod =
        typeof(string).GetMethod(nameof(string.Contains), new[] { typeof(string) })!;

    /// <summary>OR (any-of) / NOT-OR (none-of) of per-element JSON token Contains.</summary>
    private static LinqExpression ArrayAny(MemberExpression prop, object? jsonValue, bool negate)
    {
        if (prop.Type != typeof(string))
            throw new QueryBuilderException("INVALID_VALUE_SHAPE", "array ops require a JSON-string column");
        if (jsonValue is not JsonElement je || je.ValueKind != JsonValueKind.Array)
            throw new QueryBuilderException("INVALID_VALUE_SHAPE", "array ops require array value");
        var elements = je.EnumerateArray().ToList();
        if (elements.Count == 0)
        {
            // Empty value list: any-of trivially false, none-of trivially true.
            return LinqExpression.Constant(negate);
        }
        LinqExpression? acc = null;
        foreach (var el in elements)
        {
            var token = $"\"{el.GetString()}\"";
            var call = LinqExpression.Call(prop, StringContainsMethod, LinqExpression.Constant(token));
            acc = acc is null ? call : LinqExpression.OrElse(acc, call);
        }
        return negate ? LinqExpression.Not(acc!) : acc!;
    }

    /// <summary>AND (all-of) of per-element JSON token Contains.</summary>
    private static LinqExpression ArrayAll(MemberExpression prop, object? jsonValue)
    {
        if (prop.Type != typeof(string))
            throw new QueryBuilderException("INVALID_VALUE_SHAPE", "array ops require a JSON-string column");
        if (jsonValue is not JsonElement je || je.ValueKind != JsonValueKind.Array)
            throw new QueryBuilderException("INVALID_VALUE_SHAPE", "array ops require array value");
        var elements = je.EnumerateArray().ToList();
        if (elements.Count == 0)
        {
            // Empty value list: all-of vacuously true (∀∅ holds).
            return LinqExpression.Constant(true);
        }
        LinqExpression? acc = null;
        foreach (var el in elements)
        {
            var token = $"\"{el.GetString()}\"";
            var call = LinqExpression.Call(prop, StringContainsMethod, LinqExpression.Constant(token));
            acc = acc is null ? call : LinqExpression.AndAlso(acc, call);
        }
        return acc!;
    }

    /// <summary>is-empty: tags == "[]" || tags == null. is-not-empty: negation.</summary>
    private static LinqExpression ArrayIsEmpty(MemberExpression prop, bool negate)
    {
        if (prop.Type != typeof(string))
            throw new QueryBuilderException("INVALID_VALUE_SHAPE", "array ops require a JSON-string column");
        var emptyLiteral = LinqExpression.Equal(prop, LinqExpression.Constant("[]", typeof(string)));
        var nullLiteral = LinqExpression.Equal(prop, LinqExpression.Constant(null, typeof(string)));
        var combined = LinqExpression.OrElse(emptyLiteral, nullLiteral);
        return negate ? LinqExpression.Not(combined) : combined;
    }

    private LinqExpression VisitSubquery(SubQueryNode sq, ParameterExpression param)
    {
        if (sq.Operator is not ("in" or "not-in"))
            throw new QueryBuilderException("INVALID_SUBQUERY_OPERATOR", sq.Operator);

        var navProp = param.Type.GetProperty(
            PascalCase(sq.Field),
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
            ?? throw new QueryBuilderException("UNKNOWN_FIELD", $"{param.Type.Name}.{sq.Field}");

        var elementType = ResolveElementType(navProp.PropertyType)
            ?? throw new QueryBuilderException("SUBQUERY_FIELD_NOT_RELATION",
                $"{param.Type.Name}.{sq.Field} (got {navProp.PropertyType.Name})");

        var navAccess = LinqExpression.Property(param, navProp);

        var innerParam = LinqExpression.Parameter(elementType, "y");
        var innerBody = Visit(sq.SubQuery, innerParam);
        var innerLambda = LinqExpression.Lambda(
            typeof(Func<,>).MakeGenericType(elementType, typeof(bool)),
            innerBody,
            innerParam);

        var anyMethod = EnumerableAnyOpenGeneric.MakeGenericMethod(elementType);
        var anyCall = LinqExpression.Call(anyMethod, navAccess, innerLambda);

        return sq.Operator == "not-in" ? LinqExpression.Not(anyCall) : anyCall;
    }

    private static readonly MethodInfo EnumerableAnyOpenGeneric = typeof(Enumerable)
        .GetMethods(BindingFlags.Public | BindingFlags.Static)
        .First(m => m.Name == nameof(Enumerable.Any)
                    && m.GetParameters().Length == 2
                    && m.GetParameters()[1].ParameterType.IsGenericType
                    && m.GetParameters()[1].ParameterType.GetGenericTypeDefinition() == typeof(Func<,>));

    private static Type? ResolveElementType(Type collectionType)
    {
        // string implements IEnumerable<char> — don't treat that as a relation collection.
        if (collectionType == typeof(string)) return null;
        if (collectionType.IsGenericType)
        {
            var def = collectionType.GetGenericTypeDefinition();
            if (def == typeof(List<>) || def == typeof(ICollection<>) || def == typeof(IEnumerable<>))
                return collectionType.GetGenericArguments()[0];
        }
        var ienum = collectionType.GetInterfaces()
            .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEnumerable<>));
        return ienum?.GetGenericArguments()[0];
    }

    private static LinqExpression Eq(MemberExpression prop, object? jsonValue, Type targetType)
    {
        var value = ConvertJsonValue(jsonValue, targetType);
        return LinqExpression.Equal(prop, LinqExpression.Constant(value, targetType));
    }

    private static LinqExpression Cmp(
        MemberExpression prop,
        object? jsonValue,
        Type targetType,
        Func<LinqExpression, LinqExpression, LinqExpression> binary)
    {
        var value = ConvertJsonValue(jsonValue, targetType);
        return binary(prop, LinqExpression.Constant(value, targetType));
    }

    private static LinqExpression Between(MemberExpression prop, object? jsonValue, Type targetType, bool inclusive)
    {
        if (jsonValue is not JsonElement je || je.ValueKind != JsonValueKind.Array || je.GetArrayLength() != 2)
            throw new QueryBuilderException("INVALID_VALUE_SHAPE", "between requires [v1, v2]");
        var v1 = ConvertJsonValue(je[0], targetType);
        var v2 = ConvertJsonValue(je[1], targetType);
        var lo = inclusive
            ? LinqExpression.GreaterThanOrEqual(prop, LinqExpression.Constant(v1, targetType))
            : LinqExpression.GreaterThan(prop, LinqExpression.Constant(v1, targetType));
        var hi = inclusive
            ? LinqExpression.LessThanOrEqual(prop, LinqExpression.Constant(v2, targetType))
            : LinqExpression.LessThan(prop, LinqExpression.Constant(v2, targetType));
        return LinqExpression.AndAlso(lo, hi);
    }

    private static LinqExpression StringCall(MemberExpression prop, object? jsonValue, string method)
    {
        if (prop.Type != typeof(string))
            throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{method} requires a string field");
        var value = (string?)ConvertJsonValue(jsonValue, typeof(string)) ?? string.Empty;
        var mi = typeof(string).GetMethod(method, new[] { typeof(string) })!;
        return LinqExpression.Call(prop, mi, LinqExpression.Constant(value));
    }

    private static LinqExpression InOp(MemberExpression prop, object? jsonValue, Type targetType, bool negate)
    {
        if (jsonValue is not JsonElement je || je.ValueKind != JsonValueKind.Array)
            throw new QueryBuilderException("INVALID_VALUE_SHAPE", "in/not-in requires array");
        var listType = typeof(List<>).MakeGenericType(targetType);
        var list = (System.Collections.IList)Activator.CreateInstance(listType)!;
        foreach (var item in je.EnumerateArray())
        {
            list.Add(ConvertJsonValue(item, targetType));
        }
        var containsMethod = listType.GetMethod("Contains", new[] { targetType })!;
        var listConst = LinqExpression.Constant(list, listType);
        var call = LinqExpression.Call(listConst, containsMethod, prop);
        return negate ? LinqExpression.Not(call) : call;
    }

    private static LinqExpression DateRange(MemberExpression prop, (DateTime StartUtc, DateTime EndUtc) bounds)
    {
        var startConst = LinqExpression.Constant(bounds.StartUtc, prop.Type);
        var endConst = LinqExpression.Constant(bounds.EndUtc, prop.Type);
        return LinqExpression.AndAlso(
            LinqExpression.GreaterThanOrEqual(prop, startConst),
            LinqExpression.LessThan(prop, endConst)
        );
    }

    private static int ReadN(object? jsonValue)
    {
        if (jsonValue is JsonElement je && je.ValueKind == JsonValueKind.Object && je.TryGetProperty("n", out var nProp))
        {
            return nProp.GetInt32();
        }
        throw new QueryBuilderException("INVALID_VALUE_SHAPE", "last-n-days / next-n-days require { n: number }");
    }

    private static object? ConvertJsonValue(object? jsonValue, Type targetType)
    {
        if (jsonValue is null) return null;
        var underlying = Nullable.GetUnderlyingType(targetType) ?? targetType;
        if (jsonValue is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.Null) return null;
            if (underlying == typeof(string)) return je.GetString();
            if (underlying == typeof(int)) return je.GetInt32();
            if (underlying == typeof(long)) return je.GetInt64();
            if (underlying == typeof(decimal)) return je.GetDecimal();
            if (underlying == typeof(double)) return je.GetDouble();
            if (underlying == typeof(bool)) return je.GetBoolean();
            if (underlying == typeof(DateTime))
            {
                // Accept ISO 8601 strings; reject epoch numbers per PRD Appendix C.
                if (je.ValueKind != JsonValueKind.String)
                    throw new QueryBuilderException("INVALID_DATE_FORMAT", "expected ISO 8601 string");
                return je.GetDateTime();
            }
            // Fallback: deserialise to the target type without the GetRawText
            // round-trip — JsonElement.Deserialize(Type) reads straight from
            // the parsed token tree.
            return je.Deserialize(underlying);
        }
        return Convert.ChangeType(jsonValue, underlying);
    }

    private static string PascalCase(string camelOrSnake)
    {
        if (string.IsNullOrEmpty(camelOrSnake)) return camelOrSnake;
        return char.ToUpperInvariant(camelOrSnake[0]) + camelOrSnake[1..];
    }
}
