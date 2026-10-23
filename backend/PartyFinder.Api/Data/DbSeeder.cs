using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace PartyFinder.Api.Data;

public class SeedOptions
{
    public const string Section = "Seed";

    public bool Enabled { get; set; }

    /// <summary>Пароль всех демо-пользователей.</summary>
    public string DemoPassword { get; set; } = "Password123";
}

/// <summary>
/// Демо-данные по Екатеринбургу. Даты считаются от текущего дня,
/// поэтому после пересоздания БД события всегда предстоящие.
/// </summary>
public class DbSeeder(AppDbContext db, IPasswordHasher<User> hasher, TimeProvider time, ILogger<DbSeeder> logger)
{
    private static readonly TimeSpan Yekaterinburg = TimeSpan.FromHours(5);

    public async Task SeedAsync(string demoPassword)
    {
        if (await db.Users.AnyAsync())
            return;

        var now = time.GetUtcNow();
        var today = now.ToOffset(Yekaterinburg).Date;
        DateTimeOffset At(int days, int hour, int minute = 0) =>
            new DateTimeOffset(today.AddDays(days).AddHours(hour).AddMinutes(minute), Yekaterinburg).ToUniversalTime();

        User NewUser(string name, string email, string? phone = null)
        {
            var u = new User { Id = Guid.CreateVersion7(), Name = name, Email = email, Phone = phone, PasswordHash = "", CreatedAt = now };
            u.PasswordHash = hasher.HashPassword(u, demoPassword);
            return u;
        }

        var anya = NewUser("Аня Ковалёва", "anya@example.com", "+7 912 000-11-22");
        var masha = NewUser("Маша Петрова", "masha@example.com", "+7 912 000-33-44");
        var dima = NewUser("Дима Соколов", "dima@example.com");
        var olya = NewUser("Оля Лебедева", "olya@example.com", "+7 912 000-55-66");
        var vova = NewUser("Вова Иванов", "vova@example.com");
        var katya = NewUser("Катя Смирнова", "katya@example.com");
        var org = NewUser("Афиша Екатеринбурга", "organizer@example.com");
        db.Users.AddRange(anya, masha, dima, olya, vova, katya, org);

        Event E(string title, EventCategory cat, DateTimeOffset start, DateTimeOffset? end, decimal? price,
            string venue, string address, double lat, double lng, string organizer, string description, User? createdBy = null) =>
            new()
            {
                Id = Guid.CreateVersion7(),
                Title = title,
                Category = cat,
                StartsAt = start,
                EndsAt = end,
                Price = price,
                VenueName = venue,
                Address = address,
                Latitude = lat,
                Longitude = lng,
                OrganizerName = organizer,
                Description = description,
                CreatedById = (createdBy ?? org).Id,
                CreatedAt = now,
            };

        var jazz = E("Джазовый вечер на Плотинке", EventCategory.Music, At(2, 19), At(2, 22), 1500,
            "Исторический сквер", "пр. Ленина, 9", 56.8375, 60.6037, "Джаз-клуб «Синяя птица»",
            "Живой джаз от квартета Blue Note Avenue на открытой веранде у пруда. Стандарты 50-х, импровизации и гостевые солисты. Можно прийти компанией — столы на 4–8 человек.");
        var philharmonic = E("Уральский филармонический оркестр: Рахманинов", EventCategory.Music, At(4, 19), At(4, 21, 30), 1200,
            "Свердловская филармония", "ул. Карла Либкнехта, 38", 56.8396, 60.6085, "Свердловская филармония",
            "Второй фортепианный концерт и «Симфонические танцы» Рахманинова. Дирижёр — Дмитрий Лисс, солист — лауреат конкурса Чайковского.");
        var rock = E("Вечер уральского рока", EventCategory.Music, At(8, 20), At(8, 23), 1800,
            "Дворец молодёжи", "пр. Ленина, 1", 56.8384, 60.5898, "Уральский рок-клуб",
            "Трибьют-концерт легендам Свердловского рок-клуба: «Наутилус», «Агата Кристи», «Чайф». Три молодые группы и сюрприз в финале.");
        var exhibition = E("Выставка «Свет и тень»", EventCategory.Art, At(-3, 10), At(30, 20), 600,
            "Ельцин Центр", "ул. Бориса Ельцина, 3", 56.8447, 60.5911, "Арт-галерея Ельцин Центра",
            "Фотография и медиаискусство о том, как свет меняет город. Более 80 работ уральских и российских художников, интерактивные инсталляции.");
        var lecture = E("Лекция «Город будущего»", EventCategory.Art, At(6, 19), At(6, 21), null,
            "Библиотека им. Белинского", "ул. Белинского, 15", 56.8327, 60.6057, "Библиотека им. Белинского",
            "Урбанист Анна Смирнова расскажет, как меняются города: от общественных пространств до транспорта будущего. После лекции — открытая дискуссия.", anya);
        var streetArt = E("Экскурсия по стрит-арту «Стенограффия»", EventCategory.Art, At(4, 15), At(4, 17), 500,
            "Площадь 1905 года", "пл. 1905 года", 56.8380, 60.5970, "Фестиваль «Стенограффия»",
            "Двухчасовая прогулка по центру с гидом фестиваля: истории муралов, авторы и места, которые не найти без подсказки.");
        var run = E("Утренний забег вдоль Исети", EventCategory.Sport, At(3, 9), At(3, 11), null,
            "Набережная Исети", "наб. Исети, у Ельцин Центра", 56.8434, 60.5956, "Беговой клуб «Исеть»",
            "Дистанции 5 и 10 км вдоль реки. Разминка с тренером, чай и фото на финише. Подходит для любого уровня.");
        var yoga = E("Йога в Дендропарке", EventCategory.Sport, At(1, 10), At(1, 11, 30), null,
            "Дендропарк на 8 Марта", "ул. 8 Марта, 37а", 56.8255, 60.6048, "Студия «Прана»",
            "Утренняя практика на свежем воздухе для начинающих и продолжающих. Возьмите коврик и воду — остальное организуем мы.");
        var volleyball = E("Пляжный волейбол в ЦПКиО", EventCategory.Sport, At(5, 12), At(5, 15), null,
            "ЦПКиО им. Маяковского", "ул. Мичурина, 230", 56.8165, 60.6342, "Лига любительского волейбола",
            "Открытые игры на крытых площадках парка. Команды собираем на месте, мячи и сетки есть.");
        var bike = E("Велопрогулка вокруг Шарташа", EventCategory.Sport, At(6, 11), At(6, 14), null,
            "Шарташский лесопарк", "ул. Высоцкого, 1, вход у Каменных палаток", 56.8495, 60.6930, "Велоклуб «Урал»",
            "Неспешный круг 20 км вокруг озера с остановкой у Каменных палаток. Темп прогулочный, прокат велосипедов рядом.");
        var techno = E("Techno Night: Warehouse", EventCategory.Party, At(2, 23), At(3, 5), 2000,
            "Клуб «Телеклуб»", "ул. Карьерная, 16", 56.8118, 60.5731, "Warehouse Events",
            "Всю ночь техно и хаус от резидентов и гостей из Москвы. Два танцпола, световое шоу, фейс-контроль 18+.");
        var retro = E("Вечеринка нулевых", EventCategory.Party, At(9, 22), At(10, 3), 800,
            "Бар «Подвал»", "ул. Малышева, 56", 56.8366, 60.6129, "Бар «Подвал»",
            "Хиты 2000-х, дресс-код приветствуется. Конкурс на лучший образ и караоке после полуночи.");
        var quiz = E("Квиз: кино и сериалы", EventCategory.Party, At(1, 19, 30), At(1, 22), 500,
            "Антикафе «Часы»", "ул. Розы Люксембург, 4", 56.8344, 60.6087, "Квиз-клуб «Знатоки»",
            "Семь раундов вопросов о фильмах и сериалах. Команды до 6 человек, можно прийти одному — найдём команду.");
        var foodFest = E("Фестиваль уличной еды", EventCategory.Food, At(2, 12), At(3, 21), null,
            "ЦПКиО им. Маяковского", "ул. Мичурина, 230", 56.8160, 60.6355, "Ural Food Fest",
            "Больше 40 фудтраков: от уральских пельменей до тайской лапши. Живая музыка и детская зона.");
        var dinner = E("Гастроужин уральской кухни", EventCategory.Food, At(7, 19), At(7, 22), 3500,
            "Ресторан «Демидов»", "ул. Вайнера, 9", 56.8362, 60.6000, "Гастрономический клуб «Урал»",
            "Сет из семи блюд от шефа: строганина, пельмени с олениной, уха по-уральски. Рассказ о локальных продуктах.");
        var cheese = E("Сырный маркет", EventCategory.Food, At(5, 11), At(5, 19), null,
            "Пассаж", "ул. Вайнера, 10", 56.8370, 60.6005, "Сыроварни Урала",
            "Фермерские сыроварни региона: дегустации, мастер-классы и лекция о сочетаниях сыра и вина.");
        var roofCinema = E("Кино на крыше: «Амели»", EventCategory.Cinema, At(1, 20, 30), At(1, 22, 30), 450,
            "Крыша «Высоцкого»", "ул. Малышева, 51", 56.8360, 60.6147, "Кинотеатр под открытым небом",
            "Показ культового фильма на крыше с видом на город. Пледы и глинтвейн включены.");
        var stalker = E("Ретроспектива Тарковского: «Сталкер»", EventCategory.Cinema, At(3, 19, 30), At(3, 22), 350,
            "Киноцентр «Космос»", "ул. Дзержинского, 2", 56.8446, 60.6036, "Киноклуб «Плёнка»",
            "Показ отреставрированной копии с вступительным словом киноведа и обсуждением после сеанса.");
        var pastCinema = E("Ночь кино: советская фантастика", EventCategory.Cinema, At(-12, 21), At(-11, 2), null,
            "Библиотека им. Белинского", "ул. Белинского, 15", 56.8327, 60.6057, "Библиотека им. Белинского",
            "Три фильма подряд: «Солярис», «Через тернии к звёздам» и «Кин-дза-дза!». Чай, печенье и обсуждение до утра.", anya);

        db.Events.AddRange(jazz, philharmonic, rock, exhibition, lecture, streetArt, run, yoga, volleyball, bike,
            techno, retro, quiz, foodFest, dinner, cheese, roofCinema, stalker, pastCinema);

        Meetup M(Event ev, User creator, string title, string? description, DateTimeOffset meetingTime, string point,
            int max, MeetupVisibility visibility, params User[] others)
        {
            var m = new Meetup
            {
                Id = Guid.CreateVersion7(),
                EventId = ev.Id,
                CreatorId = creator.Id,
                Title = title,
                Description = description,
                MeetingTime = meetingTime,
                MeetingPoint = point,
                MaxParticipants = max,
                Visibility = visibility,
                CreatedAt = now,
            };
            m.Participants.Add(new MeetupParticipant { UserId = creator.Id, JoinedAt = now.AddDays(-3) });
            for (var i = 0; i < others.Length; i++)
                m.Participants.Add(new MeetupParticipant { UserId = others[i].Id, JoinedAt = now.AddDays(-2).AddHours(i) });
            return m;
        }

        db.Meetups.AddRange(
            M(jazz, anya, "Идём на джаз после работы", "Небольшая компания, после концерта — ужин неподалёку. Пишите, если хотите присоединиться!",
                At(2, 18, 30), "У памятника основателям города", 6, MeetupVisibility.Public, masha, dima, olya),
            M(jazz, dima, "Джаз и вино после", "Взяли стол на веранде, после концерта — винный бар рядом.",
                At(2, 18, 45), "Бар «Терраса» на Плотинке", 3, MeetupVisibility.Public, vova, katya),
            M(jazz, katya, "Только свои", null, At(2, 18, 40), "Вход со стороны пруда", 4, MeetupVisibility.LinkOnly),
            M(run, masha, "Бежим 10 км компанией", "Темп 5:30–6:00, после — кофе неподалёку.",
                At(3, 8, 40), "У Ельцин Центра, главный вход", 8, MeetupVisibility.Public, anya, dima, olya, vova, katya),
            M(roofCinema, anya, "Смотрим «Амели» на крыше", "Возьму плед на двоих, приходите заранее — лучшие места у края.",
                At(1, 20), "Вход с ул. Малышева", 4, MeetupVisibility.Public, olya),
            M(foodFest, vova, "Обед на фестивале", "Пробуем всё понемногу и делим счёт.",
                At(2, 13), "У главного входа в парк", 6, MeetupVisibility.Public, masha),
            M(techno, dima, "Едем вместе на такси", "Скидываемся на такси из центра.",
                At(2, 22, 30), "Площадь 1905 года", 4, MeetupVisibility.Public, olya),
            M(quiz, olya, "Команда на квиз", "Нам не хватает пары киноманов!",
                At(1, 19), "Антикафе «Часы», 2 этаж", 6, MeetupVisibility.Public, katya, vova),
            M(pastCinema, olya, "Ночной марафон вместе", null,
                At(-12, 20, 30), "Вход в библиотеку", 5, MeetupVisibility.Public, anya, masha));

        await db.SaveChangesAsync();
        logger.LogInformation("Демо-данные созданы: {Events} событий, вход — anya@example.com", await db.Events.CountAsync());
    }
}
