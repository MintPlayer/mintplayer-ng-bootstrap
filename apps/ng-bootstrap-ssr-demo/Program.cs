using Microsoft.AspNetCore.SpaServices.AngularCli;
using MintPlayer.AspNetCore.Hsts;
using MintPlayer.AspNetCore.SpaServices.Prerendering;
using MintPlayer.AspNetCore.SpaServices.Routing;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddSpaStaticFiles(configuration =>
{
    // In production, the Angular files will be served from this directory
    configuration.RootPath = "../../dist/apps/ng-bootstrap-demo/browser";
});
builder.Services.AddSpaPrerenderingService<Mintplayer.NgBootstrap.SsrDemo.Services.SpaPrerenderingService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseImprovedHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller}/{action=Index}/{id?}");

if (!app.Environment.IsDevelopment())
{
    app.UseSpaStaticFiles();
}

app.UseSpa(spa =>
{
    spa.Options.SourcePath = "../ng-bootstrap-demo";

    spa.UseSpaPrerendering(options =>
    {
        options.BootModuleBuilder = app.Environment.IsDevelopment() ? new AngularCliBuilder(npmScript: "build:ssr") : null;
        options.BootModulePath = $"{spa.Options.SourcePath}/../dist/apps/ng-bootstrap-demo/ClientApp/server/main.js";
        options.ExcludeUrls = new[] { "/sockjs-node" };
    });

    if (app.Environment.IsDevelopment())
    {
        spa.UseAngularCliServer(npmScript: "start");
    }
});

app.Run();
