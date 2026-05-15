using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using LinqExpression = System.Linq.Expressions.Expression;

namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

/// <summary>
/// Schema-driven sort applier. Replaces the per-controller hardcoded
/// switch with a generic <see cref="IQueryable{T}"/> sort builder that
/// resolves each <see cref="SortDescriptor.Field"/> against
/// <typeparamref name="T"/> via reflection and emits an
/// <c>OrderBy</c> / <c>ThenBy</c> chain using
/// <see cref="Queryable"/>.OrderBy/ThenBy(Descending).
///
/// Sort descriptors whose <c>Field</c> doesn't map to a property are
/// silently skipped — matches the lenient behavior of the previous
/// switch-fallthrough. If all descriptors are unknown, falls back to
/// <c>OrderBy(x =&gt; defaultKey)</c>.
/// </summary>
public static class SortApplier
{
    // Reuse the walker's case-insensitive property cache shape.
    private static readonly ConcurrentDictionary<(Type, string), PropertyInfo?> PropertyCache = new();

    /// <summary>
    /// Apply <paramref name="sort"/> to <paramref name="source"/>. Falls back
    /// to <paramref name="defaultKey"/> when no descriptor resolves (so
    /// page navigation stays stable).
    /// </summary>
    public static IQueryable<T> Apply<T>(
        IQueryable<T> source,
        IReadOnlyList<SortDescriptor>? sort,
        Expression<Func<T, object>>? defaultKey = null)
    {
        if (sort is null || sort.Count == 0)
        {
            return defaultKey is not null ? source.OrderBy(defaultKey) : source;
        }

        var expression = source.Expression;
        var applied = 0;
        foreach (var s in sort)
        {
            var prop = ResolveProperty(typeof(T), s.Field);
            if (prop is null) continue;

            var param = LinqExpression.Parameter(typeof(T), "x");
            var body = LinqExpression.Property(param, prop);
            var lambda = LinqExpression.Lambda(body, param);

            var methodName = applied == 0
                ? (s.Direction == "desc" ? "OrderByDescending" : "OrderBy")
                : (s.Direction == "desc" ? "ThenByDescending" : "ThenBy");

            expression = LinqExpression.Call(
                typeof(Queryable),
                methodName,
                new[] { typeof(T), prop.PropertyType },
                expression,
                LinqExpression.Quote(lambda));
            applied++;
        }

        if (applied == 0)
        {
            return defaultKey is not null ? source.OrderBy(defaultKey) : source;
        }
        return source.Provider.CreateQuery<T>(expression);
    }

    private static PropertyInfo? ResolveProperty(Type type, string field)
    {
        return PropertyCache.GetOrAdd((type, field), key =>
            key.Item1.GetProperty(
                PascalCase(key.Item2),
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase));
    }

    private static string PascalCase(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        return char.ToUpperInvariant(s[0]) + s[1..];
    }
}
