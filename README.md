# HDAK Library Chatbot

AI-асистент Наукової бібліотеки Харківської державної академії культури (ХДАК).

## Стек технологій

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **AI SDK**: [OpenAI GPT-4o-mini](https://openai.com/)
- **Database**: [Neon PostgreSQL](https://neon.tech/) (Serverless)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Data Fetching**: [SWR](https://swr.vercel.app/)

## Початок роботи

### 1. Налаштування оточення

Скопіюйте `.env.example` у `.env` та заповніть необхідні змінні:

```bash
cp .env.example .env
```

### 2. Встановлення залежностей

```bash
npm install
```

### 3. Налаштування бази даних

Використовуйте `drizzle-kit` для синхронізації схеми з Neon:

```bash
npm run db:push
```

### 4. Запуск у режимі розробки

```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

## Команди

- `npm run dev` — запуск сервера розробки
- `npm run build` — збірка для продакшну
- `npm run start` — запуск зібраного додатка
- `npm run db:push` — оновлення схеми бази даних
- `npm run db:studio` — візуальний інтерфейс для БД (Drizzle Studio)
