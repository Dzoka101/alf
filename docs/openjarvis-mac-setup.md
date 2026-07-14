# OpenJarvis на MacBook M1 Pro (16 GB) — проверенная инструкция

Команды проверены на реальном клоне репозитория `open-jarvis/OpenJarvis`
(commit `fc98614`, июль 2026): установка зависимостей, CLI, backend и
фронтенд прогнаны в чистом окружении; шаги, требующие Apple Silicon /
Ollama, выверены построчно по скриптам установки и исходникам.

## Почему НЕ официальный one-liner

README предлагает `curl -fsSL .../install.sh | bash`. **На 16 GB его в
чистом виде запускать не стоит** — в проекте баг: таблица тиров моделей
(`src/openjarvis/core/config.py`, `_MODEL_TIERS`) ссылается на
`qwen3.5:4b`, которого нет в каталоге моделей
(`src/openjarvis/intelligence/model_catalog.py` — там только 0.8b / 2b /
9b / 27b / 35b / 122b). Из-за этого на 16 GB рекомендация проваливается в
fallback и выбирает `qwen3.5:9b`, а фоновый оркестратор докачивает ещё и
«следующий тир» — **`qwen3.5:27b` (~15 GB)**, который 16 GB Mac не
потянет. Плюс инсталлер шлёт аналитику PostHog без возможности отключения
на этапе установки.

Поэтому идём dev-путём через `scripts/quickstart.sh` — он ставит только
то, что скажем, и поднимает backend + веб-интерфейс (как вы и хотели).

## Шаг 0. Зависимости (brew)

```bash
# что уже есть:
for c in git uv node ollama cargo; do printf "%-7s: " $c; command -v $c || echo "НЕТ"; done

# доустановить отсутствующее:
brew install uv node ollama rust
```

- **node ≥ 20** (фронтенд требует `>=20` в package.json).
- **rust (cargo) обязателен**: quickstart собирает Rust-расширение через
  maturin и падает без cargo (скрипт под `set -e`).
- Диск: нужно ~10 GB (модель ~5 GB + Python/npm-зависимости ~3-4 GB).
  Проверка: `df -h ~`.

## Шаг 1. Клонирование

```bash
mkdir -p ~/Projects
git clone https://github.com/open-jarvis/OpenJarvis.git ~/Projects/OpenJarvis
cd ~/Projects/OpenJarvis
```

## Шаг 2. Ollama + модель

Quickstart по умолчанию тянет крошечную `qwen3:0.6b` — для смоук-теста
хватит, но отвечает она слабо. Оптимум для 16 GB — **`qwen3.5:9b`**:
MoE-модель (9B всего / 1.5B активных на токен), квант Q4_K_M, ~5 GB на
диске, в памяти ~6-7 GB с контекстом — системе остаётся достаточно.
27b не брать: ~15 GB весов на 16 GB unified memory — это своп.

```bash
brew services start ollama        # или `ollama serve` в отдельной вкладке
ollama pull qwen3.5:9b            # ~5 GB
ollama run qwen3.5:9b "2+2?"      # быстрая проверка, /bye для выхода
```

## Шаг 3. Запуск (backend + фронтенд)

```bash
cd ~/Projects/OpenJarvis
OPENJARVIS_MODEL=qwen3.5:9b ./scripts/quickstart.sh
```

Скрипт по шагам (проверено по исходнику): проверит python/uv/node/ollama →
убедится, что модель скачана → `uv sync --extra desktop` → соберёт
Rust-расширение (maturin) → `npm install` во `frontend/` → поднимет
backend `jarvis serve` на **:8000** → Vite-фронтенд на **:5173** →
откроет браузер. `Ctrl+C` гасит всё разом.

Проверка руками:

```bash
curl http://localhost:8000/health   # backend
open http://localhost:5173          # чат-интерфейс
```

Backend **не стартует, если Ollama не запущена** — выводит «No inference
engine available» и выходит (проверено). Сначала шаг 2.

## Шаг 4. Конфиг по умолчанию для CLI

Чтобы `jarvis ask` без флагов ходил в Ollama с нашей моделью:

```bash
uv run jarvis _bootstrap --write-config --engine ollama --model qwen3.5:9b
uv run jarvis config show           # проверить
```

(Это же делает официальный инсталлер; альтернатива — интерактивный
`uv run jarvis init --engine ollama --no-download`.)

Конфиг живёт в `~/.openjarvis/config.toml`.

**Отключить анонимную аналитику PostHog** (включена по умолчанию):

```bash
uv run jarvis config set analytics.enabled false
```

## Шаг 5. Смоук-тест

```bash
uv run jarvis ask "Столица Австралии? Ответь одним словом."
uv run jarvis ask --profile "Объясни MoE в двух предложениях."  # + латентность/токены/энергия
ollama ps                            # сколько памяти реально занимает модель
```

Ответ должен прийти потоком с локальной модели. `--profile` печатает
телеметрию инференса — удобно убедиться, что работает именно локальный
движок.

## Если что-то не завелось

| Симптом | Причина / решение |
|---|---|
| quickstart падает на «Building Rust extension» | нет cargo → `brew install rust`, перезапустить скрипт |
| «No inference engine available» | Ollama не запущена → `brew services start ollama` |
| Порт 8000/5173 занят | `lsof -i :8000` и убить процесс, либо `uv run jarvis serve --port 8001` |
| `jarvis: command not found` | dev-путь не ставит симлинк — всегда `uv run jarvis ...` из каталога проекта |
| Модель отвечает медленно / машина душится | взять `qwen3.5:2b` (~1 GB): `ollama pull qwen3.5:2b` и указать её в конфиге |
