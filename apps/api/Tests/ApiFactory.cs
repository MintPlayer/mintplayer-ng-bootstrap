using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace MintPlayer.NgBootstrap.Api.Tests;

/// <summary>
/// Boots the real application against a throwaway SQLite file.
///
/// Deliberately NOT the EF InMemory provider. InMemory evaluates LINQ in
/// process, so it would silently pass every expression the walker builds —
/// including ones no relational provider can translate, which is precisely the
/// failure these tests exist to catch. It also cannot run the migrations that
/// Program.cs applies at startup.
///
/// A file rather than `:memory:` because the app opens and closes several
/// connections (the legacy-db probe, MigrateAsync, then each request scope) and
/// a SQLite in-memory database dies with the connection that created it.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(
        Path.GetTempPath(), $"api-tests-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={_dbPath}",
            });
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;

        // The SQLite connection pool can still hold the file open; a failure to
        // delete a temp file must never fail a test run.
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        try
        {
            if (File.Exists(_dbPath)) File.Delete(_dbPath);
        }
        catch (IOException)
        {
        }
    }
}
