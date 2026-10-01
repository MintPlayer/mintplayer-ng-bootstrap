using System.Text.Json;
using MintPlayer.NgBootstrap.Api.QueryBuilder;
using Xunit;

namespace MintPlayer.NgBootstrap.Api.Tests;

/// <summary>
/// Every operator arm of <see cref="QueryBuilderWalker{T}"/>, plus the value
/// conversion (<c>ConvertJsonValue</c>) for each CLR type the walker knows and
/// the collection shapes a subquery may navigate.
///
/// The walker is generic, so these tests run it over a purpose-built
/// <see cref="Probe"/> row rather than the EF models: the models have no
/// boolean, long, double or nullable column, and only one collection shape,
/// so half the conversion table would otherwise be unreachable.
/// </summary>
public class WalkerOperatorTests
{
    public sealed class Kid
    {
        public int Score { get; set; }
    }

    public sealed class Probe
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Count { get; set; }
        public int? MaybeCount { get; set; }
        public long Big { get; set; }
        public decimal Price { get; set; }
        public double Ratio { get; set; }
        public bool Flag { get; set; }
        public bool? MaybeFlag { get; set; }
        public DateTime At { get; set; }
        public Guid Key { get; set; }
        public string? Tags { get; set; }
        public List<Kid> ListKids { get; set; } = new();
        public ICollection<Kid> CollKids { get; set; } = new List<Kid>();
        public IEnumerable<Kid> EnumKids { get; set; } = new List<Kid>();
        public HashSet<Kid> SetKids { get; set; } = new();
        public IReadOnlyList<Kid> ReadOnlyKids { get; set; } = new List<Kid>();
    }

    private sealed class AlienNode : ExpressionNode { }

    private static readonly Guid KeyA = Guid.Parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    private static readonly Guid KeyB = Guid.Parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

    // Thursday 2026-05-14 12:00 UTC. ISO week = Mon 11 May .. Mon 18 May.
    private static readonly DateTime Now = new(2026, 5, 14, 12, 0, 0, DateTimeKind.Utc);

    private static DateTime Utc(int y, int m, int d, int h = 0) => new(y, m, d, h, 0, 0, DateTimeKind.Utc);

    private static List<Kid> Kids(params int[] scores) => scores.Select(s => new Kid { Score = s }).ToList();

    private static List<Probe> Rows() => new()
    {
        new Probe { Id = 1, Name = "alpha",   Count = 1,  MaybeCount = null, Big = 10_000_000_000L, Price = 1.5m,  Ratio = 0.25, Flag = true,  MaybeFlag = null,  At = Utc(2026, 5, 14, 6),  Key = KeyA, Tags = "[\"urgent\"]",
            ListKids = Kids(90), CollKids = Kids(90), EnumKids = Kids(90), SetKids = Kids(90).ToHashSet(), ReadOnlyKids = Kids(90) },
        new Probe { Id = 2, Name = "beta",    Count = 5,  MaybeCount = 5,    Big = 20L,             Price = 10m,   Ratio = 0.5,  Flag = false, MaybeFlag = true,  At = Utc(2026, 5, 13),     Key = KeyB, Tags = "[]",
            ListKids = Kids(10), CollKids = Kids(10), EnumKids = Kids(10), SetKids = Kids(10).ToHashSet(), ReadOnlyKids = Kids(10) },
        new Probe { Id = 3, Name = "gamma",   Count = 10, MaybeCount = 10,   Big = 30L,             Price = 100m,  Ratio = 0.75, Flag = true,  MaybeFlag = false, At = Utc(2026, 5, 5),      Key = KeyA, Tags = null },
        new Probe { Id = 4, Name = "delta",   Count = 20, MaybeCount = null, Big = 40L,             Price = 1000m, Ratio = 1.0,  Flag = false, MaybeFlag = null,  At = Utc(2026, 5, 20),     Key = KeyB, Tags = "[\"blocked\"]" },
        new Probe { Id = 5, Name = "epsilon", Count = 30, MaybeCount = 30,   Big = 50L,             Price = 5m,    Ratio = 2.0,  Flag = true,  MaybeFlag = true,  At = Utc(2026, 4, 15),     Key = KeyA, Tags = "[]" },
        new Probe { Id = 6, Name = "zeta",    Count = 40, MaybeCount = 40,   Big = 60L,             Price = 7m,    Ratio = 3.0,  Flag = false, MaybeFlag = false, At = Utc(2026, 6, 10),     Key = KeyB, Tags = "[]" },
        new Probe { Id = 7, Name = "eta",     Count = 50, MaybeCount = 50,   Big = 70L,             Price = 8m,    Ratio = 4.0,  Flag = true,  MaybeFlag = null,  At = Utc(2025, 7, 1),      Key = KeyA, Tags = "[]" },
        new Probe { Id = 8, Name = "theta",   Count = 60, MaybeCount = 60,   Big = 80L,             Price = 9m,    Ratio = 5.0,  Flag = false, MaybeFlag = null,  At = Utc(2027, 2, 1),      Key = KeyB, Tags = "[]" },
        new Probe { Id = 9, Name = "iota",    Count = 70, MaybeCount = 70,   Big = 90L,             Price = 11m,   Ratio = 6.0,  Flag = true,  MaybeFlag = null,  At = Utc(2026, 1, 2),      Key = KeyA, Tags = "[]" },
    };

    private static JsonElement Json(object? value) =>
        JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(value));

    private static GroupNode Where(string field, string op, object? value) => new()
    {
        Id = "g",
        Logic = "and",
        Children = new() { new ConditionNode { Id = "c", Field = field, Operator = op, Value = value } },
    };

    private static int[] Run(ExpressionNode tree)
    {
        var predicate = new QueryBuilderWalker<Probe>(TimeZoneInfo.Utc, Now).Build(tree).Compile();
        return Rows().Where(predicate).Select(p => p.Id).ToArray();
    }

    private static int[] Ids(string csv) =>
        csv.Length == 0 ? Array.Empty<int>() : csv.Split(',').Select(int.Parse).ToArray();

    // ------------------------------------------------------------ scalar arms

    public static TheoryData<string, string, string, string> ScalarOperators => new()
    {
        // field, operator, JSON value, expected ids
        { "count", "equals",     "10",   "3" },
        { "count", "not-equals", "10",   "1,2,4,5,6,7,8,9" },
        { "count", "lt",         "10",   "1,2" },
        { "count", "lte",        "10",   "1,2,3" },
        { "count", "gt",         "50",   "8,9" },
        { "count", "gte",        "50",   "7,8,9" },
        { "count", "between",     "[5,20]", "2,3,4" },
        { "count", "not-between", "[5,20]", "1,5,6,7,8,9" },
        { "count", "in",     "[1,30,99]", "1,5" },
        { "count", "not-in", "[1,30,99]", "2,3,4,6,7,8,9" },
        { "name", "contains",         "\"et\"",  "2,6,7,8" },
        { "name", "does-not-contain", "\"et\"",  "1,3,4,5,9" },
        { "name", "starts-with",      "\"e\"",   "5,7" },
        { "name", "ends-with",        "\"ta\"",  "2,4,6,7,8,9" },
        { "name", "in",               "[\"alpha\",\"iota\"]", "1,9" },
    };

    [Theory]
    [MemberData(nameof(ScalarOperators))]
    public void ScalarOperator_SelectsTheMatchingRows(string field, string op, string json, string expected)
    {
        var value = JsonSerializer.Deserialize<JsonElement>(json);
        Assert.Equal(Ids(expected), Run(Where(field, op, value)));
    }

    // ------------------------------------------------- parameterless arms

    public static TheoryData<string, string, string> ParameterlessOperators => new()
    {
        { "maybeCount", "is-null",     "1,4" },
        { "maybeCount", "is-not-null", "2,3,5,6,7,8,9" },
        { "flag",       "is-true",     "1,3,5,7,9" },
        { "flag",       "is-false",    "2,4,6,8" },
        { "maybeFlag",  "is-true",     "2,5" },
        { "maybeFlag",  "is-false",    "3,6" },
        { "maybeFlag",  "is-null",     "1,4,7,8,9" },
        { "tags",       "is-empty",     "2,3,5,6,7,8,9" },
        { "tags",       "is-not-empty", "1,4" },
    };

    [Theory]
    [MemberData(nameof(ParameterlessOperators))]
    public void ParameterlessOperator_SelectsTheMatchingRows(string field, string op, string expected)
    {
        Assert.Equal(Ids(expected), Run(Where(field, op, null)));
    }

    // ------------------------------------------------- relative-date arms

    public static TheoryData<string, string> RelativeDateOperators => new()
    {
        // Now = Thu 2026-05-14 12:00 UTC.
        { "today",        "1" },          // 14 May
        { "yesterday",    "2" },          // 13 May
        { "this-week",    "1,2" },        // Mon 11 .. Mon 18 May
        { "last-week",    "3" },          // Mon 4 .. Mon 11 May
        { "next-week",    "4" },          // Mon 18 .. Mon 25 May
        { "this-month",   "1,2,3,4" },    // May 2026
        { "last-month",   "5" },          // April 2026
        { "next-month",   "6" },          // June 2026
        { "this-year",    "1,2,3,4,5,6,9" },
        { "last-year",    "7" },
        { "next-year",    "8" },
        { "year-to-date", "1,2,3,5,9" },  // 1 Jan 2026 .. now
    };

    [Theory]
    [MemberData(nameof(RelativeDateOperators))]
    public void RelativeDateOperator_ResolvesAgainstTheInjectedNow(string op, string expected)
    {
        Assert.Equal(Ids(expected), Run(Where("at", op, null)));
    }

    [Fact]
    public void NextNDays_SelectsTheForwardWindow()
    {
        // 14 May 12:00 .. 21 May 00:00 covers delta (20 May); alpha (06:00 today) is already past.
        Assert.Equal(new[] { 4 }, Run(Where("at", "next-n-days", Json(new { n = 7 }))));
    }

    // ------------------------------------------------------ array arms

    public static TheoryData<string, string, string> ArrayOperators => new()
    {
        { "any-of",  "[\"urgent\",\"blocked\"]", "1,4" },
        { "none-of", "[\"urgent\"]",             "2,3,4,5,6,7,8,9" },
        { "none-of", "[]",                       "1,2,3,4,5,6,7,8,9" },
        { "all-of",  "[]",                       "1,2,3,4,5,6,7,8,9" },
        { "all-of",  "[\"blocked\"]",            "4" },
    };

    [Theory]
    [MemberData(nameof(ArrayOperators))]
    public void ArrayOperator_MatchesJsonTokens(string op, string json, string expected)
    {
        // Row 3 has a NULL tags column: the Contains calls would throw in
        // process, so the array arms are exercised over the rows that have a
        // JSON value. (SQL null-propagates to false; the controller tests
        // cover the database path.)
        var predicate = new QueryBuilderWalker<Probe>(TimeZoneInfo.Utc, Now)
            .Build(Where("tags", op, JsonSerializer.Deserialize<JsonElement>(json))).Compile();
        var rows = Rows().Where(r => r.Tags is not null).ToList();
        var expectedIds = Ids(expected).Where(id => id != 3).ToArray();
        Assert.Equal(expectedIds, rows.Where(predicate).Select(p => p.Id).ToArray());
    }

    // ------------------------------------------------ ConvertJsonValue

    public static TheoryData<string, string, string> Conversions => new()
    {
        // field, JSON value, expected ids for "equals"
        { "big",        "10000000000", "1" },                  // long
        { "price",      "100",         "3" },                  // decimal
        { "ratio",      "0.5",         "2" },                  // double
        { "flag",       "true",        "1,3,5,7,9" },          // bool
        { "maybeCount", "5",           "2" },                  // Nullable<int> unwraps to int
        { "maybeCount", "null",        "1,4" },                // JSON null → null constant
        { "at",         "\"2026-05-13T00:00:00Z\"", "2" },     // ISO 8601 DateTime
        { "key",        "\"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb\"", "2,4,6,8" }, // fallback Deserialize
    };

    [Theory]
    [MemberData(nameof(Conversions))]
    public void Equals_ConvertsTheJsonValueToThePropertyType(string field, string json, string expected)
    {
        Assert.Equal(Ids(expected), Run(Where(field, "equals", JsonSerializer.Deserialize<JsonElement>(json))));
    }

    [Fact]
    public void Equals_AcceptsANonJsonClrValueByChangingItsType()
    {
        // A value that did not come through System.Text.Json (e.g. a caller
        // building the tree in code) is converted with Convert.ChangeType.
        Assert.Equal(new[] { 3 }, Run(Where("price", "equals", 100)));
    }

    [Fact]
    public void Equals_WithACSharpNullValue_ComparesAgainstNull()
    {
        Assert.Equal(new[] { 1, 4 }, Run(Where("maybeCount", "equals", null)));
    }

    [Fact]
    public void StringOperator_WithANullValue_TreatsItAsTheEmptyString()
    {
        // contains("") holds for every string. The Validator refuses this
        // shape before it reaches the walker; the walker itself must not crash.
        Assert.Equal(Ids("1,2,3,4,5,6,7,8,9"), Run(Where("name", "contains", Json(null))));
    }

    [Fact]
    public void DateValue_AsAnEpochNumber_IsRejected()
    {
        var ex = Assert.Throws<QueryBuilderException>(() => Run(Where("at", "equals", Json(1_700_000_000))));
        Assert.Equal("INVALID_DATE_FORMAT", ex.Code);
    }

    // ------------------------------------------------ subquery navigation

    [Theory]
    [InlineData("listKids")]      // List<T>
    [InlineData("collKids")]      // ICollection<T>
    [InlineData("enumKids")]      // IEnumerable<T>
    [InlineData("setKids")]       // HashSet<T>: resolved through its IEnumerable<T> interface
    [InlineData("readOnlyKids")]  // IReadOnlyList<T>: resolved through its IEnumerable<T> interface
    public void Subquery_NavigatesEveryCollectionShape(string field)
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new SubQueryNode { Id = "sq", Field = field, Operator = "in", SubQuery = new GroupNode
            {
                Id = "sg", Logic = "and", Children = new()
                {
                    new ConditionNode { Id = "ic", Field = "score", Operator = "gt", Value = Json(50) },
                },
            } },
        } };
        Assert.Equal(new[] { 1 }, Run(tree));
    }

    [Fact]
    public void Subquery_OnAScalarNonStringField_IsNotARelation()
    {
        var tree = new GroupNode { Id = "g", Logic = "and", Children = new()
        {
            new SubQueryNode { Id = "sq", Field = "count", Operator = "in", SubQuery = new GroupNode { Id = "sg" } },
        } };
        var ex = Assert.Throws<QueryBuilderException>(() => Run(tree));
        Assert.Equal("SUBQUERY_FIELD_NOT_RELATION", ex.Code);
    }

    // ------------------------------------------------------- error codes

    public static TheoryData<string, string, string?, string> Errors => new()
    {
        // field, operator, JSON value (null = C# null), expected code
        { "count",   "frobnicate",  "1",            "UNSUPPORTED_OPERATOR" },
        { "nope",    "equals",      "1",            "UNKNOWN_FIELD" },
        { "",        "equals",      "1",            "UNKNOWN_FIELD" },
        { "count",   "between",     "[1]",          "INVALID_VALUE_SHAPE" },
        { "count",   "between",     "1",            "INVALID_VALUE_SHAPE" },
        { "count",   "not-between", null,           "INVALID_VALUE_SHAPE" },
        { "count",   "contains",    "\"x\"",        "INVALID_VALUE_SHAPE" },
        { "count",   "in",          "1",            "INVALID_VALUE_SHAPE" },
        { "at",      "last-n-days", "7",            "INVALID_VALUE_SHAPE" },
        { "at",      "next-n-days", "{\"m\":1}",    "INVALID_VALUE_SHAPE" },
        { "count",   "any-of",      "[\"a\"]",      "INVALID_VALUE_SHAPE" },
        { "tags",    "any-of",      "\"a\"",        "INVALID_VALUE_SHAPE" },
        { "count",   "all-of",      "[\"a\"]",      "INVALID_VALUE_SHAPE" },
        { "tags",    "all-of",      null,           "INVALID_VALUE_SHAPE" },
        { "count",   "is-empty",    null,           "INVALID_VALUE_SHAPE" },
    };

    [Theory]
    [MemberData(nameof(Errors))]
    public void MalformedCondition_ThrowsATypedCode(string field, string op, string? json, string code)
    {
        object? value = json is null ? null : JsonSerializer.Deserialize<JsonElement>(json);
        var ex = Assert.Throws<QueryBuilderException>(() => Run(Where(field, op, value)));
        Assert.Equal(code, ex.Code);
    }

    [Fact]
    public void Subquery_WithAnOperatorOtherThanInOrNotIn_IsRejected()
    {
        var tree = new SubQueryNode { Id = "sq", Field = "listKids", Operator = "equals", SubQuery = new GroupNode { Id = "sg" } };
        var ex = Assert.Throws<QueryBuilderException>(() => Run(tree));
        Assert.Equal("INVALID_SUBQUERY_OPERATOR", ex.Code);
    }

    [Fact]
    public void Subquery_OnAnUnknownField_IsRejected()
    {
        var tree = new SubQueryNode { Id = "sq", Field = "ghosts", Operator = "in", SubQuery = new GroupNode { Id = "sg" } };
        var ex = Assert.Throws<QueryBuilderException>(() => Run(tree));
        Assert.Equal("UNKNOWN_FIELD", ex.Code);
    }

    [Fact]
    public void UnknownNodeKind_IsRejected()
    {
        var ex = Assert.Throws<QueryBuilderException>(() => Run(new AlienNode { Id = "x" }));
        Assert.Equal("UNKNOWN_KIND", ex.Code);
    }

    [Fact]
    public void DefaultConstructor_UsesTheCurrentClock()
    {
        // The single-argument constructor is what the controllers use: a row
        // stamped "now" must fall inside "today".
        var walker = new QueryBuilderWalker<Probe>(TimeZoneInfo.Utc);
        var predicate = walker.Build(Where("at", "today", null)).Compile();
        Assert.True(predicate(new Probe { At = DateTime.UtcNow }));
    }
}
