// Simple client-side search using a prebuilt `search_index.json`.
// Loads the index once and performs case-insensitive substring matching
// against titles and page text. Shows snippets around the first match.

let INDEX = [];
let ready = fetch('search_index.json')
  .then(r => r.json())
  .then(j => { INDEX = j; })
  .catch(err => { console.error('Failed to load search index:', err); INDEX = []; });

function snippetFor(text, q) {
  const t = text.toLowerCase();
  const qi = q.toLowerCase();
  const i = t.indexOf(qi);
  if (i === -1) return text.slice(0, 200) + (text.length>200? '...':'');
  const start = Math.max(0, i - 50);
  const end = Math.min(text.length, i + 120);
  let snip = text.slice(start, end);
  if (start>0) snip = '…' + snip;
  if (end < text.length) snip = snip + '…';
  return snip.replace(/\s+/g, ' ').trim();
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
  return text.replace(re, m => `<mark>${m}</mark>`);
}

function renderResults(results, q) {
  const out = document.getElementById('results');
  const emptyArea = document.getElementById('empty-area');
  // If nothing is searched, show the empty-area icon and clear results.
  if (!q || q.trim().length === 0) {
    if (emptyArea) emptyArea.style.display = 'flex';
    out.innerHTML = '';
    return;
  } else {
    if (emptyArea) emptyArea.style.display = 'none';
  }

  out.innerHTML = '';
  if (!results.length) {
    out.innerHTML = '<p class="meta">No results.</p>';
    return;
  }
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `${results.length} result${results.length===1? '':'s'}`;
  out.appendChild(meta);

  results.forEach(r => {
    const el = document.createElement('div');
    el.className = 'result';
    const a = document.createElement('a');
    a.href = r.path;
    a.innerHTML = highlight(r.title || r.path, q);
    el.appendChild(a);

    const metaLine = document.createElement('div');
    metaLine.className = 'meta';
    metaLine.textContent = r.path;
    el.appendChild(metaLine);

    const snip = document.createElement('div');
    snip.className = 'snippet';
    const snippetText = snippetFor(r.text || '', q);
    snip.innerHTML = highlight(snippetText, q);
    el.appendChild(snip);

    out.appendChild(el);
  });
}

function doSearch(q) {
  if (!q || q.trim().length < 1) {
    renderResults([], q);
    return;
  }
  const ql = q.toLowerCase();
  const results = INDEX.map(item => {
    const title = (item.title||'') + '';
    const text = (item.text||'') + '';
    const score = (title.toLowerCase().includes(ql) ? 2 : 0) + (text.toLowerCase().includes(ql) ? 1 : 0);
    return { score, path: item.path, title: item.title, text: item.text };
  }).filter(r => r.score>0)
    .sort((a,b) => b.score - a.score);
  renderResults(results, q);
}

// debounce
function debounce(fn, wait){ let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); }; }

ready.then(()=>{
  const input = document.getElementById('search-input');
  const deb = debounce(()=>doSearch(input.value), 250);
  input.addEventListener('input', deb);
  input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') doSearch(input.value); });
});
