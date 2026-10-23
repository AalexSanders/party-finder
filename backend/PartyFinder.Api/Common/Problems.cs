namespace PartyFinder.Api.Common;

/// <summary>Единый формат ошибок API (RFC 7807); текст в Title показывается пользователю как есть.</summary>
public static class Problems
{
    public static IResult NotFound(string title = "Не найдено") =>
        Results.Problem(title: title, statusCode: StatusCodes.Status404NotFound);

    public static IResult Conflict(string title) =>
        Results.Problem(title: title, statusCode: StatusCodes.Status409Conflict);

    public static IResult BadRequest(string title) =>
        Results.Problem(title: title, statusCode: StatusCodes.Status400BadRequest);

    public static IResult Forbidden(string title = "Недостаточно прав") =>
        Results.Problem(title: title, statusCode: StatusCodes.Status403Forbidden);

    public static IResult Unauthorized(string title) =>
        Results.Problem(title: title, statusCode: StatusCodes.Status401Unauthorized);

    /// <summary>Ошибка конкретного поля формы — фронтенд подсветит его.</summary>
    public static IResult Field(string field, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });
}
