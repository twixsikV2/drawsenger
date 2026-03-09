# Appwrite Setup для DrawSenger

## Переменные окружения

Добавлены в `.env.local`:
```
REACT_APP_APPWRITE_PROJECT_ID=69adb54a003cd9b1c376
REACT_APP_APPWRITE_PROJECT_NAME=drawsenger
REACT_APP_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
```

## Необходимые коллекции в Appwrite

Создайте следующие коллекции в базе данных `drawsenger_db`:

### 1. **users** - Профили пользователей
```
- userId (string)
- username (string)
- email (string)
- avatar_url (string, nullable)
- created_at (datetime)
```

### 2. **chats** - Чаты и группы
```
- name (string)
- is_group (boolean)
- type (string) - 'private', 'group', 'channel'
- created_at (datetime)
- members (array)
```

### 3. **messages** - Сообщения
```
- chat_id (string)
- user_id (string)
- content (string, nullable)
- message_type (string) - 'text', 'photo', 'voice', 'sticker', 'call'
- media_url (string, nullable)
- created_at (datetime)
- updated_at (datetime, nullable)
```

### 4. **chat_members** - Члены чатов
```
- chat_id (string)
- user_id (string)
```

### 5. **reactions** - Реакции на сообщения
```
- chat_id (string)
- message_id (string)
- user_id (string)
- emoji (string)
```

### 6. **favorites** - Избранные сообщения
```
- user_id (string)
- message_id (string)
```

### 7. **pinned_messages** - Закреплённые сообщения
```
- chat_id (string)
- message_id (string)
- pinned_by (string)
```

### 8. **message_replies** - Ответы на сообщения
```
- message_id (string)
- reply_to_message_id (string)
```

### 9. **blocked_users** - Заблокированные пользователи
```
- user_id (string)
- blocked_user_id (string)
- created_at (datetime)
```

## Установка зависимостей

```bash
npm install
```

## Использование

Все функции в `src/lib/auth.ts` и `src/lib/messages.ts` теперь используют Appwrite вместо Parse/Back4app.

### Пример использования:

```typescript
import { loginUser, getCurrentUser } from '@/lib/auth';
import { sendMessage, getMessages } from '@/lib/messages';

// Вход
const session = await loginUser(email, password);

// Получить текущего пользователя
const user = await getCurrentUser();

// Отправить сообщение
await sendMessage(chatId, userId, userName, 'Hello!');

// Получить сообщения
const messages = await getMessages(chatId);
```

## Миграция данных

Если у вас есть данные в Back4app, вам нужно:
1. Экспортировать данные из Back4app
2. Трансформировать их в формат Appwrite
3. Импортировать в Appwrite

## Безопасность

- Используйте правила доступа (Permissions) в Appwrite для защиты данных
- Убедитесь, что пользователи могут видеть только свои данные
- Установите правильные роли и разрешения для коллекций
