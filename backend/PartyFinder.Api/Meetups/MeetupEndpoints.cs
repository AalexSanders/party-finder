using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PartyFinder.Api.Auth;
using PartyFinder.Api.Common;
using PartyFinder.Api.Data;

namespace PartyFinder.Api.Meetups;

public record UserBriefDto(Guid Id, string Name);

public record EventBriefDto(
    Guid Id, string Title, EventCategory Category, DateTimeOffset StartsAt, DateTimeOffset? EndsAt,
    string VenueName, string Address);

public record ParticipantDto(Guid UserId, string Name, string? Phone, bool IsOrganizer, DateTimeOffset JoinedAt);

public record MeetupDto(
    Guid Id,
    EventBriefDto Event,
    string Title,
    string? Description,
    DateTimeOffset MeetingTime,
    string MeetingPoint,
    int MaxParticipants,
    int ParticipantsCount,
    MeetupVisibility Visibility,
    MeetupStatus Status,
    string? CancelReason,
    UserBriefDto Organizer,
    UserBriefDto[] ParticipantsPreview, // первые участники — для стопки аватаров в карточке

    bool IsOrganizer,
    bool IsParticipant);

public record MeetupDetailsDto(MeetupDto Meetup, ParticipantDto[] Participants);

public record SaveMeetupRequest(
    [Required(ErrorMessage = "Введите название встречи")]
    [StringLength(120, MinimumLength = 3, ErrorMessage = "Название — от 3 до 120 символов")]
    string Title,
    [StringLength(500, ErrorMessage = "Описание — до 500 символов")]
    string? Description,
    DateTimeOffset MeetingTime,
    [Required(ErrorMessage = "Укажите место сбора")]
    [StringLength(200, ErrorMessage = "Место сбора — до 200 символов")]
    string MeetingPoint,
    [Range(2, 50, ErrorMessage = "Участников — от 2 до 50")]
    int MaxParticipants,
    MeetupVisibility Visibility);

public record CancelMeetupRequest([StringLength(500)] string? Reason);

public record MyMeetupsCountsDto(int Organizing, int Participating, int Past);

public enum MyMeetupsScope
{
    Organizing,
    Participating,
    Past,
}

public static class MeetupEndpoints
{
    private const int PreviewSize = 4;

    public static void MapMeetupEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/events/{eventId:guid}/meetups", ListForEvent).WithTags("Meetups");
        app.MapPost("/api/events/{eventId:guid}/meetups", Create).WithTags("Meetups").RequireAuthorization();

        var group = app.MapGroup("/api/meetups").WithTags("Meetups");
        group.MapGet("/mine", Mine).RequireAuthorization();
        group.MapGet("/mine/counts", MineCounts).RequireAuthorization();
        // Получить встречу по id можно без входа: так работает ссылка-приглашение.
        group.MapGet("/{id:guid}", GetById);
        group.MapPut("/{id:guid}", Update).RequireAuthorization();
        group.MapPost("/{id:guid}/cancel", Cancel).RequireAuthorization();
        group.MapPost("/{id:guid}/join", Join).RequireAuthorization();
        group.MapPost("/{id:guid}/leave", Leave).RequireAuthorization();
        group.MapDelete("/{id:guid}/participants/{userId:guid}", RemoveParticipant).RequireAuthorization();
    }

    private static IQueryable<MeetupDto> Project(IQueryable<Meetup> query, Guid? userId) =>
        query.Select(m => new MeetupDto(
            m.Id,
            new EventBriefDto(m.Event.Id, m.Event.Title, m.Event.Category, m.Event.StartsAt, m.Event.EndsAt,
                m.Event.VenueName, m.Event.Address),
            m.Title,
            m.Description,
            m.MeetingTime,
            m.MeetingPoint,
            m.MaxParticipants,
            m.Participants.Count,
            m.Visibility,
            m.Status,
            m.CancelReason,
            new UserBriefDto(m.Creator.Id, m.Creator.Name),
            m.Participants.OrderBy(p => p.JoinedAt).Take(PreviewSize)
                .Select(p => new UserBriefDto(p.User.Id, p.User.Name)).ToArray(),
            m.CreatorId == userId,
            m.Participants.Any(p => p.UserId == userId)));

    private static async Task<MeetupDetailsDto?> LoadDetails(AppDbContext db, Guid id, Guid? userId)
    {
        var meetup = await Project(db.Meetups.Where(m => m.Id == id), userId).SingleOrDefaultAsync();
        if (meetup is null) return null;

        // Контакты видят только участники встречи.
        var canSeeContacts = meetup.IsParticipant;
        var participants = await db.MeetupParticipants
            .Where(p => p.MeetupId == id)
            .OrderBy(p => p.JoinedAt)
            .Select(p => new ParticipantDto(
                p.UserId, p.User.Name, canSeeContacts ? p.User.Phone : null,
                p.UserId == p.Meetup.CreatorId, p.JoinedAt))
            .ToArrayAsync();

        return new MeetupDetailsDto(meetup, participants);
    }

    private static async Task<IResult> Details(AppDbContext db, Guid id, Guid? userId) =>
        await LoadDetails(db, id, userId) is { } dto ? Results.Ok(dto) : Problems.NotFound("Встреча не найдена");

    /// <summary>Встречи на событие: активные публичные плюс те, где текущий пользователь участвует.</summary>
    private static async Task<IResult> ListForEvent(Guid eventId, ClaimsPrincipal user, AppDbContext db)
    {
        if (!await db.Events.AnyAsync(e => e.Id == eventId))
            return Problems.NotFound("Событие не найдено");

        var userId = user.GetUserId();
        var query = db.Meetups.Where(m => m.EventId == eventId && m.Status == MeetupStatus.Active &&
            (m.Visibility == MeetupVisibility.Public || m.Participants.Any(p => p.UserId == userId)));

        // Свои встречи наверху, дальше — по времени сбора.
        query = query.OrderByDescending(m => m.Participants.Any(p => p.UserId == userId)).ThenBy(m => m.MeetingTime);
        var items = await Project(query, userId).ToArrayAsync();
        return Results.Ok(items);
    }

    private static async Task<IResult> GetById(Guid id, ClaimsPrincipal user, AppDbContext db) =>
        await Details(db, id, user.GetUserId());

    private static async Task<IResult> Create(
        Guid eventId, SaveMeetupRequest req, ClaimsPrincipal user, AppDbContext db, TimeProvider time)
    {
        var ev = await db.Events.FindAsync(eventId);
        if (ev is null) return Problems.NotFound("Событие не найдено");

        var now = time.GetUtcNow();
        if (ev.Status != EventStatus.Published || (ev.EndsAt ?? ev.StartsAt) < now)
            return Problems.Conflict("Событие уже прошло или отменено");
        if (ValidateMeetingTime(req.MeetingTime, ev, now) is { } timeError)
            return timeError;

        var userId = user.GetRequiredUserId();
        var meetup = new Meetup
        {
            Id = Guid.CreateVersion7(),
            EventId = ev.Id,
            CreatorId = userId,
            Title = req.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            MeetingTime = req.MeetingTime.ToUniversalTime(),
            MeetingPoint = req.MeetingPoint.Trim(),
            MaxParticipants = req.MaxParticipants,
            Visibility = req.Visibility,
            CreatedAt = now,
            Participants = [new MeetupParticipant { UserId = userId, JoinedAt = now }],
        };
        db.Meetups.Add(meetup);
        await db.SaveChangesAsync();

        return Results.Created($"/api/meetups/{meetup.Id}", await LoadDetails(db, meetup.Id, userId));
    }

    private static async Task<IResult> Update(
        Guid id, SaveMeetupRequest req, ClaimsPrincipal user, AppDbContext db, TimeProvider time)
    {
        var meetup = await db.Meetups.Include(m => m.Event).SingleOrDefaultAsync(m => m.Id == id);
        if (meetup is null) return Problems.NotFound("Встреча не найдена");

        var userId = user.GetRequiredUserId();
        if (meetup.CreatorId != userId) return Problems.Forbidden("Редактировать встречу может только организатор");
        if (meetup.Status == MeetupStatus.Cancelled) return Problems.Conflict("Встреча отменена");

        var now = time.GetUtcNow();
        if (meetup.MeetingTime.ToUniversalTime() != req.MeetingTime.ToUniversalTime() &&
            ValidateMeetingTime(req.MeetingTime, meetup.Event, now) is { } timeError)
            return timeError;

        var count = await db.MeetupParticipants.CountAsync(p => p.MeetupId == id);
        if (req.MaxParticipants < count)
            return Problems.Field("maxParticipants", $"Уже записано {count} — лимит не может быть меньше");

        meetup.Title = req.Title.Trim();
        meetup.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        meetup.MeetingTime = req.MeetingTime.ToUniversalTime();
        meetup.MeetingPoint = req.MeetingPoint.Trim();
        meetup.MaxParticipants = req.MaxParticipants;
        meetup.Visibility = req.Visibility;
        await db.SaveChangesAsync();

        return await Details(db, id, userId);
    }

    private static async Task<IResult> Cancel(Guid id, CancelMeetupRequest req, ClaimsPrincipal user, AppDbContext db)
    {
        var meetup = await db.Meetups.FindAsync(id);
        if (meetup is null) return Problems.NotFound("Встреча не найдена");

        var userId = user.GetRequiredUserId();
        if (meetup.CreatorId != userId) return Problems.Forbidden("Отменить встречу может только организатор");

        if (meetup.Status != MeetupStatus.Cancelled)
        {
            meetup.Status = MeetupStatus.Cancelled;
            meetup.CancelReason = string.IsNullOrWhiteSpace(req.Reason) ? null : req.Reason.Trim();
            await db.SaveChangesAsync();
        }
        return await Details(db, id, userId);
    }

    private static async Task<IResult> Join(Guid id, ClaimsPrincipal user, AppDbContext db, TimeProvider time)
    {
        var meetup = await db.Meetups.Include(m => m.Event).SingleOrDefaultAsync(m => m.Id == id);
        if (meetup is null) return Problems.NotFound("Встреча не найдена");

        var userId = user.GetRequiredUserId();
        var now = time.GetUtcNow();

        // Повторное нажатие «Присоединиться» не ошибка.
        if (await db.MeetupParticipants.AnyAsync(p => p.MeetupId == id && p.UserId == userId))
            return await Details(db, id, userId);

        if (meetup.Status == MeetupStatus.Cancelled) return Problems.Conflict("Встреча отменена");
        if ((meetup.Event.EndsAt ?? meetup.Event.StartsAt) < now) return Problems.Conflict("Событие уже прошло");

        var count = await db.MeetupParticipants.CountAsync(p => p.MeetupId == id);
        if (count >= meetup.MaxParticipants) return Problems.Conflict("Мест больше нет");

        db.MeetupParticipants.Add(new MeetupParticipant { MeetupId = id, UserId = userId, JoinedAt = now });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Гонка двух одновременных запросов от одного пользователя — запись уже есть.
        }
        return await Details(db, id, userId);
    }

    private static async Task<IResult> Leave(Guid id, ClaimsPrincipal user, AppDbContext db)
    {
        var meetup = await db.Meetups.FindAsync(id);
        if (meetup is null) return Problems.NotFound("Встреча не найдена");

        var userId = user.GetRequiredUserId();
        if (meetup.CreatorId == userId)
            return Problems.BadRequest("Организатор не может покинуть встречу — её можно отменить");

        await db.MeetupParticipants.Where(p => p.MeetupId == id && p.UserId == userId).ExecuteDeleteAsync();
        return await Details(db, id, userId);
    }

    private static async Task<IResult> RemoveParticipant(Guid id, Guid userId, ClaimsPrincipal user, AppDbContext db)
    {
        var meetup = await db.Meetups.FindAsync(id);
        if (meetup is null) return Problems.NotFound("Встреча не найдена");

        var currentUserId = user.GetRequiredUserId();
        if (meetup.CreatorId != currentUserId) return Problems.Forbidden("Удалять участников может только организатор");
        if (userId == currentUserId) return Problems.BadRequest("Нельзя удалить себя из своей встречи");

        await db.MeetupParticipants.Where(p => p.MeetupId == id && p.UserId == userId).ExecuteDeleteAsync();
        return await Details(db, id, currentUserId);
    }

    private static IQueryable<Meetup> MineQuery(AppDbContext db, Guid userId, MyMeetupsScope scope, DateTimeOffset now) =>
        scope switch
        {
            MyMeetupsScope.Organizing => db.Meetups.Where(m =>
                m.CreatorId == userId && (m.Event.EndsAt ?? m.Event.StartsAt) >= now),
            MyMeetupsScope.Participating => db.Meetups.Where(m =>
                m.CreatorId != userId && m.Participants.Any(p => p.UserId == userId) &&
                (m.Event.EndsAt ?? m.Event.StartsAt) >= now),
            _ => db.Meetups.Where(m =>
                m.Participants.Any(p => p.UserId == userId) && (m.Event.EndsAt ?? m.Event.StartsAt) < now),
        };

    private static async Task<IResult> Mine(
        ClaimsPrincipal user, AppDbContext db, TimeProvider time, MyMeetupsScope scope = MyMeetupsScope.Organizing)
    {
        var userId = user.GetRequiredUserId();
        var query = MineQuery(db, userId, scope, time.GetUtcNow());
        query = scope == MyMeetupsScope.Past ? query.OrderByDescending(m => m.MeetingTime) : query.OrderBy(m => m.MeetingTime);
        return Results.Ok(await Project(query, userId).ToArrayAsync());
    }

    private static async Task<MyMeetupsCountsDto> MineCounts(ClaimsPrincipal user, AppDbContext db, TimeProvider time)
    {
        var userId = user.GetRequiredUserId();
        var now = time.GetUtcNow();
        return new MyMeetupsCountsDto(
            await MineQuery(db, userId, MyMeetupsScope.Organizing, now).CountAsync(),
            await MineQuery(db, userId, MyMeetupsScope.Participating, now).CountAsync(),
            await MineQuery(db, userId, MyMeetupsScope.Past, now).CountAsync());
    }

    private static IResult? ValidateMeetingTime(DateTimeOffset meetingTime, Event ev, DateTimeOffset now)
    {
        if (meetingTime <= now)
            return Problems.Field("meetingTime", "Время сбора должно быть в будущем");
        if (meetingTime > (ev.EndsAt ?? ev.StartsAt))
            return Problems.Field("meetingTime", "Сбор должен быть до окончания события");
        return null;
    }
}
