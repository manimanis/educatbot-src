import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import sql from 'highlight.js/lib/languages/sql'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import xml from 'highlight.js/lib/languages/xml'
import plaintext from 'highlight.js/lib/languages/plaintext'

// Enregistrement des langages supportés (léger)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)

/* =========================================================
   Instance markdown-it configurée
   ========================================================= */

const md = new MarkdownIt({
  html: false,            // Pas de HTML brut (sécurité XSS)
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str, lang) {
    const language = (lang || '').toLowerCase()
    if (language && hljs.getLanguage(language)) {
      try {
        return `<pre class="hljs"><code class="language-${language}">${
          hljs.highlight(str, { language, ignoreIllegal: true }).value
        }</code></pre>`
      } catch {}
    }
    // Pas de langage connu : échapper le HTML et retourner
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

// Désactive les liens automatiques suspects (protection XSS)
const defaultLinkOpen = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx]
  const aIndex = token.attrIndex('target')
  if (aIndex < 0) token.attrPush(['target', '_blank'])
  else token.attrs[aIndex][1] = '_blank'
  token.attrPush(['rel', 'noopener noreferrer'])
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/* =========================================================
   Composable
   ========================================================= */

export function useMarkdown() {
  function render(text) {
    if (!text) return ''
    return md.render(text)
  }

  function renderInline(text) {
    if (!text) return ''
    return md.renderInline(text)
  }

  return { render, renderInline }
}

export { md as markdownInstance }
