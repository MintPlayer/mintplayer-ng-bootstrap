using MintPlayer.NgBootstrap.Api.QueryBuilder;
using Xunit;

namespace MintPlayer.NgBootstrap.Api.Tests;

/// <summary>
/// Relative-date math, table-driven over (now, tz).
///
/// Every operator is dispatched from QueryBuilderWalker's relative-date switch,
/// so a wrong boundary here silently returns the wrong rows for a filter the
/// user believes is simple. The cases that matter are the ones where local
/// arithmetic and UTC arithmetic disagree: DST transitions, and a zone whose
/// local date differs from the UTC date at the instant asked about.
///
/// Zones used:
///   Europe/Brussels — UTC+1 / UTC+2, transitions at 01:00 UTC, so local
///                     midnight always exists and is never ambiguous.
///   Pacific/Kiritimati — UTC+14, no DST: the local date is always AHEAD of UTC.
///   Pacific/Niue — UTC-11, no DST: the local date is always BEHIND UTC.
/// </summary>
public class TzDateMathTests
{
    private static TimeZoneInfo Brussels => TzDateMath.ResolveTimezone("Europe/Brussels");
    private static TimeZoneInfo Kiritimati => TzDateMath.ResolveTimezone("Pacific/Kiritimati");
    private static TimeZoneInfo Niue => TzDateMath.ResolveTimezone("Pacific/Niue");

    private static DateTime Utc(int y, int m, int d, int h = 12, int min = 0) =>
        new(y, m, d, h, min, 0, DateTimeKind.Utc);

    // ---------------------------------------------------------------- timezone

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ResolveTimezone_TreatsAbsentAsUtc(string? iana)
    {
        Assert.Equal(TimeZoneInfo.Utc, TzDateMath.ResolveTimezone(iana));
    }

    [Fact]
    public void ResolveTimezone_ResolvesAnIanaId()
    {
        Assert.Equal("Europe/Brussels", TzDateMath.ResolveTimezone("Europe/Brussels").Id);
    }

    [Fact]
    public void ResolveTimezone_RejectsAnUnknownZoneWithADomainError()
    {
        var ex = Assert.Throws<QueryBuilderException>(() => TzDateMath.ResolveTimezone("Mars/Olympus_Mons"));
        Assert.Equal("INVALID_TIMEZONE", ex.Code);
        Assert.Equal("Mars/Olympus_Mons", ex.Detail);
    }

    // --------------------------------------------------------------------- day

    [Fact]
    public void DayBounds_IsLocalMidnightToLocalMidnight()
    {
        var (start, end) = TzDateMath.DayBounds(Utc(2026, 5, 14), Brussels);
        // CEST (UTC+2) in May: local 2026-05-14 00:00 is 2026-05-13 22:00 UTC.
        Assert.Equal(Utc(2026, 5, 13, 22), start);
        Assert.Equal(Utc(2026, 5, 14, 22), end);
    }

    [Fact]
    public void DayBounds_UsesTheLocalDate_NotTheUtcDate()
    {
        // 23:00 UTC on the 13th is already 13:00 on the 14th in Kiritimati (UTC+14).
        var (start, end) = TzDateMath.DayBounds(Utc(2026, 5, 13, 23), Kiritimati);
        Assert.Equal(Utc(2026, 5, 13, 10), start);
        Assert.Equal(Utc(2026, 5, 14, 10), end);
    }

    [Fact]
    public void DayBounds_UsesTheLocalDate_WhenTheZoneIsBehindUtc()
    {
        // 01:00 UTC on the 14th is still 14:00 on the 13th in Niue (UTC-11).
        var (start, end) = TzDateMath.DayBounds(Utc(2026, 5, 14, 1), Niue);
        Assert.Equal(Utc(2026, 5, 13, 11), start);
        Assert.Equal(Utc(2026, 5, 14, 11), end);
    }

    // A DST day is not 24 hours long. Adding days in the local zone BEFORE
    // converting to UTC is what makes this come out right; adding 24h to the UTC
    // instant would not.
    [Fact]
    public void DayBounds_SpringForwardDayIs23Hours()
    {
        var (start, end) = TzDateMath.DayBounds(Utc(2026, 3, 29), Brussels);
        Assert.Equal(TimeSpan.FromHours(23), end - start);
    }

    [Fact]
    public void DayBounds_FallBackDayIs25Hours()
    {
        var (start, end) = TzDateMath.DayBounds(Utc(2026, 10, 25), Brussels);
        Assert.Equal(TimeSpan.FromHours(25), end - start);
    }

    [Fact]
    public void DayBounds_OrdinaryDayIs24Hours()
    {
        var (start, end) = TzDateMath.DayBounds(Utc(2026, 5, 14), Brussels);
        Assert.Equal(TimeSpan.FromHours(24), end - start);
    }

    [Fact]
    public void YesterdayBounds_EndsWhereTodayStarts()
    {
        var now = Utc(2026, 5, 14);
        var (_, yesterdayEnd) = TzDateMath.YesterdayBounds(now, Brussels);
        var (todayStart, _) = TzDateMath.DayBounds(now, Brussels);
        Assert.Equal(todayStart, yesterdayEnd);
    }

    [Fact]
    public void YesterdayBounds_AbsorbsTheDstShift()
    {
        // The 29th sprang forward, so "yesterday" seen from the 30th is 23h long.
        var (start, end) = TzDateMath.YesterdayBounds(Utc(2026, 3, 30), Brussels);
        Assert.Equal(TimeSpan.FromHours(23), end - start);
    }

    // -------------------------------------------------------------------- week

    // ISO 8601: weeks start on Monday. .NET's DayOfWeek starts on Sunday, and
    // that off-by-one is exactly what the `dow == 0 ? 6 : dow - 1` line handles.
    [Theory]
    [InlineData(2026, 5, 11)] // Monday
    [InlineData(2026, 5, 14)] // Thursday
    [InlineData(2026, 5, 17)] // Sunday — must belong to the week that began the 11th
    public void WeekBounds_RunsMondayToMonday(int y, int m, int d)
    {
        var (start, end) = TzDateMath.WeekBounds(Utc(y, m, d), Brussels);
        Assert.Equal(Utc(2026, 5, 10, 22), start); // local Mon 2026-05-11 00:00
        Assert.Equal(Utc(2026, 5, 17, 22), end);   // local Mon 2026-05-18 00:00
    }

    [Fact]
    public void WeekBounds_SundayDoesNotStartANewWeek()
    {
        var sunday = TzDateMath.WeekBounds(Utc(2026, 5, 17), Brussels);
        var monday = TzDateMath.WeekBounds(Utc(2026, 5, 11), Brussels);
        Assert.Equal(monday, sunday);
    }

    [Theory]
    [InlineData(-1, 5, 4)]
    [InlineData(0, 5, 11)]
    [InlineData(1, 5, 18)]
    public void WeekBounds_ShiftsWholeWeeksByOffset(int offset, int expectedMonth, int expectedDay)
    {
        var (start, _) = TzDateMath.WeekBounds(Utc(2026, 5, 14), Brussels, offset);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(start, Brussels);
        Assert.Equal(new DateTime(2026, expectedMonth, expectedDay), localStart);
    }

    [Fact]
    public void WeekBounds_CrossesAYearBoundary()
    {
        // Friday 2027-01-01 belongs to the week starting Monday 2026-12-28.
        var (start, _) = TzDateMath.WeekBounds(Utc(2027, 1, 1), Brussels);
        Assert.Equal(new DateTime(2026, 12, 28), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
    }

    [Fact]
    public void WeekBounds_ContainingADstTransitionIsNot168Hours()
    {
        var (start, end) = TzDateMath.WeekBounds(Utc(2026, 3, 29), Brussels);
        Assert.Equal(TimeSpan.FromHours(167), end - start);
    }

    // ------------------------------------------------------------------- month

    [Fact]
    public void MonthBounds_RunsFirstToFirst()
    {
        var (start, end) = TzDateMath.MonthBounds(Utc(2026, 5, 14), Brussels);
        Assert.Equal(Utc(2026, 4, 30, 22), start); // local 2026-05-01 00:00
        Assert.Equal(Utc(2026, 5, 31, 22), end);   // local 2026-06-01 00:00
    }

    [Fact]
    public void MonthBounds_StepsBackAcrossTheYearBoundary()
    {
        var (start, _) = TzDateMath.MonthBounds(Utc(2026, 1, 15), Brussels, -1);
        Assert.Equal(new DateTime(2025, 12, 1), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
    }

    [Fact]
    public void MonthBounds_StepsForwardAcrossTheYearBoundary()
    {
        var (start, _) = TzDateMath.MonthBounds(Utc(2026, 12, 15), Brussels, 1);
        Assert.Equal(new DateTime(2027, 1, 1), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
    }

    // AddMonths clamps, but the first of a month is never clamped — this is the
    // case that would break if the implementation ever anchored on today's day
    // number instead of the 1st.
    [Fact]
    public void MonthBounds_HandlesTheEndOfALongMonth()
    {
        var (start, end) = TzDateMath.MonthBounds(Utc(2026, 1, 31), Brussels);
        Assert.Equal(new DateTime(2026, 1, 1), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
        Assert.Equal(new DateTime(2026, 2, 1), TimeZoneInfo.ConvertTimeFromUtc(end, Brussels));
    }

    [Fact]
    public void MonthBounds_CoversAllOfFebruaryInALeapYear()
    {
        var (start, end) = TzDateMath.MonthBounds(Utc(2028, 2, 15), Brussels);
        Assert.Equal(new DateTime(2028, 2, 1), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
        Assert.Equal(new DateTime(2028, 3, 1), TimeZoneInfo.ConvertTimeFromUtc(end, Brussels));
        Assert.Equal(29, (end - start).Days);
    }

    // -------------------------------------------------------------------- year

    [Fact]
    public void YearBounds_RunsJanuaryToJanuary()
    {
        var (start, end) = TzDateMath.YearBounds(Utc(2026, 5, 14), Brussels);
        Assert.Equal(Utc(2025, 12, 31, 23), start); // CET (UTC+1) in January
        Assert.Equal(Utc(2026, 12, 31, 23), end);
    }

    [Theory]
    [InlineData(-1, 2025)]
    [InlineData(0, 2026)]
    [InlineData(1, 2027)]
    public void YearBounds_ShiftsWholeYearsByOffset(int offset, int expectedYear)
    {
        var (start, _) = TzDateMath.YearBounds(Utc(2026, 5, 14), Brussels, offset);
        Assert.Equal(new DateTime(expectedYear, 1, 1), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
    }

    [Fact]
    public void YearBounds_UsesTheLocalYear()
    {
        // 23:30 UTC on 2026-12-31 is already 2027 in Brussels (UTC+1).
        var (start, _) = TzDateMath.YearBounds(Utc(2026, 12, 31, 23, 30), Brussels);
        Assert.Equal(new DateTime(2027, 1, 1), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
    }

    // ------------------------------------------------------------- last/next N

    // "Last N days" is inclusive of today and ends NOW, not at midnight — the
    // range is open at the top so a row created a minute ago still matches.
    [Fact]
    public void LastNDaysBounds_EndsAtNow()
    {
        var now = Utc(2026, 5, 14, 15, 30);
        var (_, end) = TzDateMath.LastNDaysBounds(now, Brussels, 7);
        Assert.Equal(now, end);
    }

    [Theory]
    [InlineData(1, 14)]
    [InlineData(2, 13)]
    [InlineData(7, 8)]
    public void LastNDaysBounds_CountsTodayAsTheFirstDay(int n, int expectedLocalDay)
    {
        var (start, _) = TzDateMath.LastNDaysBounds(Utc(2026, 5, 14), Brussels, n);
        Assert.Equal(new DateTime(2026, 5, expectedLocalDay), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
    }

    [Fact]
    public void NextNDaysBounds_StartsAtNow()
    {
        var now = Utc(2026, 5, 14, 15, 30);
        var (start, _) = TzDateMath.NextNDaysBounds(now, Brussels, 7);
        Assert.Equal(now, start);
    }

    [Theory]
    [InlineData(1, 15)]
    [InlineData(7, 21)]
    public void NextNDaysBounds_EndsAtMidnightNDaysOut(int n, int expectedLocalDay)
    {
        var (_, end) = TzDateMath.NextNDaysBounds(Utc(2026, 5, 14), Brussels, n);
        Assert.Equal(new DateTime(2026, 5, expectedLocalDay), TimeZoneInfo.ConvertTimeFromUtc(end, Brussels));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void LastNDaysBounds_RejectsANonPositiveN(int n)
    {
        var ex = Assert.Throws<QueryBuilderException>(
            () => TzDateMath.LastNDaysBounds(Utc(2026, 5, 14), Brussels, n));
        Assert.Equal("INVALID_VALUE_SHAPE", ex.Code);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void NextNDaysBounds_RejectsANonPositiveN(int n)
    {
        var ex = Assert.Throws<QueryBuilderException>(
            () => TzDateMath.NextNDaysBounds(Utc(2026, 5, 14), Brussels, n));
        Assert.Equal("INVALID_VALUE_SHAPE", ex.Code);
    }

    // ------------------------------------------------------------ year-to-date

    [Fact]
    public void YearToDateBounds_RunsFromLocalJanuaryFirstToNow()
    {
        var now = Utc(2026, 5, 14, 15, 30);
        var (start, end) = TzDateMath.YearToDateBounds(now, Brussels);
        Assert.Equal(new DateTime(2026, 1, 1), TimeZoneInfo.ConvertTimeFromUtc(start, Brussels));
        Assert.Equal(now, end);
    }

    [Fact]
    public void YearToDateBounds_StartsWhereThisYearStarts()
    {
        var now = Utc(2026, 5, 14);
        var (ytdStart, _) = TzDateMath.YearToDateBounds(now, Brussels);
        var (yearStart, _) = TzDateMath.YearBounds(now, Brussels);
        Assert.Equal(yearStart, ytdStart);
    }

    // ------------------------------------------------------------- invariants

    // Every bounded operator must produce a non-empty, correctly ordered range
    // in every zone — a start after its end silently matches nothing.
    public static TheoryData<string> Zones() => new() { "UTC", "Europe/Brussels", "Pacific/Kiritimati", "Pacific/Niue", "America/New_York", "Asia/Kolkata" };

    [Theory]
    [MemberData(nameof(Zones))]
    public void AllRanges_AreOrderedAndNonEmpty(string iana)
    {
        var tz = TzDateMath.ResolveTimezone(iana);
        var now = Utc(2026, 5, 14, 15, 30);

        var ranges = new (string Name, (DateTime Start, DateTime End) Range)[]
        {
            ("today", TzDateMath.DayBounds(now, tz)),
            ("yesterday", TzDateMath.YesterdayBounds(now, tz)),
            ("this-week", TzDateMath.WeekBounds(now, tz)),
            ("last-week", TzDateMath.WeekBounds(now, tz, -1)),
            ("next-week", TzDateMath.WeekBounds(now, tz, 1)),
            ("this-month", TzDateMath.MonthBounds(now, tz)),
            ("last-month", TzDateMath.MonthBounds(now, tz, -1)),
            ("next-month", TzDateMath.MonthBounds(now, tz, 1)),
            ("this-year", TzDateMath.YearBounds(now, tz)),
            ("last-year", TzDateMath.YearBounds(now, tz, -1)),
            ("next-year", TzDateMath.YearBounds(now, tz, 1)),
            ("last-n-days", TzDateMath.LastNDaysBounds(now, tz, 7)),
            ("next-n-days", TzDateMath.NextNDaysBounds(now, tz, 7)),
            ("year-to-date", TzDateMath.YearToDateBounds(now, tz)),
        };

        foreach (var (name, (start, end)) in ranges)
        {
            Assert.True(start < end, $"{name} in {iana}: start {start:O} is not before end {end:O}");
        }
    }

    [Theory]
    [MemberData(nameof(Zones))]
    public void TodayContainsNow(string iana)
    {
        var tz = TzDateMath.ResolveTimezone(iana);
        var now = Utc(2026, 5, 14, 15, 30);
        var (start, end) = TzDateMath.DayBounds(now, tz);
        Assert.InRange(now, start, end);
    }

    [Theory]
    [MemberData(nameof(Zones))]
    public void ThisWeekContainsToday(string iana)
    {
        var tz = TzDateMath.ResolveTimezone(iana);
        var now = Utc(2026, 5, 14, 15, 30);
        var (weekStart, weekEnd) = TzDateMath.WeekBounds(now, tz);
        var (dayStart, dayEnd) = TzDateMath.DayBounds(now, tz);
        Assert.True(weekStart <= dayStart && dayEnd <= weekEnd);
    }

    // Adjacent periods must abut exactly — a gap loses rows, an overlap
    // double-counts them.
    [Theory]
    [MemberData(nameof(Zones))]
    public void AdjacentWeeksAbut(string iana)
    {
        var tz = TzDateMath.ResolveTimezone(iana);
        var now = Utc(2026, 3, 29, 15, 30); // a DST-transition week in Brussels
        Assert.Equal(TzDateMath.WeekBounds(now, tz, -1).EndUtc, TzDateMath.WeekBounds(now, tz).StartUtc);
        Assert.Equal(TzDateMath.WeekBounds(now, tz).EndUtc, TzDateMath.WeekBounds(now, tz, 1).StartUtc);
    }

    [Theory]
    [MemberData(nameof(Zones))]
    public void AdjacentMonthsAbut(string iana)
    {
        var tz = TzDateMath.ResolveTimezone(iana);
        var now = Utc(2026, 10, 25, 15, 30); // a DST-transition month in Brussels
        Assert.Equal(TzDateMath.MonthBounds(now, tz, -1).EndUtc, TzDateMath.MonthBounds(now, tz).StartUtc);
        Assert.Equal(TzDateMath.MonthBounds(now, tz).EndUtc, TzDateMath.MonthBounds(now, tz, 1).StartUtc);
    }

    [Theory]
    [MemberData(nameof(Zones))]
    public void AdjacentYearsAbut(string iana)
    {
        var tz = TzDateMath.ResolveTimezone(iana);
        var now = Utc(2026, 5, 14, 15, 30);
        Assert.Equal(TzDateMath.YearBounds(now, tz, -1).EndUtc, TzDateMath.YearBounds(now, tz).StartUtc);
        Assert.Equal(TzDateMath.YearBounds(now, tz).EndUtc, TzDateMath.YearBounds(now, tz, 1).StartUtc);
    }
}
