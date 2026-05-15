namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

/// <summary>
/// Relative-date math in a specific IANA timezone. Returns UTC ranges.
/// Per PRD Appendix A: week boundaries are ISO 8601 (Monday-start);
/// DST transitions are honoured because we add days in the local zone
/// before converting to UTC.
/// </summary>
public static class TzDateMath
{
    public static TimeZoneInfo ResolveTimezone(string? iana)
    {
        if (string.IsNullOrWhiteSpace(iana)) return TimeZoneInfo.Utc;
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(iana);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new QueryBuilderException("INVALID_TIMEZONE", iana);
        }
        catch (InvalidTimeZoneException)
        {
            throw new QueryBuilderException("INVALID_TIMEZONE", iana);
        }
    }

    /// <summary>Start (inclusive) and end (exclusive) of "today" in TZ, as UTC.</summary>
    public static (DateTime StartUtc, DateTime EndUtc) DayBounds(DateTime nowUtc, TimeZoneInfo tz)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        var localMidnight = new DateTime(localNow.Year, localNow.Month, localNow.Day, 0, 0, 0, DateTimeKind.Unspecified);
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(localMidnight, tz);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(localMidnight.AddDays(1), tz);
        return (startUtc, endUtc);
    }

    public static (DateTime StartUtc, DateTime EndUtc) YesterdayBounds(DateTime nowUtc, TimeZoneInfo tz)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        var localMidnight = new DateTime(localNow.Year, localNow.Month, localNow.Day, 0, 0, 0, DateTimeKind.Unspecified);
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(localMidnight.AddDays(-1), tz);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(localMidnight, tz);
        return (startUtc, endUtc);
    }

    /// <summary>ISO 8601 week containing `nowUtc` (Monday 00:00 to next Monday 00:00, in TZ).</summary>
    public static (DateTime StartUtc, DateTime EndUtc) WeekBounds(DateTime nowUtc, TimeZoneInfo tz, int weekOffset = 0)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        // .NET's DayOfWeek: Sunday=0, Monday=1, …, Saturday=6. ISO Monday is 1.
        int dow = (int)localNow.DayOfWeek;
        int daysSinceMonday = dow == 0 ? 6 : dow - 1;
        var mondayLocal = new DateTime(localNow.Year, localNow.Month, localNow.Day, 0, 0, 0, DateTimeKind.Unspecified)
            .AddDays(-daysSinceMonday + 7 * weekOffset);
        var nextMondayLocal = mondayLocal.AddDays(7);
        return (
            TimeZoneInfo.ConvertTimeToUtc(mondayLocal, tz),
            TimeZoneInfo.ConvertTimeToUtc(nextMondayLocal, tz)
        );
    }

    public static (DateTime StartUtc, DateTime EndUtc) MonthBounds(DateTime nowUtc, TimeZoneInfo tz, int monthOffset = 0)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        var firstOfMonth = new DateTime(localNow.Year, localNow.Month, 1, 0, 0, 0, DateTimeKind.Unspecified)
            .AddMonths(monthOffset);
        var firstOfNextMonth = firstOfMonth.AddMonths(1);
        return (
            TimeZoneInfo.ConvertTimeToUtc(firstOfMonth, tz),
            TimeZoneInfo.ConvertTimeToUtc(firstOfNextMonth, tz)
        );
    }

    public static (DateTime StartUtc, DateTime EndUtc) YearBounds(DateTime nowUtc, TimeZoneInfo tz, int yearOffset = 0)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        var jan1 = new DateTime(localNow.Year + yearOffset, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var nextJan1 = jan1.AddYears(1);
        return (
            TimeZoneInfo.ConvertTimeToUtc(jan1, tz),
            TimeZoneInfo.ConvertTimeToUtc(nextJan1, tz)
        );
    }

    public static (DateTime StartUtc, DateTime EndUtc) LastNDaysBounds(DateTime nowUtc, TimeZoneInfo tz, int n)
    {
        if (n < 1) throw new QueryBuilderException("INVALID_VALUE_SHAPE", "last-n-days n must be >= 1");
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        var localStart = new DateTime(localNow.Year, localNow.Month, localNow.Day, 0, 0, 0, DateTimeKind.Unspecified)
            .AddDays(-(n - 1));
        return (
            TimeZoneInfo.ConvertTimeToUtc(localStart, tz),
            nowUtc
        );
    }

    public static (DateTime StartUtc, DateTime EndUtc) NextNDaysBounds(DateTime nowUtc, TimeZoneInfo tz, int n)
    {
        if (n < 1) throw new QueryBuilderException("INVALID_VALUE_SHAPE", "next-n-days n must be >= 1");
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        var localStart = new DateTime(localNow.Year, localNow.Month, localNow.Day, 0, 0, 0, DateTimeKind.Unspecified);
        var localEnd = localStart.AddDays(n);
        return (
            nowUtc,
            TimeZoneInfo.ConvertTimeToUtc(localEnd, tz)
        );
    }

    public static (DateTime StartUtc, DateTime EndUtc) YearToDateBounds(DateTime nowUtc, TimeZoneInfo tz)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
        var jan1Local = new DateTime(localNow.Year, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);
        return (
            TimeZoneInfo.ConvertTimeToUtc(jan1Local, tz),
            nowUtc
        );
    }
}
