const headerRoot = document.getElementById("site-header-root");

if (headerRoot) {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  const isActive = (page) => (currentPath === page ? ' aria-current="page" class="nav-active"' : "");

  headerRoot.innerHTML = `
    <header class="site-header" id="top">
      <div class="topbar container">
        <a class="brand" href="index.html" aria-label="INSEED Solutions home">
          <span class="brand-mark brand-mark-logo">
            <img
              class="brand-logo"
              src="assets/branding/inseed-logo-wide.png"
              alt="INSEED Solutions logo"
              loading="eager"
              decoding="async"
            />
          </span>
          <span class="brand-copy">
            <strong>INSEED Solutions</strong>
            <small>Enterprise Technology & Talent</small>
          </span>
        </a>

        <div class="topbar-right">
          <div class="contact-strip">
            <a href="mailto:hello@inseedsolutions.com">hello@inseedsolutions.com</a>
            <a href="tel:+919010210002">+91 90102 10002</a>
          </div>

          <div class="social-links" aria-label="Social media">
            <a href="#!" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.3 0-5 2.2-5 5.1V12H6v4h3v4h4v-4h3l1-4h-4V9.5c0-.9.4-1.5 1-1.5Z"/></svg></a>
            <a href="#!" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm10.5 1.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg></a>
            <a href="#!" aria-label="X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.8L5.9 22H2.8l7.3-8.4L1 2h6.3l4.4 6.2L18.9 2Zm-1.1 18h1.7L6.4 3.9H4.6L17.8 20Z"/></svg></a>
          </div>

          <div class="nav-dropdown topbar-login">
            <button class="button button-primary button-sm nav-link-login nav-link-with-caret" type="button" aria-expanded="false">
              Login
              <span class="caret"></span>
            </button>
            <div class="dropdown-menu dropdown-menu-right">
              <a href="admin-login.html">Admin Login</a>
              <a href="student-login.html">Student Login</a>
            </div>
          </div>
        </div>

        <button class="mobile-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Toggle navigation">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <nav class="main-nav container" id="primary-nav" aria-label="Primary">
        <a href="index.html"${isActive("index.html")}>Home</a>

        <div class="nav-dropdown">
          <button class="nav-link-with-caret" type="button" aria-expanded="false">
            About Us
            <span class="caret"></span>
          </button>
          <div class="dropdown-menu">
            <a href="company-profile.html">Company Profile</a>
            <a href="leadership.html">Leadership</a>
            <a href="vision-mission.html">Vision &amp; Mission</a>
          </div>
        </div>

        <a href="services.html"${isActive("services.html")}>Services</a>
        <a href="case-studies.html"${isActive("case-studies.html")}>Case Studies</a>

        <div class="nav-dropdown">
          <button class="nav-link-with-caret" type="button" aria-expanded="false">
            Skilling
            <span class="caret"></span>
          </button>
          <div class="dropdown-menu">
            <a href="partnerships.html">Agreements</a>
            <a href="data.html">Data</a>
            <a href="placement.html">Placement</a>
            <a href="gallery.html">Gallery</a>
          </div>
        </div>

        <a href="contact.html"${isActive("contact.html")}>Contact</a>

        <div class="nav-dropdown mobile-only-nav">
          <button class="nav-link-with-caret" type="button" aria-expanded="false">
            Login
            <span class="caret"></span>
          </button>
          <div class="dropdown-menu">
            <a href="admin-login.html">Admin Login</a>
            <a href="student-login.html">Student Login</a>
          </div>
        </div>
      </nav>
    </header>
  `;
}

