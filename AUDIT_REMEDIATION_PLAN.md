# План исправления проблем - HDAK Chatbot

## ФАЗА 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (неделя 1)

### 1.1 Исправить пустые catch блоки
**Файл**: `src/hooks/use-chat.ts`
**Время**: 1-2 часа
**Код**:
```typescript
// ДО:
} catch (e) {}

// ПОСЛЕ:
} catch (e) {
  logger.warn("localStorage unavailable", e);
}
```

### 1.2 Добавить XSS защиту в markdown
**Файл**: `src/components/chat/ChatArea.tsx`
**Время**: 2-3 часа
**Шаги**:
1. Установить `npm install rehype-sanitize`
2. Обновить ReactMarkdown с sanitize plugins
3. Протестировать на XSS payloads

### 1.3 Добавить request timeout в stream
**Файл**: `src/app/api/chat/route.ts`
**Время**: 1-2 часа
**Код**:
```typescript
const timeoutId = setTimeout(() => {
  controller.abort();
}, 120_000);

try {
  // ... streaming ...
} finally {
  clearTimeout(timeoutId);
}
```

### 1.4 Исправить race condition с requestId
**Файл**: `src/hooks/use-chat.ts`
**Время**: 3-4 часа
**Подход**: 
- Добавить requestId для каждого запроса
- Проверять requestId перед setState
- Отменять старые запросы

### 1.5 Добавить валидацию входных данных
**Файл**: Все `/src/app/api/`
**Время**: 2-3 часа
**Инструмент**: Zod
**Пример**:
```typescript
const schema = z.object({
  conversationId: z.string().nullable(),
  message: z.string().min(1).max(5000),
});

const data = schema.parse(req.body);
```

## ФАЗА 2: ВЫСОКИЙ ПРИОРИТЕТ (неделя 2)

### 2.1 Добавить rate limiting
**Файл**: `src/app/api/chat/route.ts`
**Время**: 2 часа
**Интеграция**: Upstash Redis
**Код**:
```typescript
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
});

const { success } = await ratelimit.limit(sessionId);
if (!success) return new Response("Rate limited", { status: 429 });
```

### 2.2 Добавить request queue
**Файл**: `src/hooks/use-chat.ts`
**Время**: 3-4 часа
**Структура**:
```typescript
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async add(fn: () => Promise<void>) {
    this.queue.push(fn);
    this.process();
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    while (this.queue.length > 0) {
      await this.queue.shift()?.();
    }
    this.processing = false;
  }
}
```

### 2.3 Ограничить размер истории
**Файл**: `src/hooks/use-chat.ts`
**Время**: 1 час
**Код**:
```typescript
const MAX_MESSAGES = 500;

if (messages.length > MAX_MESSAGES) {
  setMessages(prev => prev.slice(-MAX_MESSAGES));
}
```

### 2.4 Добавить логирование ошибок во все API
**Файл**: Все route.ts
**Время**: 2-3 часа
**Инструмент**: Уже созданный logger.ts
**Пример**:
```typescript
} catch (error) {
  logger.error("Failed to process chat", error, {
    conversationId,
    messageLength: message.length,
  });
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
```

### 2.5 Исправить CSRF защиту
**Файл**: `src/app/api/chat/route.ts` и другие POST
**Время**: 2 часа
**Подход**:
```typescript
// Проверить origin
const origin = req.headers.get("origin");
const validOrigins = ["https://example.com"];

if (!validOrigins.includes(origin ?? "")) {
  return new Response("CSRF", { status: 403 });
}
```

## ФАЗА 3: СРЕДНИЙ ПРИОРИТЕТ (неделя 3)

### 3.1 Добавить debounce для поиска каталога
**Файл**: `src/lib/catalog-search.ts`
**Время**: 1-2 часа
**Инструмент**: lodash debounce
**Код**:
```typescript
const debouncedSearch = debounce(async (query) => {
  const results = await searchCatalog(query);
  // ...
}, 500);
```

### 3.2 Исправить утечки памяти в IntersectionObserver
**Файл**: `src/hooks/use-intersection-observer.ts`
**Время**: 2 часа
**Подход**:
```typescript
useEffect(() => {
  const observer = new IntersectionObserver(callback);
  return () => {
    observer.disconnect();
    // Явно удалить references
  };
}, []);
```

### 3.3 Добавить обрезание больших сообщений
**Файл**: `src/components/chat/ChatArea.tsx`
**Время**: 1-2 часа
**Код**:
```typescript
const MAX_MESSAGE_LENGTH = 100_000;

if (content.length > MAX_MESSAGE_LENGTH) {
  content = content.slice(0, MAX_MESSAGE_LENGTH) + 
            "\n\n[Сообщение обрезано, слишком длинное]";
}
```

### 3.4 Добавить Content Security Policy
**Файл**: `src/app/layout.tsx`
**Время**: 1 час
**Код**:
```typescript
export const metadata: Metadata = {
  title: "HDAK Chatbot",
  // ...
  headers: {
    "Content-Security-Policy": 
      "default-src 'self'; script-src 'self' 'unsafe-inline';",
  },
};
```

### 3.5 Добавить белый лист для URL ресурсов
**Файл**: `src/lib/catalog-search.ts`
**Время**: 1-2 часа
**Код**:
```typescript
const ALLOWED_ORIGINS = [
  "https://catalog.hdak.org.ua",
  "https://api.hdak.org.ua",
];

function validateUrl(url: string): boolean {
  const parsed = new URL(url);
  return ALLOWED_ORIGINS.some(origin => 
    parsed.origin === origin
  );
}
```

## ФАЗА 4: НИЗКИЙ ПРИОРИТЕТ (неделя 4+)

### 4.1 Добавить темный режим
**Время**: 4-6 часов
**Подход**: CSS переменные + `prefers-color-scheme`

### 4.2 Добавить пагинацию истории
**Время**: 2-3 часа
**Подход**: Infinite scroll с loadMore callback

### 4.3 Добавить analytics
**Время**: 2-3 часа
**Инструмент**: Sentry или PostHog

### 4.4 Добавить offline поддержку
**Время**: 6-8 часов
**Подход**: Service Worker + localDB

## ТЕСТИРОВАНИЕ ДЛЯ КАЖДОЙ ФАЗЫ

### Фаза 1:
- [ ] Проверить что все catch блоки логируют
- [ ] Проверить XSS защиту (payload: `![](javascript:alert('xss'))`)
- [ ] Проверить что stream обрывается после 120 сек
- [ ] Проверить что второе сообщение не перезаписывает первое
- [ ] Проверить что невалидные данные отклоняются

### Фаза 2:
- [ ] Проверить rate limiting (отправить 11 запросов за 1 сек)
- [ ] Проверить что история ограничена 500 сообщениями
- [ ] Проверить что все ошибки логируются с контекстом
- [ ] Проверить что CSRF защита работает

### Фаза 3:
- [ ] Проверить что поиск debounced (счетчик запросов < 3 при печати фразы)
- [ ] Проверить что Observer очищается при unmount
- [ ] Проверить что большие сообщения обрезаются
- [ ] Проверить что CSP не блокирует легальные ресурсы

## МОНИТОРИНГ ПОСЛЕ ИСПРАВЛЕНИЙ

### Метрики для отслеживания:
- Количество ошибок в день: текущий 15-20 → цель <2
- Среднее время ответа: текущий 2-3 сек → цель <1.5 сек
- Использование памяти: текущий 50-100MB → цель <30MB
- Uptime: текущий ~95% → цель >99.9%

### Инструменты мониторинга:
- Sentry для отслеживания ошибок
- Datadog или CloudFlare Analytics для метрик
- New Relic для performance monitoring

## ПРИБЛИЗИТЕЛЬНЫЙ ГРАФИК

```
Неделя 1: Фаза 1 (критические) ───────────────────────
Неделя 2: Фаза 1 завершение + Фаза 2 ───────────────
Неделя 3: Фаза 2 завершение + Фаза 3 ───────────────
Неделя 4: Фаза 3 завершение + тестирование ────────
Неделя 5+: Фаза 4 (nice-to-have) + production deploy
```

## РЕСУРСЫ И ДОКУМЕНТАЦИЯ

- Zod: https://zod.dev
- rehype-sanitize: https://github.com/rehypejs/rehype-sanitize
- Upstash: https://upstash.com
- OWASP Security: https://owasp.org/www-project-top-ten/
- React Error Handling: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

## ОТВЕТСТВЕННОСТЬ

- **Frontend**: Исправить use-chat.ts, ChatArea.tsx, components
- **Backend**: Исправить route.ts, API validation, logging
- **DevOps**: Настроить rate limiting, monitoring, CSP headers
- **QA**: Протестировать каждую фазу

## БЮДЖЕТ ВРЕМЕНИ

| Фаза | Часы | Дни | Неделя |
|------|------|-----|--------|
| 1 | 12 | 1.5 | 1 |
| 2 | 15 | 2 | 1 |
| 3 | 12 | 1.5 | 1 |
| 4 | 20 | 2.5 | 2+ |
| **ВСЕГО** | **59** | **7.5** | **4-5** |

---

**Состояние**: READY TO EXECUTE
**Дата обновления**: май 2026
**Приоритет**: СРОЧНО - нужно исправить критические проблемы перед production
