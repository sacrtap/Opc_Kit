# Provider configuration

Read this when installing, changing providers or credentials, or diagnosing API
failures. Normal browser tasks call `loadConfig()` and never choose or switch
providers themselves.

## Configuration file

`~/.config/browser-with-typesafe/config.json` contains only:

- `envFile` — absolute path to a local dotenv file holding the API key.
- `provider` — `typesafe` or `openrouter`.
- `model` — the Jev model id accepted by that provider.

```json
{
  "provider": "typesafe",
  "model": "jev-latest",
  "envFile": "/Users/you/.config/browser-with-typesafe/credentials.env"
}
```

Credentials stay in the referenced dotenv file. Never copy a key into
`config.json`, the skill directory, a page, a log, or a trace. `loadConfig()`
returns `{ envFile, provider, model }` and deliberately not a key: only
`decide()` reads the credential, and it refuses to send a request whose body
contains it.

## Supported adapters

### TypeSafe SystemOne

```json
{ "provider": "typesafe", "model": "jev-latest", "envFile": "/abs/path/credentials.env" }
```

Reads `TYPESAFE_API_KEY` and posts to `https://api.typesafe.ai/v1/systemone`.

### OpenRouter Decisions

```json
{ "provider": "openrouter", "model": "~typesafe/jev-latest", "envFile": "/abs/path/credentials.env" }
```

Reads `OPENROUTER_API_KEY` (lowercase also accepted) and posts to
`https://openrouter.ai/api/alpha/decisions`. The leading `~` requests the latest
compatible Jev release.

### Dotenv example

```sh
TYPESAFE_API_KEY=your-key-here
```

```sh
chmod 600 ~/.config/browser-with-typesafe/credentials.env
```

## Shared behaviour

- Bearer authentication, redirects rejected, request timeout enforced.
- The returned choice, confidence, probabilities, and model identity are all
  validated; a malformed response is an error, never a silent default.
- One transport failure may be retried inside the same bounded run. Auth,
  schema, and quota failures are not retried.
- Missing credentials are a configuration error: fix the config rather than
  searching unrelated files or switching providers.

## Troubleshooting

| Symptom | Meaning |
| --- | --- |
| `TYPESAFE_API_KEY is missing` | `envFile` is wrong or the variable name differs. |
| `HTTP 401` / `HTTP 403` | Credential or access problem, not a browser problem. |
| `transport failure or timeout` | Network reachability or the request exceeded `decisionTimeoutMs`. |
| `Invalid typesafe decision schema` | The endpoint answered, but not with a valid decision. |
| `Snapshot too large; narrow the task` | The page exposes too much; scope the task or the region. |
| `Browser left authorized origins` | The page navigated outside `allowedOrigins`. |

Verify a provider before a browser run:

```sh
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"jev-latest","state":"ping","questions":{"x":{"type":"choice","instructions":"pick","criteria":{"a":"first","b":"second"}}}}'
```

`200` means the credential and model are usable.
