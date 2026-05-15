/**
 * Lesson scraper bookmarklet — readable source.
 *
 * Click while viewing a grammar lesson page and it downloads a clean
 * Markdown file (`<slug>.md`) with frontmatter (title, source_url,
 * fetched_at). Designed for studyspanish.com but defensive about the
 * exact DOM structure, so it should work on most article-style pages.
 *
 * To install: run `python scripts/build-bookmarklet.py` to get the
 * single-line `javascript:…` URL, paste it as the URL of a new
 * bookmark in your browser.
 */

(function () {
  const article =
    document.querySelector(
      'article, main, .entry-content, .post-content, [role="main"], #content',
    ) || document.body;

  const clone = article.cloneNode(true);
  // Strip obvious chrome that would pollute the markdown.
  clone
    .querySelectorAll(
      'nav, header, footer, aside, script, style, iframe, button, audio, video, form, .sidebar, .related, .comments, .share, .navigation, .audio-player, [aria-hidden="true"]',
    )
    .forEach(el => el.remove());

  const title = (document.querySelector('h1')?.textContent || document.title).trim();

  const path = location.pathname.replace(/\/$/, '');
  const slug =
    path
      .split('/')
      .filter(Boolean)
      .slice(-2)
      .join('-')
      .replace(/[^a-z0-9-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'lesson';

  function md(node) {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    const inner = () => Array.from(node.childNodes).map(md).join('');
    switch (tag) {
      case 'h1':
        return '\n\n# ' + inner() + '\n\n';
      case 'h2':
        return '\n\n## ' + inner() + '\n\n';
      case 'h3':
        return '\n\n### ' + inner() + '\n\n';
      case 'h4':
        return '\n\n#### ' + inner() + '\n\n';
      case 'h5':
        return '\n\n##### ' + inner() + '\n\n';
      case 'h6':
        return '\n\n###### ' + inner() + '\n\n';
      case 'p':
        return '\n\n' + inner() + '\n\n';
      case 'br':
        return '  \n';
      case 'strong':
      case 'b':
        return '**' + inner() + '**';
      case 'em':
      case 'i':
        return '*' + inner() + '*';
      case 'a':
        return '[' + inner() + '](' + (node.getAttribute('href') || '') + ')';
      case 'code':
        return '`' + inner() + '`';
      case 'pre':
        return '\n\n```\n' + inner() + '\n```\n\n';
      case 'ul':
        return (
          '\n\n' +
          Array.from(node.children)
            .map(li => '- ' + md(li).trim())
            .join('\n') +
          '\n\n'
        );
      case 'ol':
        return (
          '\n\n' +
          Array.from(node.children)
            .map((li, i) => i + 1 + '. ' + md(li).trim())
            .join('\n') +
          '\n\n'
        );
      case 'li':
        return inner();
      case 'blockquote':
        return '\n\n> ' + inner().trim().replace(/\n/g, '\n> ') + '\n\n';
      case 'hr':
        return '\n\n---\n\n';
      case 'table': {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (!rows.length) return '';
        const lines = rows.map(tr =>
          Array.from(tr.children)
            .map(td => md(td).trim().replace(/\|/g, '\\|').replace(/\n+/g, ' '))
            .join(' | '),
        );
        const header = lines.shift();
        const sep = Array(header.split('|').length).fill('---').join(' | ');
        return '\n\n| ' + header + ' |\n| ' + sep + ' |\n' + lines.map(l => '| ' + l + ' |').join('\n') + '\n\n';
      }
      default:
        return inner();
    }
  }

  let body = md(clone)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Most lesson pages start with a TOC / nav block that survives selector
  // filtering. The real lesson heading is the first H1 we emitted; drop
  // everything before it.
  const firstH1 = body.search(/^# /m);
  if (firstH1 > 0) {
    body = body.slice(firstH1);
  }

  // Strip known footer chrome from studyspanish.com-style pages.
  body = body
    .replace(/^\s*-\s*\[(?:Print|Email)[^\]]*\]\([^)]*\)\s*$/gm, '')
    .replace(/^\s*Powered By[^\n]*$/gm, '')
    .replace(/^\s*-\s*$/gm, '') // orphan list bullets
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const frontmatter =
    '---\n' +
    'title: ' + JSON.stringify(title) + '\n' +
    'source_url: ' + location.href + '\n' +
    'fetched_at: ' + new Date().toISOString() + '\n' +
    '---\n\n';

  // body already starts with an H1 after the trim above, so no need to
  // prepend another title.
  const out = frontmatter + body + '\n';

  const blob = new Blob([out], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = slug + '.md';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
})();
