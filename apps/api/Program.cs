using Microsoft.EntityFrameworkCore;
using MintPlayer.NgBootstrap.Api.Data;
using MintPlayer.NgBootstrap.Api.QueryBuilder;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<DemoDbContext>(o =>
{
    var cs = builder.Configuration.GetConnectionString("Default") ?? "Data Source=demo.db";
    o.UseSqlite(cs);
});

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // PolymorphicTypeResolver picks up the JsonPolymorphic attribute on ExpressionNode.
    });

// CORS — read allowed origins from configuration so the production VPS deploy
// can extend the list without recompiling the image. Defaults cover the
// three demos in both dev and prod:
//   - http://localhost:4200 / :4000 / :4100   (ng / react / vue dev servers)
//   - https://bootstrap.mintplayer.com         (Angular demo, prod)
//   - https://react.bootstrap.mintplayer.com   (React demo, prod)
//   - https://vue.bootstrap.mintplayer.com     (Vue demo, prod)
// Cross-origin is required because the demos and the API live on different
// subdomains in production. (Dev: React/Vue use a Vite proxy so /api/* is
// same-origin; the CORS allowance is the fallback for direct calls.)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[]
    {
        "http://localhost:4200",
        "http://localhost:4000",
        "http://localhost:4100",
        "https://bootstrap.mintplayer.com",
        "https://react.bootstrap.mintplayer.com",
        "https://vue.bootstrap.mintplayer.com",
    };
builder.Services.AddCors(o =>
{
    o.AddDefaultPolicy(p => p
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

// Translate QueryBuilderException to HTTP 400 with the typed code.
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (QueryBuilderException qbe)
    {
        ctx.Response.StatusCode = 400;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsJsonAsync(new { code = qbe.Code, detail = qbe.Detail });
    }
});

app.UseCors();

app.MapControllers();

// Lightweight liveness/readiness probe.
app.MapGet("/", () => Results.Ok(new { name = "mintplayer-ng-bootstrap-api", status = "ok" }));

// Migrate + seed on startup. EnsureCreated creates a fresh SQLite file on
// first boot; the seed runs only when the Customers table is empty.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DemoDbContext>();
    await db.Database.EnsureCreatedAsync();
    await DemoSeed.RunAsync(db);
    await DemoSeed.SeedTreeItemsAsync(db);
}

app.Run();

/// <summary>Used by ApplicationFactory tests in apps/api/Tests.</summary>
public partial class Program;
