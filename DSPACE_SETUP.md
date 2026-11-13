# Підключення DSpace

## Що вже реалізовано

Проєкт підтримує два live-джерела репозитарію:

- **DSpace REST API** — endpoint `/server/api/discover/search/objects`;
- **OAI-PMH** — `ListRecords` із `oai_dc` та пагінацією через `resumptionToken`.

Після синхронізації документи нормалізуються до єдиного формату `DspaceItem` і використовуються в пошуку та відповідях чату. Якщо live-джерело недоступне, попередній успішний індекс не видаляється, а чат продовжує працювати.

## Налаштування змінних

Скопіюйте відповідні значення до production environment:

```env
DSPACE_URL=https://repository.ac.kharkov.ua
DSPACE_API_URL=https://repository.ac.kharkov.ua/server/api
DSPACE_OAI_URL=https://repository.ac.kharkov.ua/oai/request
DSPACE_OAI_SET=
DSPACE_SYNC_MAX_ITEMS=1000
DSPACE_SYNC_TIMEOUT_MS=15000
DSPACE_ADMIN_TOKEN=<довгий випадковий серверний токен>
```

`DSPACE_ADMIN_TOKEN` не можна передавати у frontend bundle або зберігати в git. Він передається лише з admin-запиту в заголовку `x-dspace-admin-token`.

## Admin-сторінка

Відкрийте `/admin/dspace`. Сторінка показує:

- поточний статус синхронізації;
- режим останнього запуску;
- кількість документів в індексі;
- дату останньої успішної синхронізації;
- останню помилку;
- доступність REST та OAI-PMH endpoint;
- ліміт документів.

Кнопка `Mock-дані` доступна без токена лише для локальної демонстрації. Live-кнопки активуються після налаштування відповідного endpoint і потребують `DSPACE_ADMIN_TOKEN`.

## API

Статус і конфігурація:

```http
GET /api/dspace/admin
```

Ручний запуск:

```http
POST /api/dspace/admin
Content-Type: application/json
x-dspace-admin-token: <DSPACE_ADMIN_TOKEN>

{"mode":"rest"}
```

або:

```json
{"mode":"oai-pmh"}
```

Застарілий endpoint `/api/dspace/sync` збережено для сумісності; live-режим також захищений тим самим токеном.

## Початкове введення в експлуатацію

1. Отримайте від бібліотеки офіційний URL REST API або OAI-PMH та підтвердіть, що endpoint дозволяє запити з production-сервера.
2. Додайте змінні до Vercel/production secrets.
3. Відкрийте `/admin/dspace` і спочатку перевірте статус endpoint.
4. Запустіть `REST API` або `OAI-PMH`.
5. Перевірте кількість документів, назви, авторів, дати та URL у відповідях чату.
6. Якщо доступ не наданий або репозитарій повертає помилку, виправте endpoint/credentials та повторіть запуск. Попередній індекс не буде знищений помилковою синхронізацією.

## Якість метаданих

Для REST використовуються `dc.title`, `dc.contributor.author`/`dc.creator`, `dc.description`, `dc.date.issued` та `dc.identifier.uri`. Для OAI-PMH використовуються Dublin Core `title`, `creator`, `description`, `date` та `identifier`.

Після першої синхронізації потрібно перевірити мінімум 10 документів вручну. Якщо конкретна інсталяція DSpace повертає інші поля або custom metadata, їх можна додати до мапінгу в `src/lib/dspace.ts` без зміни frontend/API контракту.
