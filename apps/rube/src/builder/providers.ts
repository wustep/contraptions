/**
 * Who writes a piece. Three choices, all of them client-side: this is a
 * static site, so there is no server to hold a secret and none is built into
 * the bundle. A key is pasted into the Builder, kept in this browser's
 * localStorage, and sent straight to the provider it belongs to.
 *
 *   offline  the scaffolds. No key, no network.
 *   claude   the Anthropic API, with an Anthropic key, through the official SDK.
 *   gateway  the Vercel AI Gateway, with a gateway key: one endpoint in front
 *            of many providers, models named `provider/model`.
 *
 * Each provider has its own key, its own list of models and its own choice
 * among them, so switching back and forth loses nothing. This module is the
 * part of that with no network and no DOM in it, so the checks can run it.
 */

export type ProviderName = 'offline' | 'claude' | 'gateway'
export type Keyed = Exclude<ProviderName, 'offline'>
export const PROVIDERS: readonly ProviderName[] = ['offline', 'claude', 'gateway']

export interface ModelOption {
  id: string
  label: string
  note: string
}

export interface ProviderInfo {
  label: string
  /** Where the key goes, and the only place it goes. */
  host: string
  keyHint: string
  keysAt: string
  models: readonly ModelOption[]
  defaultModel: string
}

/** The Anthropic API's own ids. The first is the default. */
const CLAUDE_MODELS: readonly ModelOption[] = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', note: 'the default: the best at the geometry' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', note: 'quicker and cheaper' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: 'quickest; simple pieces' },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', note: 'the most capable; slow and dear' },
]

/**
 * The gateway's ids, `provider/model`. An allowlist and not the gateway's
 * whole catalogue, which runs to hundreds and is mostly models that cannot
 * do this: writing a piece is careful geometry in strict JSON. The Builder
 * checks the list against the gateway's own `/v1/models` when the provider is
 * chosen, so an id the gateway has retired drops out of the picker.
 */
const GATEWAY_MODELS: readonly ModelOption[] = [
  { id: 'anthropic/claude-opus-5', label: 'Claude Opus 5', note: 'the default' },
  { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', note: 'quicker and cheaper' },
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', note: 'quickest' },
  { id: 'anthropic/claude-fable-5.1', label: 'Claude Fable 5.1', note: 'the most capable' },
  { id: 'openai/gpt-5.5', label: 'GPT-5.5', note: 'OpenAI' },
  { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 mini', note: 'OpenAI, small' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', note: 'Google' },
  { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash', note: 'Google, quick' },
  { id: 'moonshotai/kimi-k3', label: 'Kimi K3', note: 'Moonshot' },
  { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro', note: 'DeepSeek' },
]

export const PROVIDER_INFO: Record<Keyed, ProviderInfo> = {
  claude: {
    label: 'Claude',
    host: 'api.anthropic.com',
    keyHint: 'sk-ant-…',
    keysAt: 'console.anthropic.com',
    models: CLAUDE_MODELS,
    defaultModel: CLAUDE_MODELS[0].id,
  },
  gateway: {
    label: 'AI Gateway',
    host: 'ai-gateway.vercel.sh',
    keyHint: 'an AI Gateway API key',
    keysAt: 'vercel.com, under AI Gateway',
    models: GATEWAY_MODELS,
    defaultModel: GATEWAY_MODELS[0].id,
  },
}

export const providerLabel = (name: ProviderName): string => (name === 'offline' ? 'Offline' : PROVIDER_INFO[name].label)

/** The models the picker shows for a provider. None offline: there is nothing to pick. */
export const modelsFor = (name: ProviderName): readonly ModelOption[] => (name === 'offline' ? [] : PROVIDER_INFO[name].models)

/**
 * The model to use with a provider, given what was last chosen for it: that
 * choice while the provider still offers it, and the provider's default
 * otherwise. So a model id never crosses from one provider to the other, and
 * a choice that has since left the list quietly becomes the default.
 */
export function resolveModel(name: Keyed, saved: string | null | undefined, offered: readonly ModelOption[] = PROVIDER_INFO[name].models): string {
  if (saved && offered.some((m) => m.id === saved)) return saved
  const fallback = PROVIDER_INFO[name].defaultModel
  return offered.some((m) => m.id === fallback) ? fallback : (offered[0]?.id ?? fallback)
}

/** The allowlist, less whatever the gateway no longer serves. The whole allowlist when the gateway's list is no help. */
export function stillServed(allowed: readonly ModelOption[], live: readonly string[] | null): readonly ModelOption[] {
  if (!live?.length) return allowed
  const ids = new Set(live)
  const kept = allowed.filter((m) => ids.has(m.id))
  return kept.length ? kept : allowed
}

/* ------------------------------------------------------------------ what is remembered */

export interface GeneratorSettings {
  provider: ProviderName
  /** The model last chosen for each provider. */
  models: Partial<Record<Keyed, string>>
}

const SETTINGS_STORE = 'contraptions:generator'
const keyStore = (name: Keyed) => `contraptions:key:${name}`

export const defaultSettings = (): GeneratorSettings => ({ provider: 'offline', models: {} })

/** Settings from whatever was stored: anything unrecognised is dropped rather than trusted. */
export function readSettings(raw: unknown): GeneratorSettings {
  const out = defaultSettings()
  if (typeof raw !== 'object' || raw === null) return out
  const { provider, models } = raw as { provider?: unknown; models?: unknown }
  if (PROVIDERS.includes(provider as ProviderName)) out.provider = provider as ProviderName
  if (typeof models === 'object' && models !== null) {
    for (const name of ['claude', 'gateway'] as const) {
      const id = (models as Record<string, unknown>)[name]
      if (typeof id === 'string') out.models[name] = resolveModel(name, id)
    }
  }
  return out
}

export function loadSettings(): GeneratorSettings {
  try {
    return readSettings(JSON.parse(localStorage.getItem(SETTINGS_STORE) ?? 'null'))
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: GeneratorSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORE, JSON.stringify(settings))
  } catch {
    /* storage unavailable: the choice lasts as long as the page does */
  }
}

export function loadKey(name: Keyed): string {
  try {
    return localStorage.getItem(keyStore(name)) ?? ''
  } catch {
    return ''
  }
}

export function saveKey(name: Keyed, key: string): void {
  try {
    if (key) localStorage.setItem(keyStore(name), key)
    else localStorage.removeItem(keyStore(name))
  } catch {
    /* storage unavailable: the key lasts as long as the page does */
  }
}
