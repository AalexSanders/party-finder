using Microsoft.EntityFrameworkCore;

namespace PartyFinder.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Meetup> Meetups => Set<Meetup>();
    public DbSet<MeetupParticipant> MeetupParticipants => Set<MeetupParticipant>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // Перечисления храним строками: так БД читается без справочника значений.
        builder.Properties<EventCategory>().HaveConversion<string>().HaveMaxLength(16);
        builder.Properties<EventStatus>().HaveConversion<string>().HaveMaxLength(16);
        builder.Properties<MeetupVisibility>().HaveConversion<string>().HaveMaxLength(16);
        builder.Properties<MeetupStatus>().HaveConversion<string>().HaveMaxLength(16);
    }

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.Phone).HasMaxLength(32);
            e.HasIndex(x => x.Email).IsUnique();
        });

        model.Entity<Event>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Description).HasMaxLength(4000);
            e.Property(x => x.Price).HasPrecision(10, 2);
            e.Property(x => x.TicketUrl).HasMaxLength(500);
            e.Property(x => x.VenueName).HasMaxLength(200);
            e.Property(x => x.Address).HasMaxLength(300);
            e.Property(x => x.OrganizerName).HasMaxLength(200);
            e.HasOne(x => x.CreatedBy).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.StartsAt);
            e.HasIndex(x => new { x.Latitude, x.Longitude });
        });

        model.Entity<Meetup>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(120);
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.MeetingPoint).HasMaxLength(200);
            e.Property(x => x.CancelReason).HasMaxLength(500);
            e.HasOne(x => x.Event).WithMany(x => x.Meetups).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Creator).WithMany().OnDelete(DeleteBehavior.Restrict);
        });

        model.Entity<MeetupParticipant>(e =>
        {
            e.HasKey(x => new { x.MeetupId, x.UserId });
            e.HasOne(x => x.Meetup).WithMany(x => x.Participants).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany().OnDelete(DeleteBehavior.Cascade);
        });
    }
}

