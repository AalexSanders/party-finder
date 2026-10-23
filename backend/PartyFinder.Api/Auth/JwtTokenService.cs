using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PartyFinder.Api.Data;

namespace PartyFinder.Api.Auth;

public class JwtOptions
{
    public const string Section = "Jwt";

    public string Issuer { get; set; } = "party-finder";
    public string Audience { get; set; } = "party-finder";

    /// <summary>Секрет для подписи HMAC-SHA256, не короче 32 байт.</summary>
    public string Key { get; set; } = "";

    public int LifetimeDays { get; set; } = 7;

    public SymmetricSecurityKey SigningKey => new(Encoding.UTF8.GetBytes(Key));
}

public class JwtTokenService(IOptions<JwtOptions> options, TimeProvider time)
{
    private readonly JwtOptions _options = options.Value;

    public string CreateToken(User user)
    {
        var now = time.GetUtcNow();
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.Name),
            ],
            notBefore: now.UtcDateTime,
            expires: now.AddDays(_options.LifetimeDays).UtcDateTime,
            signingCredentials: new SigningCredentials(_options.SigningKey, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id) ? id : null;

    /// <summary>Для эндпоинтов с RequireAuthorization: там пользователь гарантированно есть.</summary>
    public static Guid GetRequiredUserId(this ClaimsPrincipal principal) =>
        principal.GetUserId() ?? throw new InvalidOperationException("Пользователь не аутентифицирован.");
}
