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

builder.Services.AddCors(o =>
{
    o.AddDefaultPolicy(p => p
        .WithOrigins("http://localhost:4200")
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

if (app.Environment.IsDevelopment())
{
    app.UseCors();
}

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
}

app.Run();

/// <summary>Used by ApplicationFactory tests in apps/api/Tests.</summary>
public partial class Program;
