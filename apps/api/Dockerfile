# Stage 1: Build + publish.
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src
COPY apps/api/Api.csproj apps/api/
RUN dotnet restore apps/api/Api.csproj
COPY apps/api/ apps/api/
RUN dotnet publish apps/api/Api.csproj -c Release -o /app -p:UseAppHost=false

# Stage 2: Runtime.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-bootstrap"
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["dotnet", "Api.dll"]

# docker build --tag 'mintplayer-ng-bootstrap-api' -f apps/api/Dockerfile .
# docker run -p 5000:8080 -v api-data:/data mintplayer-ng-bootstrap-api
# Visit http://localhost:5000/api/orders/schema
