---
title: "Установка Google Drive MCP в Cursor"
date: 2026-08-19
tags:
  - проект/workspace
  - подпроект/tools
  - тип/guide
  - область/tech
  - дата/2026-08-19
---

# Установка Google Drive MCP в Cursor

Это детальный разбор Google Cloud и `mcp.json`. Обзор инструментов, safety model и быстрый старт — в [README.md](../README.md).

Пошаговая инструкция для **личного** использования: Cursor запускает сервер локально (stdio). Через MCP можно искать и читать файлы на Google Drive, а также создавать и править Google Docs и Google Sheets.

**Репозиторий:** https://github.com/Stillfrozen/gdrive-mcp

Ключи OAuth живут **только у вас на диске**. В git они не попадают.

Два пути:

1. **Быстрый** — `./scripts/install.sh` сам ставит зависимости и ведёт по Google Cloud в терминале.
2. **Ручной** — все шаги ниже, если хотите понимать, что именно создаётся в Google Cloud.

---

## Что понадобится

| Требование | Детали |
|------------|--------|
| **Cursor** | Desktop, с поддержкой MCP |
| **Node.js** | 18 или новее (`node -v`); лучше 20+ |
| **Google-аккаунт** | тот, с чьего Drive будете работать |
| **Google Cloud** | бесплатный проект; биллинг для этого MCP не обязателен |

Сервер запрашивает широкие scope: полный Drive, Docs и Sheets. Это нужно, чтобы читать **любой** доступный вам файл, а не только созданные этим приложением.

---

## 1. Клонировать и собрать

```bash
git clone https://github.com/Stillfrozen/gdrive-mcp.git
cd gdrive-mcp
npm install
npm run build
```

После сборки появится точка входа:

```
…/gdrive-mcp/dist/index.js
```

Запомните **абсолютный** путь к этому файлу — он понадобится в `mcp.json`.

Альтернатива одной командой (клон уже есть):

```bash
./scripts/install.sh
```

Скрипт соберёт проект, откроет нужные страницы Google Cloud и в конце напечатает готовый фрагмент конфига.

---

## 2. Создать приложение в Google Cloud

Нужны три вещи: **проект**, **включённые API**, **OAuth-клиент типа Desktop**.

### 2.1. Проект

1. Откройте [создание проекта](https://console.cloud.google.com/projectcreate).
2. Имя, например `gdrive-mcp`. Организация — ваша или «No organization».
3. Создайте проект и **переключитесь на него** в селекторе сверху.
4. Скопируйте **Project ID** (не Display name) — он пригодится в ссылках.

### 2.2. Включить API

В том же проекте включите три API (кнопка **Enable / Включить** на каждой странице):

| API | Ссылка |
|-----|--------|
| Google Drive API | https://console.cloud.google.com/apis/library/drive.googleapis.com |
| Google Sheets API | https://console.cloud.google.com/apis/library/sheets.googleapis.com |
| Google Docs API | https://console.cloud.google.com/apis/library/docs.googleapis.com |

Если API уже включён, страница покажет **Manage / Управление** — этого достаточно.

### 2.3. Экран согласия OAuth (Google Auth Platform)

Google перенёс это в **Google Auth Platform**, не в старый пункт «OAuth consent screen» внутри APIs & Services.

1. Откройте [Auth Platform → Overview](https://console.cloud.google.com/auth/overview).
2. **Get started / Начать**.
3. **App name / Название приложения:** `gdrive-mcp`.
4. **User support email:** ваш Google-аккаунт.
5. **Audience / Аудитория:**
   - **Internal / Внутренний** — только если это Google Workspace вашей организации. Для личного Gmail недоступно.
   - **External / Внешний** — личный Gmail и типичный домашний сценарий.
6. **Contact email:** тот же адрес.
7. Примите политику и создайте.

#### Scope (Data Access)

1. Слева: **Data Access / Доступ к данным** → **Add or remove scopes**.
2. Добавьте ровно эти три (можно вставить в фильтр):

```
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/documents
```

3. Сохраните.

`drive` — **restricted** scope. Для личного Desktop-приложения это нормально: вы сами себе выдаёте доступ. Публиковать приложение в Marketplace и проходить CASA-верификацию **не нужно**.

#### Тестовые пользователи (только External + Testing)

1. Слева: **Audience / Аудитория**.
2. **Test users → Add users**.
3. Добавьте тот Gmail, которым будете логиниться в шаге 3.

Без этого Google покажет «приложение заблокировано» / `access_denied`.

**Publishing status.** Пока статус **Testing**, refresh-token для External-приложения живёт **7 дней**. Потом MCP краснеет с `invalid_grant`. Варианты:

| Вариант | Когда брать |
|---------|-------------|
| Оставить Testing и раз в неделю `npm run auth` | самый безопасный для эксперимента |
| **Publish app / In production** и заново пройти auth | личное использование; Google покажет «unverified app» — для себя это ок |
| Audience = Internal | Google Workspace, без 7-дневного лимита |

Официально: для External + Testing Google выдаёт refresh token на 7 дней, если запрашиваются scope шире профиля.

> Источник: [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2), дата публикации: дата неизвестна

После смены статуса на Production **старый** токен не продлевается — нужно снова запустить `npm run auth`.

### 2.4. OAuth-клиент: именно Desktop app

1. Откройте [создание OAuth-клиента](https://console.cloud.google.com/apis/credentials/oauthclient).
2. **Application type / Тип приложения:** **Desktop app** (Приложение для компьютера). Не Web, не Chrome extension.
3. **Name:** `gdrive-mcp`.
4. **Create**.
5. Скачайте JSON (**Download JSON**).

Redirect URI руками прописывать не нужно: библиотека `@google-cloud/local-auth` сама поднимает `http://localhost` на свободном порту.

### 2.5. Положить JSON ключа

Переименуйте скачанный `client_secret_….json` и положите сюда:

```
gdrive-mcp/credentials/gcp-oauth.keys.json
```

Внутри должен быть ключ `"installed"` (Desktop), не `"web"`. Каталог `credentials/` в `.gitignore` — файл в репозиторий не уйдёт.

Проверка:

```bash
ls credentials/gcp-oauth.keys.json
```

---

## 3. Авторизоваться (получить refresh token)

```bash
cd gdrive-mcp
npm run auth
```

Откроется браузер. Войдите тем аккаунтом, который добавлен как test user. Если Google предупредит, что приложение не проверено: **Advanced → Go to gdrive-mcp (unsafe)** — это ожидаемо для личного unverified клиента. Разрешите Drive, Docs и Sheets.

После успеха появится:

```
Authentication successful. Credentials saved.
```

Токен сохранится в:

```
gdrive-mcp/credentials/.gdrive-server-credentials.json
```

**Не коммитьте** этот файл и не присылайте его в чат.

Если повторный auth не вернул refresh token:

1. Отзовите доступ: https://myaccount.google.com/permissions
2. Снова `npm run auth`

---

## 4. Подключить MCP в Cursor

Файл: **`~/.cursor/mcp.json`** (глобально) или `.cursor/mcp.json` в проекте. Создайте, если нет.

Минимальный вариант — ключи лежат в `credentials/` репозитория:

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "node",
      "args": [
        "/Users/ВАШ_ПОЛЬЗОВАТЕЛЬ/path/to/gdrive-mcp/dist/index.js"
      ]
    }
  }
}
```

Явные пути (удобно, если ключи лежат не в репозитории):

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "node",
      "args": [
        "/Users/ВАШ_ПОЛЬЗОВАТЕЛЬ/path/to/gdrive-mcp/dist/index.js"
      ],
      "env": {
        "GDRIVE_OAUTH_PATH": "/Users/ВАШ_ПОЛЬЗОВАТЕЛЬ/path/to/gdrive-mcp/credentials/gcp-oauth.keys.json",
        "GDRIVE_CREDENTIALS_PATH": "/Users/ВАШ_ПОЛЬЗОВАТЕЛЬ/path/to/gdrive-mcp/credentials/.gdrive-server-credentials.json"
      }
    }
  }
}
```

**Важно:**

- В `args` — только **абсолютный** путь к `dist/index.js`.
- Если в `mcp.json` уже есть другие серверы — добавьте блок `"gdrive"` внутрь `mcpServers`, не затирая остальное.
- Ключи и токены храните только в этих файлах / `env`, не в git.

Перезагрузите MCP: **Cursor → Settings → MCP → Reload**, или перезапустите Cursor. У `gdrive` должен быть **зелёный** индикатор.

### Claude Code CLI (если нужен тот же сервер)

```bash
claude mcp add --scope user gdrive -- node /absolute/path/to/gdrive-mcp/dist/index.js
```

---

## 5. Проверить в чате

Примеры:

- «Найди на Диске таблицу с роадмапом»
- «Прочитай этот Google Doc как markdown»
- «Какие вкладки в этой таблице?»
- «Создай новый Doc и вставь заголовок»

Если сервер красный — раздел «Проблемы» ниже.

---

## 5.1. Skill для агента (рекомендуется)

Чтобы Cursor стабильнее выбирал инструменты Drive / Docs / Sheets:

```bash
mkdir -p ~/.cursor/skills/gdrive
cp skills/gdrive/SKILL.md ~/.cursor/skills/gdrive/SKILL.md
```

После `git pull` обновляйте skill той же командой. Это общий skill «как ходить в Диск». Списки ваших конкретных таблиц и документов в этот репозиторий не кладут.

---

## 6. Обновление

```bash
cd gdrive-mcp
git pull
./scripts/upgrade.sh
```

Скрипт пересоберёт проект и, если в новой версии появились API или scope, попросит заново пройти `auth`. Затем **Reload MCP** в Cursor.

---

## Что умеет сервер

### Чтение

`gdrive_search`, `gdrive_get_file`, `gdrive_read_file` (Docs → Markdown, Sheets → CSV первой вкладки, Slides → текст), `gdrive_list_files`, `gdrive_get_spreadsheet_info`, `gdrive_get_document_info`.

### Запись: Sheets

`gdrive_create_sheet`, `gdrive_update_sheet`, `gdrive_append_sheet`, `gdrive_clear_values`, `gdrive_format_cells`, вкладки, вставка/удаление строк и столбцов.

### Запись: Docs

`gdrive_create_doc`, вставка/замена/удаление текста, стили, заголовки, списки, rename, duplicate.

Перед записью агент **обязан** сначала прочитать файл в этой сессии. Удалить целиком файл с Диска через MCP нельзя.

Полная таблица инструментов — в [README.md](../README.md).

---

## Проблемы

### Сервер `gdrive` красный в MCP

1. Файл из `args` существует? `ls …/dist/index.js`
2. `node -v` ≥ 18?
3. Есть токен? `ls credentials/.gdrive-server-credentials.json`
4. Запустите вручную (процесс будет ждать stdin — это нормально для MCP; ошибка ключей сразу уйдёт в stderr):

```bash
node dist/index.js
```

5. Проверьте JSON в `mcp.json` (запятые, кавычки).

### `access_denied` / приложение заблокировано

- Audience = External, а ваш Gmail не в Test users.
- Вы вошли не тем аккаунтом.

### `redirect_uri_mismatch`

Клиент создан как **Web**, а нужен **Desktop app**. Создайте новый клиент, замените JSON, снова `npm run auth`.

### `invalid_grant` / token expired or revoked

Чаще всего: External + Testing, прошло 7 дней. Снова `npm run auth`. Либо опубликуйте приложение (см. 2.3) и переавторизуйтесь.

Другие причины: доступ отозван на https://myaccount.google.com/permissions, пароль аккаунта меняли, слишком много refresh token на этот client id.

### Нет refresh token при `npm run auth`

Отзовите приложение на странице permissions и повторите auth с нуля.

### 403 от Drive / Sheets / Docs API

API не включён в этом GCP-проекте, или OAuth-клиент из другого проекта.

### Изменения в коде не подхватываются

После правок: `npm run build` → Reload MCP. Cursor запускает `dist/`, не `src/`.

---

## Безопасность

- Не коммитьте `gcp-oauth.keys.json`, `.gdrive-server-credentials.json`, `mcp.json` с путями к чужим ключам.
- OAuth-клиент + refresh token = доступ к вашему Drive от вашего имени. Храните как пароль.
- Scope `drive` шире, чем `drive.file`: агент видит файлы, до которых у вашего Google-аккаунта уже есть доступ.
- В чат Cursor попадает содержимое документов; не вставляйте ПДн в публичные треды.

---

## Связанные заметки

- [[tools/gdrive-mcp/README]] — основной гайд: обзор, инструменты, safety model
- [[tools/kaiten-cursor-connector/docs/INSTALL.ru]] — тот же формат установки для Kaiten MCP
- [[docs/cursor-config-map-2026-07-23]] — карта MCP в Cursor
