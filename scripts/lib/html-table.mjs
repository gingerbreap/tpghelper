/**
 * Minimal HTML table extractor for Excel-exported sheet001.htm.
 */
export class HTMLParser {
  static parseRows(html) {
    const rows = []
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let tr
    while ((tr = trRe.exec(html))) {
      const cells = []
      const tdRe = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi
      let td
      while ((td = tdRe.exec(tr[1]))) {
        const raw = td[2]
        const hrefMatch = raw.match(/href=["']([^"']+)["']/i)
        const text = raw
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\r/g, '')
        cells.push({ text, href: hrefMatch ? hrefMatch[1] : null })
      }
      if (cells.some(c => c.text.trim() || c.href)) rows.push(cells)
    }
    return rows
  }
}
