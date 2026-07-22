const adminDashboard = document.querySelector("[data-admin-dashboard]");

if (adminDashboard) {
  const session = window.AdminAuth?.requirePage("dashboard");
  if (session) {
    const apiBase = window.APP_API_BASE || "";
    const { token, user } = session;

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    const renderModules = (modules) => {
      const grid = document.getElementById("adminModuleGrid");
      if (!grid) return;

      const moduleLinks = {
        "trainee-enrollment": "admin-trainee-enrollment.html",
        "placement-details": "admin-placement-details.html",
        partnerships: "admin-partnerships.html",
        gallery: "admin-gallery-management.html",
        users: "admin-users.html",
        reports: "admin-reports.html",
      };

      const visibleModules = modules.filter((module) => !module.roles || module.roles.includes(user.role));

      grid.innerHTML = visibleModules
        .map(
          (module) => `
            <article class="admin-module-card" id="${module.id}">
              <div class="admin-module-icon">${module.title.charAt(0)}</div>
              <h3>${module.title}</h3>
              <p>${module.description}</p>
              <a class="button button-primary button-sm" href="${moduleLinks[module.id] || "#"}">${module.action}</a>
            </article>
          `
        )
        .join("");
    };

    const bindLogout = () => {
      document.getElementById("adminLogoutButton")?.addEventListener("click", window.AdminAuth.logout);
    };

    const loadOverview = async () => {
      setText("adminGreetingName", user.name);
      setText("adminSessionRole", `${window.AdminAuth.roleLabel(user.role)} Session`);
      setText("adminSessionMeta", user.email);

      try {
        const response = await fetch(`${apiBase}${adminDashboard.dataset.api}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const raw = await response.text();
        const result = raw ? JSON.parse(raw) : {};

        if (!response.ok) {
          throw new Error(result.message || "Unable to load admin overview");
        }

        const { metrics, modules, admin } = result.data;
        setText("metricTrainees", metrics.trainees);
        setText("metricInstitutions", metrics.institutions);
        setText("metricPlacements", metrics.placements);
        setText("metricSuccessful", metrics.successfulPlacements);
        setText("metricInquiries", `${metrics.inquiries} inquiry records tracked`);
        setText("adminGreetingName", admin.name);
        renderModules(modules);
      } catch (error) {
        if (/401|403|token|permission|expired/i.test(error.message)) {
          setText("dashboardMeta", "Your session could not load dashboard data. Please refresh or sign in again.");
          return;
        }

        const grid = document.getElementById("adminModuleGrid");
        if (grid) {
          grid.innerHTML = `
            <article class="admin-module-card admin-module-card-empty">
              <h3>Dashboard unavailable</h3>
              <p>${error.message || "We could not load the admin overview right now."}</p>
            </article>
          `;
        }
      }
    };

    bindLogout();
    loadOverview();
  }
}
