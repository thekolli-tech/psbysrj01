import { LEGAL_LAST_UPDATED, legalParts, type LegalDocument } from '../shared/legal.ts';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderParts(text: string): string {
  return legalParts(text).map(part => {
    if (part.type === 'link') {
      return `<a href="${escapeHtml(part.href)}">${escapeHtml(part.label)}</a>`;
    }
    if (part.type === 'placeholder') {
      return `<span class="placeholder">${escapeHtml(part.value)}</span>`;
    }
    return escapeHtml(part.value);
  }).join('');
}

/** Public HTML for direct requests. No session is required. */
export function renderLegalHtml(document: LegalDocument): string {
  const sections = document.sections.map(section => `
    <section id="${escapeHtml(section.id)}">
      <h2>${escapeHtml(section.heading)}</h2>
      ${section.blocks.map(block => `<p>${renderParts(block.text)}</p>`).join('')}
    </section>
  `).join('');
  const toc = document.sections.map(section => `<li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.heading)}</a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(document.title)} · Property Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: "Plus Jakarta Sans", sans-serif; }
    header, footer { background: #fff; border-color: #e2e8f0; }
    header { border-bottom: 1px solid #e2e8f0; }
    footer { border-top: 1px solid #e2e8f0; }
    a { color: #b45309; }
    .wrap { max-width: 48rem; margin: 0 auto; padding: 1.25rem; }
    .bar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; }
    h1 { font-size: 1.8rem; line-height: 1.2; margin: 0.25rem 0; }
    h2 { font-size: 1.15rem; margin: 2rem 0 0.5rem; }
    p, li { line-height: 1.6; font-size: 0.95rem; }
    .notice, .placeholder { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 0.75rem; padding: 0.75rem 1rem; }
    .placeholder { display: inline; padding: 0.1rem 0.35rem; }
    nav ol { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <header>
    <div class="wrap bar">
      <a href="/">Property Studio</a>
      <nav>
        <a href="/privacy-policy">Privacy Policy</a>
        ·
        <a href="/terms-and-conditions">Terms &amp; Conditions</a>
      </nav>
    </div>
  </header>
  <main class="wrap">
    <p>Draft for operator and legal review</p>
    <h1>${escapeHtml(document.title)}</h1>
    <p>Last updated: ${escapeHtml(LEGAL_LAST_UPDATED)}</p>
    <nav aria-label="On this page"><ol>${toc}</ol></nav>
    ${sections}
  </main>
  <footer>
    <div class="wrap">
      <a href="/privacy-policy">Privacy Policy</a>
      ·
      <a href="/terms-and-conditions">Terms &amp; Conditions</a>
      ·
      <a href="mailto:info@propertystudio.org">info@propertystudio.org</a>
    </div>
  </footer>
</body>
</html>`;
}
