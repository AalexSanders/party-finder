using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PartyFinder.Api.Common;
using PartyFinder.Api.Data;

namespace PartyFinder.Api.Auth;

public record RegisterRequest(
    [Required(ErrorMessage = "Введите имя")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Имя — от 2 до 100 символов")]
    string Name,
    [Required(ErrorMessage = "Введите email")]
    [EmailAddress(ErrorMessage = "Некорректный email")]
    [StringLength(256)]
    string Email,
    [Phone(ErrorMessage = "Некорректный номер телефона")]
    [StringLength(32)]
    string? Phone,
    [Required(ErrorMessage = "Введите пароль")]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Минимум 8 символов")]
    string Password);

public record LoginRequest(
    [Required(ErrorMessage = "Введите email")] string Email,
    [Required(ErrorMessage = "Введите пароль")] string Password);

public record UserDto(Guid Id, string Name, string Email, string? Phone);

public record AuthResponse(string Token, UserDto User);

public static class AuthEndpoints
{
    public static UserDto ToDto(this User u) => new(u.Id, u.Name, u.Email, u.Phone);

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapGet("/me", Me).RequireAuthorization();
    }

    private static async Task<IResult> Register(
        RegisterRequest req, AppDbContext db, IPasswordHasher<User> hasher, JwtTokenService tokens, TimeProvider time)
    {
        if (!req.Password.Any(char.IsLetter) || !req.Password.Any(char.IsDigit))
            return Problems.Field("password", "Пароль должен содержать буквы и цифры");

        var email = NormalizeEmail(req.Email);
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Problems.Field("email", "Пользователь с таким email уже зарегистрирован");

        var user = new User
        {
            Id = Guid.CreateVersion7(),
            Name = req.Name.Trim(),
            Email = email,
            Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
            PasswordHash = "",
            CreatedAt = time.GetUtcNow(),
        };
        user.PasswordHash = hasher.HashPassword(user, req.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Results.Ok(new AuthResponse(tokens.CreateToken(user), user.ToDto()));
    }

    private static async Task<IResult> Login(
        LoginRequest req, AppDbContext db, IPasswordHasher<User> hasher, JwtTokenService tokens)
    {
        var email = NormalizeEmail(req.Email);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password) == PasswordVerificationResult.Failed)
            return Problems.Unauthorized("Неверный email или пароль");

        return Results.Ok(new AuthResponse(tokens.CreateToken(user), user.ToDto()));
    }

    private static async Task<IResult> Me(ClaimsPrincipal principal, AppDbContext db)
    {
        var user = await db.Users.FindAsync(principal.GetRequiredUserId());
        // Токен валиден, но пользователя уже нет (например, БД пересоздали) — просим войти заново.
        return user is null ? Problems.Unauthorized("Сессия устарела, войдите снова") : Results.Ok(user.ToDto());
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
