namespace PartyFinder.Api.Data;

public enum EventCategory
{
    Music,
    Art,
    Sport,
    Party,
    Food,
    Cinema,
}

public enum EventStatus
{
    Published,
    Cancelled,
}

public enum MeetupVisibility
{
    /// <summary>Видна всем на странице события.</summary>
    Public,

    /// <summary>Не показывается в списке, присоединиться можно только по ссылке.</summary>
    LinkOnly,
}

public enum MeetupStatus
{
    Active,
    Cancelled,
}

public class User
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public required string PasswordHash { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class Event
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public required string Description { get; set; }
    public EventCategory Category { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Published;

    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }

    /// <summary>Минимальная цена билета; null — бесплатно.</summary>
    public decimal? Price { get; set; }
    public string? TicketUrl { get; set; }

    public required string VenueName { get; set; }
    public required string Address { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    /// <summary>Публичное название организатора (площадка, клуб); если пусто — имя пользователя.</summary>
    public string? OrganizerName { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; }

    public List<Meetup> Meetups { get; set; } = [];
}

public class Meetup
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public Guid CreatorId { get; set; }
    public User Creator { get; set; } = null!;

    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset MeetingTime { get; set; }
    public required string MeetingPoint { get; set; }

    /// <summary>Максимум участников, включая организатора встречи.</summary>
    public int MaxParticipants { get; set; }
    public MeetupVisibility Visibility { get; set; }
    public MeetupStatus Status { get; set; } = MeetupStatus.Active;
    public string? CancelReason { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Все участники, включая организатора встречи.</summary>
    public List<MeetupParticipant> Participants { get; set; } = [];
}

public class MeetupParticipant
{
    public Guid MeetupId { get; set; }
    public Meetup Meetup { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTimeOffset JoinedAt { get; set; }
}
