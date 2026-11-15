// Server-side rendering for /blog/<slug>
//
// Why this exists: the old setup served the same generic blog-post.html
// (same <title>, same meta description, same canonical pointing at /blog)
// for every single blog post, with the real content filled in client-side
// after a fetch to Google Sheets. That told Google every post was a
// duplicate of /blog, so individual posts weren't indexable as their own
// pages. This function fetches the matching row server-side and returns
// a fully-formed HTML document per slug — real <title>, real meta
// description, a canonical URL that points at that post, Article schema,
// and the post body already rendered into the HTML. The existing
// client-side script in blog-post.html still runs afterward as a
// harmless no-op refresh (same data), so nothing about the authoring
// workflow in the Google Sheet changes.

const fs = require("fs");
const path = require("path");

const SHEET_ID = "1JKUdppBbPISJZTZU_-Dqe0W7_K6ydlyOr5GtgSz6Ze4";
const API_KEY = "AIzaSyDmo4NJNmjFWiXv4RNH7s5w7SAsqiwQG2s";
const SITE = "https://thesteeleadvantage.com";
const DEFAULT_IMAGE = `${SITE}/assets/images/scott-headshot.png`;
const DEFAULT_LOGO = `${SITE}/assets/images/scott-steele-logo-transparent.png`;

// Same markdown handling as the client-side parser in blog-post.html —
// kept in sync by hand since there's no shared module between them yet.
function parseMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/[*][*][*](.+?)[*][*][*]/g, "<strong><em>$1</em></strong>")
    .replace(/[*][*](.+?)[*][*]/g, "<strong>$1</strong>")
    .replace(/[*](.+?)[*]/g, "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^[0-9]+[.] (.+)$/gm, "<li>$1</li>");

  html = html.replace(/(<li>[\s\S]*?<\/li>\s*)+/g, (m) => "<ul>" + m + "</ul>");

  html = html
    .split("\n\n")
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("<")) return block;
      return "<p>" + block.replace(/\n/g, "<br>") + "</p>";
    })
    .join("\n");

  return html;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}

async function fetchPosts() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Posts!A2:H?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API returned ${res.status}`);
  const data = await res.json();
  const rows = data.values || [];
  return rows
    .map((r) => ({
      title: r[0] || "",
      date: r[1] || "",
      category: r[2] || "",
      summary: r[3] || "",
      body: r[4] || "",
      slug: r[5] || "",
      published: (r[6] || "yes").toLowerCase() !== "no",
      image: r[7] || "",
    }))
    .filter((p) => p.title);
}

function render(template, post) {
  const pageUrl = `${SITE}/blog/${post.slug}`;
  const metaDesc =
    post.summary ||
    "Real estate insights from Scott Steele — SE Massachusetts and Rhode Island.";
  const titleTag = `${post.title} | Scott Steele`;
  const image = post.image || DEFAULT_IMAGE;
  const bodyHtml = parseMarkdown(post.body);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: metaDesc,
    datePublished: post.date,
    url: pageUrl,
    image,
    author: { "@type": "Person", name: "Scott Steele" },
    publisher: {
      "@type": "Organization",
      name: "The Steele Advantage",
      logo: { "@type": "ImageObject", url: DEFAULT_LOGO },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  });

  let html = template;

  html = html.replace(
    /<title id="page-title">[^<]*<\/title>/,
    `<title id="page-title">${escapeHtml(titleTag)}</title>`
  );
  html = html.replace(
    /<meta name="description" id="page-desc" content="[^"]*">/,
    `<meta name="description" id="page-desc" content="${escapeAttr(metaDesc)}">`
  );
  html = html.replace(
    /<link rel="canonical" id="page-canonical" href="[^"]*">/,
    `<link rel="canonical" id="page-canonical" href="${pageUrl}">`
  );
  html = html.replace(
    /<meta property="og:url" id="og-url" content="[^"]*">/,
    `<meta property="og:url" id="og-url" content="${pageUrl}">`
  );
  html = html.replace(
    /<meta property="og:title" id="og-title" content="[^"]*">/,
    `<meta property="og:title" id="og-title" content="${escapeAttr(titleTag)}">`
  );
  html = html.replace(
    /<meta property="og:description" id="og-desc" content="[^"]*">/,
    `<meta property="og:description" id="og-desc" content="${escapeAttr(metaDesc)}">`
  );
  html = html.replace(
    /<meta property="og:image" id="og-image" content="[^"]*">/,
    `<meta property="og:image" id="og-image" content="${escapeAttr(image)}">`
  );
  html = html.replace(
    /<script type="application\/ld\+json" id="post-jsonld"><\/script>/,
    `<script type="application/ld+json" id="post-jsonld">${jsonLd}</script>`
  );

  // Pre-fill the post body so it's present without JS, and show it by
  // default instead of the loading spinner (the client script still runs
  // and quietly re-renders the same content once it fetches).
  html = html.replace(
    /<div id="post-loading">Loading article…<\/div>/,
    `<div id="post-loading" style="display:none;">Loading article…</div>`
  );
  html = html.replace(
    /<div class="post-cat-label" id="post-cat"><\/div>/,
    `<div class="post-cat-label" id="post-cat">${escapeHtml(post.category)}</div>`
  );
  html = html.replace(
    /<h1 class="post-headline" id="post-title"><\/h1>/,
    `<h1 class="post-headline" id="post-title">${escapeHtml(post.title)}</h1>`
  );
  html = html.replace(
    /<span id="post-date"><\/span>/,
    `<span id="post-date">${escapeHtml(post.date)}</span>`
  );
  html = html.replace(
    /<div class="post-content" id="post-content"><\/div>/,
    `<div class="post-content" id="post-content">${bodyHtml}</div>`
  );
  html = html.replace(
    /<div id="post-wrap" style="display:none;">/,
    `<div id="post-wrap" style="display:block;">`
  );
  if (post.image) {
    html = html.replace(
      /<img id="post-img" class="post-featured-img" style="display:none;" alt="">/,
      `<img id="post-img" class="post-featured-img" style="display:block;" alt="${escapeAttr(
        post.title
      )}" src="${escapeAttr(post.image)}">`
    );
  }

  return html;
}

exports.handler = async (event) => {
  const slug = decodeURIComponent(
    (event.path || "").replace(/^\/blog\//, "").replace(/\/$/, "")
  );

  if (!slug) {
    return { statusCode: 302, headers: { Location: "/blog" }, body: "" };
  }

  const templatePath = path.join(__dirname, "blog-post-template.html");

  let posts;
  try {
    posts = await fetchPosts();
  } catch (e) {
    // Sheets API hiccup — fail soft to the client-rendered page rather
    // than showing visitors or Googlebot a hard error.
    const fallback = fs.readFileSync(templatePath, "utf8");
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: fallback,
    };
  }

  const post = posts.find((p) => p.slug === slug && p.published);

  if (!post) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Post not found | Scott Steele</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px;"><h1>That post isn't here.</h1><p><a href="/blog">Back to the blog</a></p></body></html>`,
    };
  }

  const template = fs.readFileSync(templatePath, "utf8");
  const html = render(template, post);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=600, stale-while-revalidate=86400",
    },
    body: html,
  };
};
