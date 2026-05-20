// Shared nav and footer — included on every page
// Call initPage() after DOM loads

function getNav(activePage) {
  return `
  <nav class="nav">
    <a href="/" class="nav-brand">
      <span class="nav-name">Scott Steele</span>
      <span class="nav-divider"></span>
      <span class="nav-tag">Realtor</span>
    </a>
    <div class="nav-links-wrap" style="display:flex;align-items:center;">
      <div class="nav-links">
        <a class="nav-link ${activePage==='sellers'?'active':''}" href="/sellers">Sellers</a>
        <a class="nav-link ${activePage==='buyers'?'active':''}" href="/buyers">Buyers</a>
        <a class="nav-link ${activePage==='markets'?'active':''}" href="/markets">Markets</a>
        <a class="nav-link ${activePage==='about'?'active':''}" href="/about">About</a>
        <a class="nav-link ${activePage==='agents'?'active':''}" href="/agents">Agents</a>
        <a class="nav-cta" href="/contact">Contact</a>
      </div>
    </div>
  </nav>`;
}

function getFooter() {
  return `
  <footer class="footer">
    <div class="footer-grid">
      <div>
        <div class="footer-brand-name">Scott Steele</div>
        <div class="footer-brand-title">CEO · Operating Principal · Realtor</div>
        <div class="footer-contact">
          508.813.9267<br>
          Ssteelere@KW.com<br>
          Licensed in MA &amp; RI<br><br>
          Powered by The Ponte Group<br>
          Keller Williams South Watuppa
        </div>
      </div>
      <div>
        <div class="footer-col-label">SE Massachusetts</div>
        <a class="footer-col-item" href="/markets/fall-river">Fall River</a>
        <a class="footer-col-item" href="/markets/new-bedford">New Bedford</a>
        <a class="footer-col-item" href="/markets/dartmouth">Dartmouth</a>
        <a class="footer-col-item" href="/markets/westport">Westport</a>
        <a class="footer-col-item" href="/markets/taunton">Taunton</a>
        <a class="footer-col-item" href="/markets/swansea">Swansea + 7 more</a>
      </div>
      <div>
        <div class="footer-col-label">Rhode Island</div>
        <a class="footer-col-item" href="/markets/providence">Providence</a>
        <a class="footer-col-item" href="/markets/tiverton">Tiverton</a>
        <a class="footer-col-item" href="/markets/bristol">Bristol</a>
        <a class="footer-col-item" href="/markets/warren">Warren</a>
        <div class="footer-col-label" style="margin-top:20px;">Specialty</div>
        <a class="footer-col-item" href="/luxury">Luxury</a>
        <a class="footer-col-item" href="/investors">Investors</a>
        <a class="footer-col-item" href="/probate">Probate</a>
      </div>
      <div>
        <div class="footer-col-label">Site</div>
        <a class="footer-col-item" href="/sellers">Sellers</a>
        <a class="footer-col-item" href="/buyers">Buyers</a>
        <a class="footer-col-item" href="/agents">Join the team</a>
        <a class="footer-col-item" href="/about">About Scott</a>
        <a class="footer-col-item" href="/local-intelligence">Local Intelligence</a>
        <a class="footer-col-item" href="/vendors">Vendor Directory</a>
        <a class="footer-col-item" href="/contact">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-copy">© 2026 Scott Steele · Licensed in MA &amp; RI</span>
      <span class="footer-copy">Powered by The Ponte Group · Keller Williams South Watuppa</span>
    </div>
  </footer>`;
}

function initPage(activePage) {
  const navEl = document.getElementById('nav-placeholder');
  const footerEl = document.getElementById('footer-placeholder');
  if (navEl) navEl.innerHTML = getNav(activePage || '');
  if (footerEl) footerEl.innerHTML = getFooter();
}
