FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY PartyFinder.Api/PartyFinder.Api.csproj PartyFinder.Api/
RUN dotnet restore PartyFinder.Api/PartyFinder.Api.csproj
COPY PartyFinder.Api/ PartyFinder.Api/
RUN dotnet publish PartyFinder.Api/PartyFinder.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "PartyFinder.Api.dll"]
