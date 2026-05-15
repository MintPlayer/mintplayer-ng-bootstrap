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
# `tzdata` ships the IANA timezone database (/usr/share/zoneinfo/*). Without
# it `TimeZoneInfo.FindSystemTimeZoneById("Europe/Brussels")` throws
# `TimeZoneNotFoundException` → the API responds with `INVALID_TIMEZONE` for
# every request that sends a timezone (which the demo does by default,
# resolved from the user's browser via Intl.DateTimeFormat). Alpine doesn't
# install tzdata by default; --no-cache keeps the layer minimal.
#
# Alpine's tzdata package is built from upstream IANA data and contains
# every zone in the database — Europe/Brussels, America/Sao_Paulo,
# Asia/Tokyo, etc. The sanity-check below asserts a handful of high-traffic
# zones are present so a broken/stripped tzdata fails image build, not
# the first request after deploy.
RUN apk add --no-cache tzdata \
 && test -f /usr/share/zoneinfo/Europe/Brussels \
 && test -f /usr/share/zoneinfo/Europe/Amsterdam \
 && test -f /usr/share/zoneinfo/America/Sao_Paulo \
 && test -f /usr/share/zoneinfo/America/New_York \
 && test -f /usr/share/zoneinfo/Asia/Tokyo \
 && test -f /usr/share/zoneinfo/Australia/Sydney \
 && test -f /usr/share/zoneinfo/UTC
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
# Container default zone. Per-request `timezone` in the QueryRequest body
# still wins (TzDateMath.ResolveTimezone reads it); this only affects logs
# and any `DateTime.Now` calls that fall back to the container clock.
ENV TZ=UTC
EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["dotnet", "Api.dll"]

# docker build --tag 'mintplayer-ng-bootstrap-api' -f apps/api/Dockerfile .
# docker run -p 5000:8080 -v api-data:/data mintplayer-ng-bootstrap-api
# Visit http://localhost:5000/api/orders/schema
