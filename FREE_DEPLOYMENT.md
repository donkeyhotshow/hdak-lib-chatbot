# Бесплатный деплой HDAK Library Chatbot

Пошаговая инструкция для полностью бесплатного развёртывания чат-бота.

> **Язык / Language:** Этот документ написан на русском.
> English speakers — see [DEPLOYMENT.md](DEPLOYMENT.md) for the general
> deployment guide.

---

## Содержание

- [Обзор архитектуры](#обзор-архитектуры)
- [Что нужно (бесплатно)](#что-нужно-бесплатно)
- [Шаг 1 — Бесплатный AI-ключ (Google Gemini)](#шаг-1--бесплатный-ai-ключ-google-gemini)
- [Шаг 2 — Выберите платформу для деплоя](#шаг-2--выберите-платформу-для-деплоя)
  - [Вариант A — Render.com (рекомендуется)](#вариант-a--rendercom-рекомендуется)
  - [Вариант B — Hugging Face Spaces](#вариант-b--hugging-face-spaces)
  - [Вариант C — Railway.app](#вариант-c--railwayapp)
- [Шаг 3 — Бесплатная MySQL-база данных (опционально)](#шаг-3--бесплатная-mysql-база-данных-опционально)
- [Шаг 4 — Проверка деплоя](#шаг-4--проверка-деплоя)
- [Шаг 5 — Keep-alive (анти-сон)](#шаг-5--keep-alive-анти-сон)
- [Переменные окружения (справка)](#переменные-окружения-справка)
- [Часто задаваемые вопросы](#часто-задаваемые-вопросы)

---

## Обзор архитектуры

```
┌──────────────┐     HTTPS     ┌──────────────────────┐     MySQL     ┌────────────┐
│   Браузер    │ ◄──────────► │   Веб-сервис (Docker) │ ◄──────────► │  MySQL 8   │
│  (React UI)  │               │   Express + tRPC      │              │ (опционально)│
└──────────────┘               │   Vercel AI SDK       │              └────────────┘
                               └──────────┬───────────┘
                                          │ HTTPS
                                          ▼
                               ┌──────────────────────┐
                               │  LLM API (Gemini)    │
                               │  OpenAI-совместимый   │
                               └──────────────────────┘
```

**Минимальные требования для работы:**

- Веб-сервис (Docker-контейнер)
- AI API ключ (Google Gemini — бесплатно)

**Опционально:**

- MySQL-база для сохранения разговоров (без неё работает mock-режим)
- OAuth для авторизации пользователей

---

## Что нужно (бесплатно)

| Компонент       | Бесплатный сервис      | Лимиты                                          |
| --------------- | ---------------------- | ----------------------------------------------- |
| **AI/LLM**      | Google Gemini API      | 15 запросов/мин, 1500/день (бесплатный уровень) |
| **Хостинг**     | Render.com / HF Spaces | 750 ч/мес (Render) или безлимит (HF)            |
| **База данных** | TiDB Serverless        | 5 ГБ хранения, 50M запросов/мес                 |
| **GitHub**      | GitHub Actions         | Keep-alive пинги                                |

**Общая стоимость: $0/мес**

---

## Шаг 1 — Бесплатный AI-ключ (Google Gemini)

Приложение по умолчанию использует модель `gemini-2.0-flash` — бесплатную и
быструю модель от Google.

### 1.1. Получите API-ключ

1. Откройте [Google AI Studio](https://aistudio.google.com/apikey)
2. Войдите с Google-аккаунтом
3. Нажмите **«Create API Key»** → **«Create API key in new project»**
4. Скопируйте ключ (начинается с `AIza...`)

### 1.2. Запомните значения переменных

```
BUILT_IN_FORGE_API_URL = https://generativelanguage.googleapis.com/v1beta/openai
BUILT_IN_FORGE_API_KEY = AIzaSy...ваш-ключ...
AI_MODEL_NAME          = gemini-2.0-flash
```

> **Примечание:** Google Gemini API поддерживает OpenAI-совместимый формат
> через URL выше. Никаких изменений в коде не требуется.

---

## Шаг 2 — Выберите платформу для деплоя

### Вариант A — Render.com (рекомендуется)

**Плюсы:** Автодеплой из GitHub, простой интерфейс, Docker-поддержка.
**Минусы:** Засыпает через 15 мин бездействия (решается keep-alive).

#### A.1. Форкните и подключите репозиторий

1. Сделайте **Fork** этого репозитория в свой GitHub-аккаунт
2. Откройте [render.com](https://render.com) → зарегистрируйтесь (бесплатно)
3. **New** → **Blueprint** → выберите ваш форк
4. Render прочитает `render.yaml` и создаст веб-сервис

#### A.2. Заполните переменные окружения

В дашборде Render → ваш сервис → **Environment**:

| Переменная               | Значение                                                  |
| ------------------------ | --------------------------------------------------------- |
| `BUILT_IN_FORGE_API_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `BUILT_IN_FORGE_API_KEY` | Ваш Gemini API ключ (пометьте как Secret)                 |
| `DATABASE_URL`           | _(оставьте пустым для mock-режима, или см. Шаг 3)_        |

Остальные переменные (`JWT_SECRET`, OAuth) — опциональны для базового
использования. `JWT_SECRET` генерируется автоматически.

#### A.3. Деплой

Render деплоит автоматически при каждом пуше в `main`.
Первый деплой занимает 3–5 минут (сборка Docker-образа).

**URL вашего приложения:** `https://hdak-lib-chatbot.onrender.com`

---

### Вариант B — Hugging Face Spaces

**Плюсы:** Не засыпает, нет лимита на часы, сообщество ML.
**Минусы:** Медленный холодный старт, ограниченные ресурсы CPU.

#### B.1. Создайте Space

1. Откройте [huggingface.co/spaces](https://huggingface.co/spaces)
2. **Create new Space**
3. Настройки:
   - **Space name:** `hdak-lib-chatbot`
   - **SDK:** Docker
   - **Hardware:** CPU basic (бесплатно)
   - **Visibility:** Public

#### B.2. Подключите репозиторий

```bash
# Клонируйте ваш форк
git clone https://github.com/YOUR_USERNAME/hdak-lib-chatbot.git
cd hdak-lib-chatbot

# Добавьте HF Spaces как remote
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/hdak-lib-chatbot

# Запушьте код
git push hf main
```

#### B.3. Настройте секреты

В настройках Space → **Settings** → **Repository secrets**:

| Секрет                   | Значение                                                  |
| ------------------------ | --------------------------------------------------------- |
| `BUILT_IN_FORGE_API_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `BUILT_IN_FORGE_API_KEY` | Ваш Gemini API ключ                                       |

> **Порт:** Dockerfile уже использует порт 7860 — стандарт HF Spaces.
> README.md содержит метаданные HF Spaces (sdk: docker, app_port: 7860).

#### B.4. Деплой

HF Spaces автоматически соберёт Docker-образ и запустит приложение.
**URL:** `https://YOUR_USERNAME-hdak-lib-chatbot.hf.space`

---

### Вариант C — Railway.app

**Плюсы:** Встроенная MySQL (не нужен внешний провайдер), красивый дашборд.
**Минусы:** Пробный период $5 кредитов (хватает на ~1 месяц базового использования).

#### C.1. Создайте проект

1. Откройте [railway.app](https://railway.app) → войдите через GitHub
2. **New Project** → **Deploy from GitHub repo** → выберите форк
3. Railway автоматически обнаружит `Dockerfile` и `railway.json`

#### C.2. Добавьте MySQL

1. В проекте: **New** → **Database** → **MySQL**
2. Railway автоматически подставит `DATABASE_URL` в ваш сервис

#### C.3. Настройте переменные

В сервисе → **Variables**:

```
BUILT_IN_FORGE_API_URL = https://generativelanguage.googleapis.com/v1beta/openai
BUILT_IN_FORGE_API_KEY = ваш-gemini-ключ
JWT_SECRET             = (любая длинная случайная строка)
```

#### C.4. Деплой

```bash
railway up
```

Или просто сделайте пуш в `main` — Railway деплоит автоматически.

---

## Шаг 3 — Бесплатная MySQL-база данных (опционально)

> **Без базы данных** приложение работает в **mock-режиме**: чат с AI
> функционирует, но разговоры не сохраняются, admin-панель недоступна.

Если вам нужно сохранение разговоров, используйте бесплатную MySQL:

### Вариант: TiDB Serverless (рекомендуется)

[TiDB Serverless](https://tidbcloud.com) — бесплатная MySQL-совместимая база.

1. Зарегистрируйтесь на [tidbcloud.com](https://tidbcloud.com)
2. **Create Cluster** → **Serverless** (бесплатно, 5 ГБ)
3. Выберите регион (ближайший к вашему хостингу)
4. После создания → **Connect** → **General** → скопируйте строку подключения
5. Формат: `mysql://USER:PASSWORD@HOST:4000/DATABASE?ssl={"rejectUnauthorized":true}`

Вставьте строку в `DATABASE_URL` на вашей хостинг-платформе.

### Альтернативы

| Сервис                                   | Бесплатный план        | Ограничения            |
| ---------------------------------------- | ---------------------- | ---------------------- |
| [TiDB Serverless](https://tidbcloud.com) | 5 ГБ, 50M запросов/мес | MySQL-совместимый      |
| [Clever Cloud](https://clever-cloud.com) | 500 МБ MySQL           | Ограничение соединений |
| [Railway MySQL](https://railway.app)     | В рамках $5 кредитов   | Пробный период         |

---

## Шаг 4 — Проверка деплоя

Замените `YOUR_APP_URL` на адрес вашего приложения.

### 4.1. Health Check (приложение запущено?)

```bash
curl https://YOUR_APP_URL/api/health
# Ожидаемый ответ: {"status":"ok","timestamp":"..."}
```

### 4.2. Readiness Check (всё настроено?)

```bash
curl https://YOUR_APP_URL/api/ready
# Ожидаемый ответ: {"ready":true}
# Если 503: отсутствуют переменные → {"ready":false,"missing":["..."]}
```

### 4.3. Тест чата

```bash
curl -X POST https://YOUR_APP_URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Привіт! Розкажи про бібліотеку."}]}'
# Ожидаемый ответ: streaming текст от AI
```

### 4.4. Откройте в браузере

Перейдите по адресу `https://YOUR_APP_URL` — вы увидите интерфейс чат-бота.

---

## Шаг 5 — Keep-alive (анти-сон)

Бесплатные сервисы (Render, Koyeb) усыпляют приложение после 15 минут
бездействия. Чтобы предотвратить это:

### Автоматически (GitHub Actions)

В репозитории уже есть `.github/workflows/keep-alive.yml`, который пингует
`/api/health` каждые 14 минут.

**Настройка:**

1. GitHub → ваш форк → **Settings** → **Secrets and variables** → **Actions**
2. Добавьте секрет **`RENDER_APP_URL`** = `https://hdak-lib-chatbot.onrender.com`
3. Готово — workflow запускается автоматически по расписанию

### Вручную (альтернативы)

- [UptimeRobot](https://uptimerobot.com) — бесплатный мониторинг, пингует URL
  каждые 5 минут (до 50 мониторов бесплатно)
- [cron-job.org](https://cron-job.org) — бесплатный cron, вызывает URL по
  расписанию

---

## Переменные окружения (справка)

### Обязательные (для работы чата)

| Переменная               | Описание            | Пример                                                    |
| ------------------------ | ------------------- | --------------------------------------------------------- |
| `BUILT_IN_FORGE_API_KEY` | API-ключ для LLM    | `AIzaSy...`                                               |
| `BUILT_IN_FORGE_API_URL` | Базовый URL LLM API | `https://generativelanguage.googleapis.com/v1beta/openai` |

### Опциональные

| Переменная              | По умолчанию       | Описание                  |
| ----------------------- | ------------------ | ------------------------- |
| `AI_MODEL_NAME`         | `gemini-2.0-flash` | Модель LLM                |
| `DATABASE_URL`          | _(пусто = mock)_   | MySQL строка подключения  |
| `JWT_SECRET`            | _(пусто)_          | Секрет для подписи cookie |
| `NODE_ENV`              | `development`      | Режим работы              |
| `PORT`                  | `7860`             | HTTP порт                 |
| `OWNER_OPEN_ID`         | _(пусто)_          | OpenID администратора     |
| `OAUTH_SERVER_URL`      | _(пусто)_          | URL OAuth-сервера         |
| `VITE_APP_ID`           | _(пусто)_          | ID приложения OAuth       |
| `VITE_OAUTH_PORTAL_URL` | _(пусто)_          | URL страницы входа OAuth  |

---

## Часто задаваемые вопросы

### Можно ли использовать без базы данных?

**Да.** Если `DATABASE_URL` не указан, приложение запускается в mock-режиме:

- ✅ Чат с AI работает
- ✅ Поиск ресурсов работает
- ✅ Каталог и навигация работают
- ❌ Разговоры не сохраняются
- ❌ Admin-панель недоступна

### Можно ли использовать другую модель вместо Gemini?

**Да.** Любой OpenAI-совместимый API:

| Провайдер     | URL                                                       | Модель                             | Бесплатно?      |
| ------------- | --------------------------------------------------------- | ---------------------------------- | --------------- |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash`                 | ✅ 15 req/min   |
| OpenRouter    | `https://openrouter.ai/api/v1`                            | `google/gemini-2.0-flash-exp:free` | ✅ Лимитировано |
| Groq          | `https://api.groq.com/openai/v1`                          | `llama-3.3-70b-versatile`          | ✅ 30 req/min   |

Установите `BUILT_IN_FORGE_API_URL` и `BUILT_IN_FORGE_API_KEY` для выбранного
провайдера, и `AI_MODEL_NAME` для нужной модели.

### Можно ли без OAuth?

**Да.** Без OAuth все пользователи — гости с ролью `user`. Чат и поиск
работают, admin-панель недоступна. OAuth нужен только для:

- Идентификации пользователей
- Admin-доступа (CRUD, метрики, загрузка документов)

### Сколько стоит в месяц?

| Компонент                   | Стоимость  |
| --------------------------- | ---------- |
| Render.com (веб)            | $0         |
| Google Gemini API           | $0         |
| TiDB Serverless (MySQL)     | $0         |
| GitHub Actions (keep-alive) | $0         |
| **Итого**                   | **$0/мес** |

### Как запустить локально (для разработки)?

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/YOUR_USERNAME/hdak-lib-chatbot.git
cd hdak-lib-chatbot

# 2. Установите зависимости
corepack enable pnpm
pnpm install

# 3. Настройте переменные (минимум — AI ключ)
cp .env.example .env
# Отредактируйте .env: установите BUILT_IN_FORGE_API_URL и BUILT_IN_FORGE_API_KEY

# 4. Запустите в режиме разработки (mock-режим, без БД)
pnpm dev

# 5. Откройте http://localhost:7860
```

### Как запустить через Docker Compose (с MySQL)?

```bash
# 1. Настройте .env
cp .env.example .env
# Установите BUILT_IN_FORGE_API_URL и BUILT_IN_FORGE_API_KEY

# 2. Запустите
docker compose up --build

# 3. Откройте http://localhost:3000
# MySQL доступен на localhost:3306
```
