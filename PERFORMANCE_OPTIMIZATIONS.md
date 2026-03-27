# Оптимизация производительности

## Проблемы

### 1. Большие компоненты
- ChatMessage.tsx: 200+ строк
- Sidebar.tsx: 300+ строк
- Много inline стилей

### 2. Неэффективные ре-рендеры
- Отсутствие React.memo в ключевых местах
- Создание объектов в render
- Неоптимальные зависимости useEffect

### 3. Загрузка ресурсов
- Нет lazy loading для компонентов
- Большие CSS файлы
- Отсутствие code splitting

## Решения

### Разделение компонентов
```typescript
// Вместо одного большого ChatMessage
const ChatMessage = memo(({ message }) => (
  <MessageContainer>
    <MessageAvatar role={message.role} />
    <MessageContent content={message.content} />
    <MessageActions onCopy={handleCopy} />
  </MessageContainer>
));
```

### Мемоизация
```typescript
const expensiveValue = useMemo(() => 
  computeExpensiveValue(data), [data]
);

const stableCallback = useCallback((id) => 
  handleAction(id), [handleAction]
);
```

### Lazy loading
```typescript
const Sidebar = lazy(() => import('./Sidebar'));
const ChatInput = lazy(() => import('./ChatInput'));
```