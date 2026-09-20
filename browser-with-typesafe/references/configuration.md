# Configuration

Read this when installing, when choosing a provider, or when the doctor script
reports `NOT READY`. A normal browser task calls `loadConfig()` and never
chooses or changes configuration itself.

## 1. Choose a provider

Jev decisions come from one of two endpoints. Both speak the same decision
schema; the skill supports both and never switches automatically.

| Provider id | What it is | Default model | Get a key |
| --- | --- | --- | --- |
| `typesafe` | TypeSafe official endpoint | `jev-latest` | <https://console.typesafe.ai/keys> |
| `openrouter` | OpenRouter Decisions endpoint | `~typesafe/jev-latest` | <https://openrouter.ai/settings/keys> |

Pick `typesafe` unless you already route your model traffic through OpenRouter.
The leading `~` in the OpenRouter model requests the latest compatible Jev
release.

## 2. The configuration file

One file, at `~/.config/browser-with-typesafe/config.json`:

```json
{
  "provider": "typesafe",
  "model": "jev-latest",
  "apiKey": ""
}
```

`apiKey` is written empty by the installer. **You fill it in yourself** — the
installer never receives, prompts for, or stores a key. That is deliberate: it
keeps the credential out of the install tool, out of shell history, and out of
any transcript of a session that ran the install.

## 3. From zero, in three steps

```sh
# 1. install the skill and write the configuration template
node install.mjs --provider typesafe --model jev-latest

# 2. open ~/.config/browser-with-typesafe/config.json and set "apiKey"
#    (get the key at the URL for your chosen provider, above)

# 3. verify
node scripts/doctor.mjs
```

`doctor` prints one line per check and exits `0` only when everything passes:

```
  ok    config file           /Users/you/.config/browser-with-typesafe/config.json
  ok    file permissions      0600 (not readable by group or other)
  ok    directory permissions 0700 (not accessible by group or other)
  ok    json                  parsed
  ok    provider / model      typesafe / jev-latest
  ok    apiKey                set (96 characters, not shown)
  ok    endpoint              https://api.typesafe.ai/v1/systemone -> HTTP 200 (model jev-1.13.0)

result  READY
```

It never prints the credential — only its presence and length.

## 4. Permissions and secrecy

```sh
chmod 700 ~/.config/browser-with-typesafe
chmod 600 ~/.config/browser-with-typesafe/config.json
```

`doctor` fails when the file or its directory is readable by group or other.

Additional guarantees built into the code:

- `loadConfig()` returns `{ provider, model, configPath, hasApiKey }` and **never
  the key**. Spreading it into a session, an example, or a log cannot leak a
  credential.
- Only `decide()` reads the key, and it refuses to send a request whose body
  contains it.
- `install.mjs` rejects `--key`, `--api-key`, and `--token` outright.

Do not commit or sync this file. It holds a secret alongside your settings.

## 5. What the skill reads

`loadConfig()` validates immediately, so a bad configuration fails at startup
rather than mid-run:

```js
const config = await loadConfig();
// { provider: 'typesafe', model: 'jev-latest', configPath: '…', hasApiKey: true }
```

## 6. Troubleshooting

| Message | Meaning |
| --- | --- |
| `No configuration at <path>. Create one with \`node install.mjs\`…` | File missing. Run the installer, then set `apiKey`. |
| `Configuration at <path> is not valid JSON` | File corrupted. Fix it or delete it and rerun the installer. |
| `Unsupported provider "x"; expected one of typesafe, openrouter.` | `provider` typo. See the table in section 1. |
| `Invalid model "x" for provider typesafe; expected e.g. jev-latest.` | Wrong model id for that provider. |
| `"apiKey" is empty in <path>. Get a key at <url>…` | Template not filled in yet. |
| `HTTP 401` / `HTTP 403` | Credential or access problem, not a browser problem. |
| `transport failure or timeout` | Network reachability, or the request exceeded `decisionTimeoutMs`. |
| `Invalid <provider> decision schema` | The endpoint answered, but not with a valid decision. |
| `Snapshot too large; narrow the task` | The page exposes too much; scope the task or the region. |
| `Browser left authorized origins` | The page navigated outside `allowedOrigins`. |

To check an endpoint by hand:

```sh
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"model":"jev-latest","state":{"goal":"ping","browser":"none","history":[]},"questions":{"next":{"type":"choice","instructions":"pick","criteria":{"a":"first","b":"second"}}}}'
```

## References

- [TypeSafe introduction](https://docs.typesafe.ai/introduction)
- [OpenRouter Jev latest](https://openrouter.ai/~typesafe/jev-latest)
