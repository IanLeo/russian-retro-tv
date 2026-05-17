# Контент: источники, возможности, ограничения

Дата среза: 2026-05-18.

## Основные источники

### YouTube

Главный источник для MVP. Можно хранить `videoId`, метаданные и собственную классификацию, а воспроизводить через официальный embed/player. Поиск и обновление метаданных лучше делать через YouTube Data API, а не скрейпинг.

Технически возможно:

- воспроизводить отдельные ролики через IFrame Player API;
- управлять плеером из JS;
- загружать плейлисты;
- искать публичные ролики через `search.list`;
- проверять статус ролика через `videos.list`, включая `status.embeddable`, `contentDetails`, `snippet`, `madeForKids`-связанные поля при нужной политике.

Ограничения:

- `search.list` стоит 100 quota units за запрос;
- стандартная квота проекта YouTube Data API - 10 000 units/day;
- нельзя скачивать, кешировать или хранить копии YouTube audiovisual content без письменного разрешения YouTube;
- нельзя скрейпить YouTube Applications или использовать scraped YouTube data/content;
- API Data, полученные без авторизации, обычно нельзя хранить дольше 30 дней без refresh/delete;
- embedded-плеер делится данными с YouTube, это надо раскрыть в privacy policy.

### Telegram

Подходит как источник discovery и кураторских ссылок. Пример: публичный канал `Орбита-4` имеет веб-страницу `t.me/s/orbita_4`, где встречаются ссылки на YouTube-ролики с описаниями и датами.

Технически возможно:

- встраивать отдельные публичные посты через Telegram Post Widget;
- читать историю публичных каналов через MTProto `messages.getHistory`, но только пользовательским Telegram-клиентом, не Bot API;
- извлекать YouTube-ссылки из публичных постов и отдавать их на модерацию.

Ограничения:

- `messages.getHistory` доступен только users, не ботам;
- приватные/закрытые каналы требуют членства;
- Telegram-видео не равно публичный web-embed с нормальным player API: для сервиса лучше ссылаться на пост или просить разрешение автора на переупаковку/зеркало;
- массовый сбор Telegram-истории может упереться в rate limits, авторизацию, ToS и ожидания авторов каналов.

### Российские VHS-архивы и сообщества

Перспективные источники для контактов и ручной модерации:

- `Орбита-4`: https://t.me/s/orbita_4
- VHS-архив mrcatmann: https://mrcatmann.ru/projects/vhs
- `Старый телевизор`: https://staroetv.su
- YouTube/VK/Telegram-каналы архивистов: mrcatmann, Cheriksoft TV, Антициклон VHS, s1tv, ARH, regional VHS channels.

Для них важнее не "забрать контент", а договориться: атрибуция, ссылки на оригиналы, удаление по запросу, форма предложений, возможность пометить источник и правообладателя.

## Черновая классификация

Для русского ТВ 90-х/00-х категории лучше адаптировать:

- Реклама
- Новости
- Музыка
- Детское
- Мультфильмы
- Сериалы
- Юмор
- Ток-шоу
- Телеигры
- Спорт
- Анонсы и заставки
- Документальное
- Кино и фрагменты
- Региональное ТВ
- Другое

## Риски

- Copyright takedowns: старые эфиры часто содержат права телеканалов, студий, музыкальных лейблов, рекламодателей.
- YouTube availability drift: ролики удаляются, становятся private, блокируются по региону или запрещают embed.
- Возрастные/детские ограничения: часть контента может требовать специальных настроек privacy/tracking.
- Политически чувствительные архивные новости: нужны нейтральные описания и быстрая процедура снятия.
- Telegram как источник файлов юридически слабее YouTube embed: использовать осторожно.

## Рекомендованный подход к каталогу

1. Хранить собственные записи: `source`, `sourceUrl`, `youtubeVideoId`, `telegramPostUrl`, `title`, `year`, `airDate`, `channel`, `category`, `tags`, `curatorNote`, `rightsRisk`, `status`.
2. Отдельно хранить результаты проверок: `embeddable`, `regionRestriction`, `duration`, `lastCheckedAt`, `unavailableReason`.
3. Делать nightly/weekly validation job, который обновляет только метаданные и доступность, не скачивая видео.
4. Публиковать compact catalog для клиента и source catalog для админки.

## Источники

- YouTube IFrame Player API: https://developers.google.com/youtube/player_parameters
- YouTube Data API `search.list`: https://developers.google.com/youtube/v3/docs/search/list
- YouTube Data API quota: https://developers.google.com/youtube/v3/getting-started
- YouTube Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- Telegram Widgets: https://core.telegram.org/widgets
- Telegram Post Widget: https://core.telegram.org/widgets/post
- Telegram `messages.getHistory`: https://core.telegram.org/method/messages.getHistory
- Орбита-4 public view: https://t.me/s/orbita_4
- VHS-архив mrcatmann: https://mrcatmann.ru/projects/vhs
