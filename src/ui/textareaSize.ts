// Measure a hidden, out-of-flow field. Never collapse the live writing surface:
// doing so can clamp the document scroll offset or scroll a focused caret into view.
const sizingProperties = [
  'width',
  'box-sizing',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-style',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-stretch',
  'font-variant',
  'font-feature-settings',
  'font-variation-settings',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-indent',
  'text-transform',
  'text-align',
  'tab-size',
  'white-space',
  'word-break',
  'overflow-wrap',
  'text-wrap',
  'direction',
] as const
const hiddenStyle = 'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;height:0;min-height:0;max-height:none;overflow:hidden;margin:0;resize:none;'

export function textareaSizer(el: HTMLTextAreaElement) {
  const mirror = document.createElement('textarea')
  mirror.setAttribute('aria-hidden', 'true')
  mirror.tabIndex = -1
  mirror.readOnly = true
  mirror.rows = 1
  mirror.style.cssText = hiddenStyle
  let previous = '',
    disposed = false
  document.body.append(mirror)

  return {
    fit(force = false) {
      if (disposed || !el.isConnected || !el.getClientRects().length) return
      const css = getComputedStyle(el)
      const values = sizingProperties.map((p) => css.getPropertyValue(p))
      const text = el.value || el.placeholder || ' '
      const signature = JSON.stringify([values, text, el.wrap])
      if (!force && signature === previous) return
      previous = signature
      mirror.style.cssText = hiddenStyle
      sizingProperties.forEach((p, i) => mirror.style.setProperty(p, values[i]))
      mirror.wrap = el.wrap
      mirror.value = text
      const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom)
      const border = parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth)
      const height = mirror.scrollHeight + (css.boxSizing === 'border-box' ? border : -padding)
      const next = `${Math.max(0, height)}px`
      if (el.style.height !== next) el.style.height = next
    },
    dispose() {
      disposed = true
      mirror.remove()
    },
  }
}
