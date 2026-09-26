import { inject } from '@vercel/analytics'

/**
 * Page views for the public site. Called once from each document that
 * actually draws a mode (the four tabs share one, the Builder has its own).
 * `auto` is the package default: development logs and does not send,
 * production loads `/_vercel/insights/script.js`, which also counts a
 * pushState between tabs as a view. Redirect-only pages never get here.
 */
inject()
