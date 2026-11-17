// Generates sitemap-blog.xml on request from the same Google Sheet that
// drives /blog and /blog/<slug> (see blog-post.js). New posts show up
// here the next time the sitemap is requested — nothing to rebuild or
// redeploy when the Sheet changes.

const SHEET_ID = "1JKUdppBbPISJZTZU_-Dqe0W7_K6ydlyOr5GtgSz6Ze4";
const API_KEY = "AIzaSyDmo4NJNmjFWiXv4RNH7s5w7SAsqiwQG2s";
const SITE = "https://thesteeleadvantage.com";

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
      slug: r[5] || "",
      published: (r[6] || "yes").toLowerCase() !== "no",
    }))
    .filter((p) => p.title && p.slug && p.published);
}

// Sheet dates are editorial strings like "November 10, 2026" — sitemap
// <lastmod> needs W3C datetime (YYYY-MM-DD). Fall back to omitting
// <lastmod> for a row rather than emitting a bad date.
function toW3CDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXml(posts) {
  const urls = posts
    .map((p) => {
      const lastmod = toW3CDate(p.date);
      return [
        "  <url>",
        `    <loc>${SITE}/blog/${escapeXml(p.slug)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        "    <changefreq>monthly</changefreq>",
        "    <priority>0.6</priority>",
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

exports.handler = async () => {
  let posts;
  try {
    posts = await fetchPosts();
  } catch (e) {
    // Sheets API hiccup — return an empty-but-valid sitemap rather than
    // an error page, so a transient blip can't look like every post
    // vanished to anything re-crawling this URL.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`,
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
    body: buildXml(posts),
  };
};
