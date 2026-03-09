# Back4app Setup Guide

## 1. Создание аккаунта и приложения

1. Перейди на https://www.back4app.com
2. Зарегистрируйся или войди в аккаунт
3. Создай новое приложение (App)
4. Выбери "Parse Server" как платформу

## 2. Получение учётных данных

1. В Dashboard приложения перейди в Settings → App Keys
2. Скопируй:
   - Application ID (App ID)
   - JavaScript Key (JS Key)
   - Server URL (обычно https://parseapi.back4app.com)

## 3. Переменные окружения

Создай файл `.env.local` в корне проекта:

```
REACT_APP_PARSE_APP_ID=your_app_id_here
REACT_APP_PARSE_JS_KEY=your_js_key_here
REACT_APP_PARSE_SERVER_URL=https://parseapi.back4app.com
```

## 4. Создание классов (таблиц) в Back4app

Перейди в Data Browser и создай следующие классы:

### User (встроенный класс Parse.User)
Поля:
- username (String)
- email (String)
- password (String)
- userId (String) - уникальный ID пользователя
- avatar_url (String)

### Chat
Поля:
- name (String)
- is_group (Boolean)
- created_at (Date)

### ChatMember
Поля:
- chat_id (String)
- user_id (String)

### Message
Поля:
- chat_id (String)
- user_id (String)
- content (String)
- message_type (String) - text, photo, voice, sticker
- media_url (String)
- created_at (Date)
- updated_at (Date)
- deleted_at (Date)

### MessageReply
Поля:
- message_id (String)
- reply_to_message_id (String)

### Favorite
Поля:
- user_id (String)
- message_id (String)

### PinnedMessage
Поля:
- chat_id (String)
- message_id (String)
- pinned_by (String)

### Reaction
Поля:
- message_id (String)
- user_id (String)
- emoji (String)

### BlockedUser
Поля:
- user_id (String)
- blocked_user_id (String)

## 5. Установка зависимостей

```bash
npm install
```

## 6. Запуск приложения

```bash
npm start
```

## 7. Примечания

- Back4app использует Parse Server, который совместим с нашим кодом
- Все операции с БД работают через Parse SDK
- Для real-time обновлений используется polling (каждые 2 секунды)
- Если нужны real-time обновления, можно настроить WebSocket в Back4app

## 8. Миграция данных (если нужна)

Если у тебя есть данные в Supabase, их можно экспортировать и импортировать в Back4app через Data Browser.
