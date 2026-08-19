---
title: "Google Drive MCP Server"
date: 2026-08-19
tags:
  - проект/workspace
  - подпроект/tools
  - тип/guide
  - область/tech
  - дата/2026-08-19
---

# Google Drive MCP Server

Локальный [MCP](https://modelcontextprotocol.io/)-сервер для Cursor, Claude Code и Claude Desktop. Через него агент ищет и читает файлы на Google Drive, создаёт и правит Google Docs и Google Sheets.

Google Docs при чтении уходят в Markdown, таблицы — в CSV, презентации — в текст. Docs можно править точечно: вставка, замена, стили, заголовки, списки, переименование, дубликат. Sheets — значения, форматы, вкладки, строки и столбцы. Работает и с личным Диском, и с Shared drives.

Репозиторий: https://github.com/Stillfrozen/gdrive-mcp  
Основано на [wagnerlabs/gdrive-mcp](https://github.com/wagnerlabs/gdrive-mcp).

Ключи OAuth живут только у вас на диске. В git они не попадают.

**Пошаговая установка в Google Cloud (проект, API, Desktop OAuth, test users):** [docs/INSTALL.ru.md](docs/INSTALL.ru.md)

---

## Быстрый старт

Нужны Node.js 18+ (лучше 20) и Google-аккаунт, с чьего Диска будете работать.

```bash
git clone https://github.com/Stillfrozen/gdrive-mcp.git
cd gdrive-mcp
./scripts/install.sh
```

Скрипт ставит зависимости, собирает проект и проводит по Google Cloud: проект, API, экран согласия, Desktop-клиент, логин в браузере. В конце печатает готовый фрагмент для MCP-клиента.

Посмотреть шаги без изменений:

```bash
./scripts/install.sh --dry-run
```

Если хотите сами кликать в Console — весь разбор экранов в [docs/INSTALL.ru.md](docs/INSTALL.ru.md).

### Cursor

В `~/.cursor/mcp.json` (или `.cursor/mcp.json` в проекте) — только **абсолютный** путь:

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "node",
      "args": ["/absolute/path/to/gdrive-mcp/dist/index.js"],
      "env": {
        "GDRIVE_OAUTH_PATH": "/absolute/path/to/gdrive-mcp/credentials/gcp-oauth.keys.json",
        "GDRIVE_CREDENTIALS_PATH": "/absolute/path/to/gdrive-mcp/credentials/.gdrive-server-credentials.json"
      }
    }
  }
}
```

Блок `env` не обязателен, если JSON лежат в `credentials/` репозитория. Если в файле уже есть другие серверы — добавьте `"gdrive"` внутрь `mcpServers`, не затирая остальное.

Дальше **Cursor → Settings → MCP → Reload**. Индикатор `gdrive` должен стать зелёным.

### Claude Code CLI

```bash
claude mcp add --scope user gdrive -- node /absolute/path/to/gdrive-mcp/dist/index.js
```

`--scope user` ставит сервер глобально. Снять: `claude mcp remove gdrive`.

### Claude Desktop

В `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "node",
      "args": ["/absolute/path/to/gdrive-mcp/dist/index.js"]
    }
  }
}
```

---

## Инструменты

### Чтение

| Tool | Что делает |
|------|------------|
| `gdrive_search` | Поиск по полному тексту или синтаксису запросов Drive |
| `gdrive_get_file` | Метаданные файла по ID |
| `gdrive_read_file` | Содержимое: Docs → Markdown, Sheets → CSV, Slides → текст |
| `gdrive_list_files` | Список файлов в папке, сортировка и пагинация |
| `gdrive_get_spreadsheet_info` | Вкладки таблицы и именованные диапазоны |
| `gdrive_get_document_info` | Метаданные Doc и опционально структурированный текст вкладки |

### Запись: Sheets

| Tool | Что делает | Destructive | Idempotent |
|------|------------|:-----------:|:----------:|
| `gdrive_create_sheet` | Новая таблица | Нет | Нет |
| `gdrive_update_sheet` | Перезаписать диапазон ячеек | Да | Да |
| `gdrive_append_sheet` | Добавить строки после данных | Нет | Нет |
| `gdrive_clear_values` | Очистить значения, формат оставить | Да | Да |
| `gdrive_format_cells` | Формат диапазона | Нет | Да |
| `gdrive_add_sheet_tab` | Новая вкладка | Нет | Нет |
| `gdrive_delete_sheet_tab` | Удалить вкладку вместе с данными | Да | Нет |
| `gdrive_rename_sheet_tab` | Переименовать вкладку | Да | Нет |
| `gdrive_insert_rows_columns` | Вставить пустые строки или столбцы | Нет | Нет |
| `gdrive_delete_rows_columns` | Удалить строки или столбцы с данными | Да | Нет |

### Запись: Docs

| Tool | Что делает | Destructive | Idempotent |
|------|------------|:-----------:|:----------:|
| `gdrive_create_doc` | Пустой Doc, можно в указанную папку | Нет | Нет |
| `gdrive_insert_doc_text` | Вставка по позиции, индексу или текстовому якорю | Нет | Нет |
| `gdrive_replace_doc_text` | Замена диапазона или якорного совпадения | Да | Нет |
| `gdrive_replace_all_doc_text` | Замена всех точных совпадений на вкладке или во всём Doc | Да | Да |
| `gdrive_delete_doc_text` | Удаление диапазона или якорного совпадения | Да | Нет |
| `gdrive_update_doc_text_style` | Жирный, цвет, шрифт, ссылка | Нет | Да |
| `gdrive_update_doc_paragraph_style` | Заголовки и выравнивание абзацев | Нет | Да |
| `gdrive_update_doc_list` | Списки: создать, сменить, снять | Да | Да |
| `gdrive_rename_doc` | Переименовать файл Doc | Да | Нет |
| `gdrive_duplicate_doc` | Дубликат, можно в указанную папку | Нет | Нет |

### Как пишутся значения в ячейки

У `gdrive_update_sheet` и `gdrive_append_sheet` параметр `value_input_option`:

- **`USER_ENTERED`** (по умолчанию) — как ввод в UI Sheets. Формула `=SUM(A1:A10)` выполнится, числа и даты отформатируются.
- **`RAW`** — как есть. Строка `=SUM(A1:A10)` останется текстом.

### Как читаются файлы

`gdrive_read_file` сам экспортирует документы Workspace:

| Формат источника | Что вернётся |
|------------------|--------------|
| Google Docs | Markdown |
| Google Sheets | CSV (только первая вкладка) |
| Google Slides | Текст |
| Google Drawings | PNG, по сути метаданные |
| Текст (`.txt`, `.json`, `.js`, …) | UTF-8 как есть |
| Бинарники (картинки, PDF, …) | Метаданные и ссылка в браузер |

Всю таблицу (вкладки, структура, запись) берите через `gdrive_get_spreadsheet_info` и write-tools Sheets, не через `gdrive_read_file`.

Для абзацев, заголовков, списков и якорных правок Doc — `gdrive_get_document_info`. В ответе есть сырой `text` и `displayText` без хвостового перевода строки абзаца; `displayText` обычно безопаснее как якорь. Markdown быстрее всего даёт `gdrive_read_file`.

---

## Модель безопасности

Несколько слоёв: аннотации MCP, «сначала прочитай», для Docs ещё ревизия и якоря, для Sheets — сверка текущих значений.

### 1. Аннотации инструментов

Каждый tool объявляет [MCP annotations](https://modelcontextprotocol.io/specification/2025-03-26/server/tools#annotations). Клиент может спросить подтверждение перед разрушающей операцией. См. колонки Destructive / Idempotent в таблицах выше.

### 2. Сначала чтение, потом запись

Сервер помнит, какие таблицы и Docs агент уже открывал **в этой сессии**.

Таблица считается прочитанной после:

- `gdrive_read_file` (ячейки как CSV)
- `gdrive_get_spreadsheet_info` (структура и вкладки)
- `gdrive_create_sheet` (агент сам только что создал файл)

Doc считается прочитанным после:

- `gdrive_read_file` (Markdown + ревизия, если Google её отдал)
- `gdrive_get_document_info` (вкладки или структурированный текст)
- `gdrive_create_doc`

Любая запись без этого шага отклоняется:

> *You must read this spreadsheet before writing to it…*

> *You must read this document before writing to it…*

Так агент реже целится не в тот файл. Список сбрасывается при рестарте процесса (каждая MCP-сессия заново).

`gdrive_get_file` сюда не входит: это только метаданные Диска, не содержимое.

### 3. Запись в Docs с учётом ревизии

Правка привязана к ревизии, которую агент читал последней:

- `conflict_mode: "strict"` (по умолчанию) — Docs `requiredRevisionId`. Если документ успели поменять, запись падает.
- `conflict_mode: "merge"` — Docs `targetRevisionId`. Google по возможности смержит с чужими правками.

Кэш структурированного содержимого живёт в сессии после `gdrive_get_document_info include_content=true`. Якорные tools (`gdrive_insert_doc_text`, `gdrive_replace_doc_text`, `gdrive_update_doc_paragraph_style`, `gdrive_update_doc_list`) берут его, пока ревизия та же. Иначе сервер заново снимает снимок.

Для точечной замены текста можно передать `expected_text`: перед отправкой сервер сверит, что в диапазоне именно эта строка.

У якорных `gdrive_delete_doc_text` и `gdrive_replace_doc_text` сервер сам отрезает только финальный перевод строки абзаца, если совпадение упирается в конец вкладки. Docs API не удаляет диапазон с терминальным newline сегмента. Явные `start_index` / `end_index` этого не делают: хвостовой newline надо исключить самим.

### 4. Предусловие для Sheets

У `gdrive_update_sheet` есть опциональный `expected_current_values` — двумерный массив той же формы, что `values`. Сервер читает ячейки и сравнивает. Не совпало — запись отказ, в ошибке фактическое содержимое.

- Точечная правка (одна ячейка, формула) — передавайте `expected_current_values`.
- Массовая операция (тысяча строк) — не передавайте, иначе удвоите запросы и упрётесь в квоту.

`include_previous_values: true` вернёт старые значения для аудита. Если задан `expected_current_values`, старые значения приходят всегда.

### Откат

Правки Docs и Sheets видны в истории версий Google Workspace. Откатить можно там.

**Ни один tool не удаляет файл целиком с Диска.** Разрушающие операции — только внутри Doc и внутри таблицы. Удалить файл — только через UI Диска.

---

## Конфигурация

Пути к ключам можно переопределить переменными окружения:

| Переменная | По умолчанию | Что это |
|------------|--------------|---------|
| `GDRIVE_OAUTH_PATH` | `credentials/gcp-oauth.keys.json` | JSON OAuth-клиента из Google Cloud |
| `GDRIVE_CREDENTIALS_PATH` | `credentials/.gdrive-server-credentials.json` | Сохранённый refresh token |

---

## Обновление

После `git pull` запускайте upgrade. Он пересоберёт проект и, если в [`setup-manifest.json`](setup-manifest.json) появились API или scope, попросит заново пройти auth:

```bash
cd /path/to/gdrive-mcp
git pull
./scripts/upgrade.sh
```

Если манифест не менялся, скрипт только пересоберёт и скажет, что вы на месте. Cursor подхватит `dist/` после Reload MCP. Перерегистрировать сервер не нужно.

> **Про scope:** сервер просит полный `drive`, а не узкий `drive.file`. Это шире, чем минимальная рекомендация Google, но иначе нельзя читать произвольный доступный файл и писать в уже существующие Docs (rename, duplicate, правки). Scope `documents` нужен для структурированного чтения и `batchUpdate`.

У External-приложения в статусе Testing refresh token живёт **7 дней**. Потом `invalid_grant` и снова `npm run auth`. Подробности и варианты (Internal / Publish) — в [docs/INSTALL.ru.md](docs/INSTALL.ru.md).

---

## Ограничения

- `gdrive_create_sheet` кладёт таблицу в корень Диска. Папку выбрать нельзя.
- `gdrive_read_file` для Sheets отдаёт CSV только с первой вкладки. Остальные вкладки — через `gdrive_get_spreadsheet_info`.
- `gdrive_read_file` для Docs всегда Markdown. Вкладки, границы абзацев, списки, якоря — `gdrive_get_document_info`.
- Перед сменой формата и структуры Doc сначала читайте `gdrive_get_document_info include_content=true`.
- `gdrive_replace_all_doc_text` по умолчанию трогает первую вкладку. По всем вкладкам — только с явным `all_tabs: true`.

---

## Разработка

```bash
npm install
npm run dev          # tsx, без сборки
npm run build
npm test
npm run test:live    # живой Google Doc, нужны сохранённые credentials
npm run test:watch
```

`npm run test:live` создаёт временный Doc, вставляет текст через тот же поток, что MCP, проверяет через `gdrive_get_document_info` и в конце кладёт файл в корзину.

---

## Лицензия

MIT
