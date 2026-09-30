function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

export function renderChapterHtml(src: string) {
  const escaped = escapeHtml(src).replace(/\r\n/g, "\n");
  const blocks = escaped.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const line = block.trim();
      if (!line) return "";
      if (/^###\s/.test(line)) return `<h3>${inline(line.replace(/^###\s/, ""))}</h3>`;
      if (/^##\s/.test(line)) return `<h2>${inline(line.replace(/^##\s/, ""))}</h2>`;
      if (/^#\s/.test(line)) return `<h1>${inline(line.replace(/^#\s/, ""))}</h1>`;
      if (/^>\s/.test(line)) {
        const quote = line
          .split("\n")
          .map((l) => l.replace(/^>\s?/, ""))
          .join(" ");
        return `<blockquote>${inline(quote)}</blockquote>`;
      }
      const withBreaks = line.split("\n").map(inline).join("<br/>");
      return `<p>${withBreaks}</p>`;
    })
    .join("");
}

function inline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}
