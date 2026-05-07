# Quick Audit Checklist - HDAK Chatbot

## КРИТИЧЕСКИЕ ДЛЯ ИСПРАВЛЕНИЯ ПЕРЕД PRODUCTION

- [ ] **XSS в markdown** - rehype-sanitize + DOMPurify
  - Файл: src/components/chat/ChatArea.tsx
  - Время: 2-3 часа
  - Тест: `![](javascript:alert('xss'))`

- [ ] **Race condition** - requestId система
  - Файл: src/hooks/use-chat.ts
  - Время: 3-4 часа
  - Тест: Быстро отправить 2-3 сообщения подряд

- [ ] **Пустые catch блоки** - добавить logger
  - Файл: src/hooks/use-chat.ts (4 места)
  - Время: 1-2 часа
  - Тест: Выключить интернет, проверить консоль

- [ ] **Timeout для stream** - AbortSignal 120s
  - Файл: src/app/api/chat/route.ts
  - Время: 1-2 часа
  - Тест: Отправить запрос, подождать 150 сек

- [ ] **Валидация входных данных** - Zod schema
  - Файл: Все /src/app/api/ маршруты (8 файлов)
  - Время: 2-3 часа
  - Тест: Отправить невалидный JSON

- [ ] **CSRF защита** - Origin проверка
  - Файл: src/app/api/chat/route.ts
  - Время: 1-2 часа
  - Тест: Отправить запрос с другого origin

## ВЫСОКИЙ ПРИОРИТЕТ

- [ ] **Rate limiting** - Upstash Redis
  - Время: 2 часа
  - Тест: Отправить 11+ запросов за 1 сек

- [ ] **Request queue** - Очередь запросов
  - Время: 3-4 часа
  - Тест: Несколько параллельных запросов

- [ ] **Размер истории** - MAX_MESSAGES = 500
  - Время: 1 час
  - Тест: Отправить 600+ сообщений

- [ ] **Логирование всех ошибок** - logger.error()
  - Время: 2-3 часа
  - Тест: Вызвать разные типы ошибок

- [ ] **Обработка abort** - Try-finally cleanup
  - Время: 1-2 часа
  - Тест: Отменить несколько запросов подряд

- [ ] **URL валидация** - Белый лист origins
  - Время: 1-2 часа
  - Тест: Попытаться использовать внешний URL

## СРЕДНИЙ ПРИОРИТЕТ

- [ ] **Утечки памяти в Observer** - disconnect + cleanup
  - Время: 2 часа
  - Тест: DevTools > Memory, проверить GC

- [ ] **Debounce для поиска** - lodash debounce 500ms
  - Время: 1-2 часа
  - Тест: Вводить медленно, считать запросы

- [ ] **CSP headers** - Content-Security-Policy
  - Время: 1 час
  - Тест: DevTools > Security, проверить нарушения

- [ ] **Обрезание больших сообщений** - MAX = 100K chars
  - Время: 1-2 часа
  - Тест: Вернуть 1MB текст из LLM

- [ ] **Проверка Speech API** - Feature detection
  - Время: 1-2 часа
  - Тест: Открыть на Safari, проверить micphone

## ПРОВЕРКИ ДО PRODUCTION DEPLOYMENT

### Security Checklist
- [ ] Нет XSS уязвимостей (протестировать payloads)
- [ ] Нет CSRF уязвимостей (Origin + CSRF token)
- [ ] Нет SQL injection (валидация Zod)
- [ ] Нет чувствительных данных в логах
- [ ] HTTPS везде + HSTS header
- [ ] Нет API keys в коде или console.log
- [ ] Rate limiting включен
- [ ] CSP header установлен
- [ ] Все зависимости обновлены и проверены

### Performance Checklist
- [ ] Нет утечек памяти (DevTools Memory)
- [ ] История ограничена 500 сообщениями
- [ ] Большие сообщения обрезаны
- [ ] Поиск debounced
- [ ] LightHouse score > 80
- [ ] Time to Interactive < 3 сек
- [ ] Нет бесконечных loops

### Reliability Checklist
- [ ] Все ошибки логируются
- [ ] Все API имеют timeout
- [ ] Все запросы имеют retry логику
- [ ] Request queue работает
- [ ] No race conditions (тест быстрых запросов)
- [ ] Error Boundary обернута вокруг app
- [ ] Graceful degradation (speech API, etc)

### Functionality Checklist
- [ ] Chat работает end-to-end
- [ ] История сохраняется и загружается
- [ ] Каталог поиск работает
- [ ] Speech recognition работает (если поддерживается)
- [ ] Mobile UI работает правильно
- [ ] Sidebar работает
- [ ] Logout/очистка работают

## ИНСТРУМЕНТЫ ДЛЯ ПРОВЕРКИ

### Security Scanning
```bash
# Проверить зависимости на уязвимости
npm audit
pnpm audit

# Проверить код на проблемы безопасности
npx snyk test

# OWASP ZAP scanning
docker run -u zap -p 8080:8080 -v $(pwd):/zap/wrk owasp/zap2docker-stable
```

### Performance Profiling
```bash
# Chrome DevTools
F12 > Performance > Record > [actions] > Stop

# Lighthouse
npx lighthouse https://example.com --view

# Memory leaks
F12 > Memory > Take heap snapshot > [actions] > Take another > Compare
```

### Code Quality
```bash
# Type check
pnpm exec tsc --noEmit

# Linting (if available)
pnpm exec eslint src/

# Code coverage
pnpm exec jest --coverage
```

## КРИТИЧЕСКИЕ ТЕСТЫ ДО DEPLOY

### Test 1: XSS Attack
```
- Сообщение: ![](javascript:alert('xss'))
- Ожидается: Не выполнить JavaScript
```

### Test 2: Race Condition
```
- Быстро отправить 3 сообщения подряд
- Проверить: Все 3 видны в истории правильно
- Ожидается: Нет перепутанных сообщений
```

### Test 3: Large Message
```
- Генерировать 1MB текст
- Отправить в чат
- Ожидается: UI не замерзает, message обрезан
```

### Test 4: Rate Limit
```
- Отправить 11 запросов за 1 сек
- Ожидается: 11-й запрос вернет 429 Too Many Requests
```

### Test 5: Timeout
```
- Отправить сообщение
- Не отключать сеть сразу, дождаться >120 сек
- Ожидается: Запрос отменяется, UI не зависает
```

### Test 6: Memory Leak
```
- DevTools > Memory > Take heap snapshot
- Отправить 100 сообщений
- Take heap snapshot
- Отправить 100 еще
- Take heap snapshot
- Сравнить размеры
- Ожидается: Размер не растет линейно
```

## СТАТУС DEPLOYMENT

```
До исправления: 🔴 DO NOT DEPLOY
После фазы 1:  🔴 DO NOT DEPLOY (еще критические проблемы)
После фазы 2:  🟡 LIMITED RELEASE (только trusted users)
После фазы 3:  🟢 READY FOR PRODUCTION
```

## ДОКУМЕНТЫ ДЛЯ ОЗНАКОМЛЕНИЯ

- 📄 FULL_AUDIT_REPORT.md - Полный отчет
- 📄 AUDIT_DETAILED_FINDINGS.md - Детальный анализ
- 📄 AUDIT_REMEDIATION_PLAN.md - План исправления
- 📄 AUDIT_EXECUTIVE_SUMMARY.md - Резюме для менеджмента

---

**Создано**: май 2026  
**Статус**: ТРЕБУЕТ ИСПРАВЛЕНИЯ  
**Приоритет**: 🔴 КРИТИЧ

