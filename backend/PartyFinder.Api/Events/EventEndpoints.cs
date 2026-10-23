using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using PartyFinder.Api.Auth;
using PartyFinder.Api.Common;
using PartyFinder.Api.Data;

namespace PartyFinder.Api.Events;

public record EventSummaryDto(
    Guid Id,
    string Title,
    EventCategory Category,
    EventStatus Status,
    DateTimeOffset StartsAt,
    DateTimeOffset? EndsAt,
    decimal? Price,
    string VenueName,
    string Address,
    double Latitude,
    double Longitude,
    int MeetupsCount,
    int ParticipantsCount);

public record EventDetailsDto(
    Guid Id,
    string Title,
    string Description,
    EventCategory Category,
    EventStatus Status,
    DateTimeOffset StartsAt,
    DateTimeOffset? EndsAt,
    decimal? Price,
    string? TicketUrl,
    string VenueName,
    string Address,
    double Latitude,
    double Longitude,
    string OrganizerName,
    int MeetupsCount,
    int ParticipantsCount,
    bool IsMine);

public record CreateEventRequest(
    [Required(ErrorMessage = "Введите название")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Название — от 3 до 200 символов")]
    string Title,
    [Required(ErrorMessage = "Добавьте описание")]
    [StringLength(4000, MinimumLength = 50, ErrorMessage = "Описание — от 50 символов")]
    string Description,
    EventCategory Category,
    DateTimeOffset StartsAt,
    DateTimeOffset? EndsAt,
    [Range(0, 1_000_000, ErrorMessage = "Некорректная цена")]
    decimal? Price,
    [Url(ErrorMessage = "Некорректная ссылка")]
    [StringLength(500)]
    string? TicketUrl,
    [Required(ErrorMessage = "Укажите место")]
    [StringLength(200)]
    string VenueName,
    [Required(ErrorMessage = "Укажите адрес")]
    [StringLength(300)]
    string Address,
    [Range(-90, 90)] double Latitude,
    [Range(-180, 180)] double Longitude,
    [StringLength(200)] string? OrganizerName);

public static class EventEndpoints
{
    /// <summary>Встречи, которые учитываются в счётчиках события: активные и публичные.</summary>
    internal static readonly Expression<Func<Meetup, bool>> CountedMeetup =
        m => m.Status == MeetupStatus.Active && m.Visibility == MeetupVisibility.Public;

    private static readonly Expression<Func<Event, EventSummaryDto>> ToSummary = e => new EventSummaryDto(
        e.Id, e.Title, e.Category, e.Status, e.StartsAt, e.EndsAt, e.Price, e.VenueName, e.Address,
        e.Latitude, e.Longitude,
        e.Meetups.AsQueryable().Count(CountedMeetup),
        e.Meetups.AsQueryable().Where(CountedMeetup).SelectMany(m => m.Participants).Count());

    public static void MapEventEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/events").WithTags("Events");

        group.MapGet("/", Search);
        group.MapGet("/mine", Mine).RequireAuthorization();
        group.MapGet("/{id:guid}", GetById);
        group.MapPost("/", Create).RequireAuthorization();
    }

    /// <summary>
    /// События для карты. Область задаётся границами south/west/north/east;
    /// по умолчанию — все предстоящие и идущие сейчас события.
    /// </summary>
    private static async Task<Ok<EventSummaryDto[]>> Search(
        AppDbContext db,
        TimeProvider time,
        double? south, double? west, double? north, double? east,
        EventCategory[]? category,
        DateTimeOffset? from,
        DateTimeOffset? to,
        string? q)
    {
        var now = time.GetUtcNow();
        var query = db.Events.Where(e => e.Status == EventStatus.Published && (e.EndsAt ?? e.StartsAt) >= now);

        if (south is not null && west is not null && north is not null && east is not null)
            query = query.Where(e => e.Latitude >= south && e.Latitude <= north && e.Longitude >= west && e.Longitude <= east);

        if (category is { Length: > 0 })
            query = query.Where(e => category.Contains(e.Category));

        // Событие попадает в диапазон, если хотя бы частично пересекается с ним (выставки идут неделями).
        if (from is not null)
        {
            var fromUtc = from.Value.ToUniversalTime();
            query = query.Where(e => (e.EndsAt ?? e.StartsAt) >= fromUtc);
        }
        if (to is not null)
        {
            var toUtc = to.Value.ToUniversalTime();
            query = query.Where(e => e.StartsAt <= toUtc);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = $"%{q.Trim()}%";
            query = query.Where(e => EF.Functions.ILike(e.Title, pattern) || EF.Functions.ILike(e.VenueName, pattern));
        }

        var items = await query.OrderBy(e => e.StartsAt).Take(300).Select(ToSummary).ToArrayAsync();
        return TypedResults.Ok(items);
    }

    private static async Task<Ok<EventSummaryDto[]>> Mine(ClaimsPrincipal user, AppDbContext db)
    {
        var userId = user.GetRequiredUserId();
        var items = await db.Events
            .Where(e => e.CreatedById == userId)
            .OrderByDescending(e => e.StartsAt)
            .Select(ToSummary)
            .ToArrayAsync();
        return TypedResults.Ok(items);
    }

    private static Expression<Func<Event, EventDetailsDto>> ToDetails(Guid? userId) => e => new EventDetailsDto(
        e.Id, e.Title, e.Description, e.Category, e.Status, e.StartsAt, e.EndsAt, e.Price, e.TicketUrl,
        e.VenueName, e.Address, e.Latitude, e.Longitude,
        e.OrganizerName ?? e.CreatedBy.Name,
        e.Meetups.AsQueryable().Count(CountedMeetup),
        e.Meetups.AsQueryable().Where(CountedMeetup).SelectMany(m => m.Participants).Count(),
        e.CreatedById == userId);

    private static async Task<IResult> GetById(Guid id, ClaimsPrincipal user, AppDbContext db)
    {
        var dto = await db.Events.Where(e => e.Id == id).Select(ToDetails(user.GetUserId())).SingleOrDefaultAsync();
        return dto is null ? Problems.NotFound("Событие не найдено") : Results.Ok(dto);
    }

    private static async Task<IResult> Create(
        CreateEventRequest req, ClaimsPrincipal user, AppDbContext db, TimeProvider time)
    {
        var now = time.GetUtcNow();
        if (req.StartsAt <= now)
            return Problems.Field("startsAt", "Дата начала должна быть в будущем");
        if (req.EndsAt is not null && req.EndsAt <= req.StartsAt)
            return Problems.Field("endsAt", "Окончание должно быть позже начала");

        // В MVP модерации нет: событие сразу публикуется на карте.
        var ev = new Event
        {
            Id = Guid.CreateVersion7(),
            Title = req.Title.Trim(),
            Description = req.Description.Trim(),
            Category = req.Category,
            StartsAt = req.StartsAt.ToUniversalTime(),
            EndsAt = req.EndsAt?.ToUniversalTime(),
            Price = req.Price is 0 ? null : req.Price,
            TicketUrl = string.IsNullOrWhiteSpace(req.TicketUrl) ? null : req.TicketUrl.Trim(),
            VenueName = req.VenueName.Trim(),
            Address = req.Address.Trim(),
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            OrganizerName = string.IsNullOrWhiteSpace(req.OrganizerName) ? null : req.OrganizerName.Trim(),
            CreatedById = user.GetRequiredUserId(),
            CreatedAt = now,
        };
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        var dto = await db.Events.Where(e => e.Id == ev.Id).Select(ToDetails(ev.CreatedById)).SingleAsync();
        return Results.Created($"/api/events/{ev.Id}", dto);
    }
}
