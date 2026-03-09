# Firebase Setup для DrawSenger

## Шаг 1: Создание Firebase проекта

1. Перейди на [Firebase Console](https://console.firebase.google.com/)
2. Нажми "Create Project"
3. Назови проект "drawsenger"
4. Отключи Google Analytics (опционально)
5. Создай проект

## Шаг 2: Получение конфигурации

1. В консоли Firebase перейди в Project Settings (⚙️)
2. Скопируй конфигурацию и добавь в `.env.local`:

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

## Шаг 3: Включение Authentication

1. В левом меню выбери "Authentication"
2. Нажми "Get Started"
3. Включи "Email/Password" провайдер

## Шаг 4: Создание Firestore Database

1. В левом меню выбери "Firestore Database"
2. Нажми "Create Database"
3. Выбери регион (например, europe-west1)
4. Выбери "Start in test mode" (для разработки)

## Шаг 5: Создание коллекций

В Firestore создай следующие коллекции:

### 1. **users** - Профили пользователей
```
- userId (string)
- username (string)
- email (string)
- avatar_url (string, nullable)
- created_at (timestamp)
```

### 2. **chats** - Чаты и группы
```
- name (string)
- is_group (boolean)
- type (string) - 'private', 'group', 'channel'
- created_at (timestamp)
- members (array)
```

### 3. **messages** - Сообщения
```
- chat_id (string)
- user_id (string)
- content (string, nullable)
- message_type (string) - 'text', 'photo', 'voice', 'sticker', 'call'
- media_url (string, nullable)
- created_at (timestamp)
- updated_at (timestamp, nullable)
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
- created_at (timestamp)
- deleted (boolean, nullable)
```

## Шаг 6: Установка зависимостей

```bash
npm install
```

## Правила безопасности (Security Rules)

Для production используй эти правила в Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users - только сам пользователь может читать/писать свой профиль
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
    }

    // Chats - только члены чата могут читать
    match /chats/{chatId} {
      allow read: if request.auth.uid in resource.data.members;
      allow create: if request.auth.uid != null;
    }

    // Messages - только члены чата могут читать
    match /messages/{messageId} {
      allow read: if request.auth.uid != null;
      allow create: if request.auth.uid != null;
      allow update, delete: if request.auth.uid == resource.data.user_id;
    }

    // Chat Members
    match /chat_members/{docId} {
      allow read, write: if request.auth.uid != null;
    }

    // Reactions
    match /reactions/{docId} {
      allow read, write: if request.auth.uid != null;
    }

    // Favorites - только сам пользователь
    match /favorites/{docId} {
      allow read, write: if request.auth.uid == resource.data.user_id;
    }

    // Pinned Messages
    match /pinned_messages/{docId} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid != null;
    }

    // Message Replies
    match /message_replies/{docId} {
      allow read, write: if request.auth.uid != null;
    }

    // Blocked Users - только сам пользователь
    match /blocked_users/{docId} {
      allow read, write: if request.auth.uid == resource.data.user_id;
    }
  }
}
```

## Использование

Все функции в `src/lib/auth.ts` и `src/lib/messages.ts` теперь используют Firebase.

### Пример использования:

```typescript
import { loginUser, getCurrentUser } from '@/lib/auth';
import { sendMessage, getMessages } from '@/lib/messages';

// Вход
const user = await loginUser(email, password);

// Получить текущего пользователя
const currentUser = getCurrentUser();

// Отправить сообщение
await sendMessage(chatId, userId, userName, 'Hello!');

// Получить сообщения
const messages = await getMessages(chatId);
```

## Лимиты бесплатного плана Firebase

- **Firestore**: 1 GB хранилища, 50k читаний/день, 20k записей/день
- **Authentication**: Неограниченные пользователи
- **Storage**: 5 GB

Для 30-40 активных пользователей этого хватит, но если будет много фото/видео, может потребоваться платный план.
