(function () {
  const ROLE_LABELS = {
    ADMIN: "Admin",
    TRAINEE_OPERATOR: "Trainee Operator",
    PLACEMENT_OPERATOR: "Placement Operator",
  };

  const PAGE_ACCESS = {
    dashboard: ["ADMIN"],
    "trainee-enrollment": ["ADMIN", "TRAINEE_OPERATOR"],
    "placement-details": ["ADMIN", "PLACEMENT_OPERATOR"],
    partnerships: ["ADMIN"],
    gallery: ["ADMIN"],
    reports: ["ADMIN"],
    users: ["ADMIN"],
    "force-password-change": ["ADMIN", "TRAINEE_OPERATOR", "PLACEMENT_OPERATOR"],
    "access-denied": ["ADMIN", "TRAINEE_OPERATOR", "PLACEMENT_OPERATOR"],
  };

  const ROLE_HOME = {
    ADMIN: "admin-dashboard.html",
    TRAINEE_OPERATOR: "admin-trainee-enrollment.html",
    PLACEMENT_OPERATOR: "admin-placement-details.html",
  };

  const NAV_ACCESS = {
    "trainee-enrollment": ["ADMIN", "TRAINEE_OPERATOR"],
    "placement-details": ["ADMIN", "PLACEMENT_OPERATOR"],
    partnerships: ["ADMIN"],
    gallery: ["ADMIN"],
    reports: ["ADMIN"],
    users: ["ADMIN"],
  };

  const getStoredUser = () => {
    const raw = sessionStorage.getItem("authUser") || localStorage.getItem("authUser");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const getPendingToast = () => {
    const raw = sessionStorage.getItem("adminLoginToast");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const clearPendingToast = () => {
    sessionStorage.removeItem("adminLoginToast");
  };

  const clearSession = () => {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    clearPendingToast();
  };

  const logout = () => {
    clearSession();
    window.location.href = "admin-login.html";
  };

  const roleLabel = (role) => ROLE_LABELS[role] || role || "User";
  const canAccess = (role, pageKey) => (PAGE_ACCESS[pageKey] || []).includes(role);
  const roleHome = (role) => ROLE_HOME[role] || "admin-dashboard.html";

  const ensureRoleBadge = (user) => {
    const actions = document.querySelector(".admin-actions");
    if (!actions) return;

    let badge = document.getElementById("adminRoleBadge");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "adminRoleBadge";
      badge.className = "admin-role-badge";
      actions.prepend(badge);
    }

    badge.textContent = roleLabel(user.role);
  };

  const applyNavAccess = (user) => {
    document.querySelectorAll("[data-nav-item]").forEach((link) => {
      const navKey = link.dataset.navItem;
      const visible = (NAV_ACCESS[navKey] || []).includes(user.role);
      link.hidden = !visible;
    });
  };

  const applyUserText = (user) => {
    document.querySelectorAll(
      "#adminGreetingName"
    ).forEach((element) => {
      element.textContent = user.name;
    });
  };

  const ensureLoginToast = () => {
    let toast = document.getElementById("adminLoginToast");
    if (toast) return toast;

    toast = document.createElement("aside");
    toast.id = "adminLoginToast";
    toast.className = "admin-login-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `
      <span class="admin-login-toast-icon" aria-hidden="true">✓</span>
      <div class="admin-login-toast-copy">
        <strong>Login successful</strong>
        <span id="adminLoginToastMessage">Welcome back.</span>
      </div>
    `;
    document.body.appendChild(toast);
    return toast;
  };

  const showLoginToast = (user) => {
    const pendingToast = getPendingToast();
    const toastUser = pendingToast?.name ? pendingToast : null;
    if (!toastUser) return;

    const toast = ensureLoginToast();
    const message = toast.querySelector("#adminLoginToastMessage");
    if (message) {
      message.textContent = `${toastUser.name} signed in as ${roleLabel(user.role)}.`;
    }

    toast.classList.remove("is-visible");
    void toast.offsetWidth;
    toast.classList.add("is-visible");

    window.clearTimeout(showLoginToast.timeoutId);
    showLoginToast.timeoutId = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3000);

    clearPendingToast();
  };

  const applyShell = (user) => {
    applyUserText(user);
    ensureRoleBadge(user);
    applyNavAccess(user);
    showLoginToast(user);
  };

  const requirePage = (pageKey) => {
    const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
    const user = getStoredUser();

    if (!token || !user) {
      window.location.href = "admin-login.html";
      return null;
    }

    sessionStorage.setItem("authToken", token);
    sessionStorage.setItem("authUser", JSON.stringify(user));

    if (user.mustChangePassword && pageKey !== "force-password-change") {
      window.location.href = "admin-force-password-change.html";
      return null;
    }

    if (!canAccess(user.role, pageKey)) {
      const deniedUrl = `admin-access-denied.html?page=${encodeURIComponent(pageKey)}`;
      window.location.href = deniedUrl;
      return null;
    }

    applyShell(user);
    return { token, user };
  };

  const initAccessDeniedPage = () => {
    const root = document.querySelector('[data-admin-page="access-denied"]');
    if (!root) return;

    const user = getStoredUser();
    if (!user) {
      window.location.href = "admin-login.html";
      return;
    }

    applyShell(user);
    document.getElementById("adminAccessDeniedLogoutButton")?.addEventListener("click", logout);
    document.getElementById("accessDeniedHomeLink")?.setAttribute("href", roleHome(user.role));
    const heading = document.getElementById("accessDeniedHeading");
    const message = document.getElementById("accessDeniedMessage");

    if (heading) {
      heading.textContent = `${roleLabel(user.role)} access only`;
    }

    if (message) {
      message.textContent =
        user.role === "TRAINEE_OPERATOR"
          ? "Your role can only work inside Trainee Enrollment. Other modules remain hidden and protected."
          : user.role === "PLACEMENT_OPERATOR"
          ? "Your role can only work inside Placement Details. Other modules remain hidden and protected."
          : "This route is restricted for your role.";
    }
  };

  const focusEditTarget = (target, { focusSelector = "input:not([type='hidden']), select, textarea, button" } = {}) => {
    const element = typeof target === "string" ? document.querySelector(target) : target;
    if (!element) return;

    document.querySelectorAll(".admin-edit-focus").forEach((item) => {
      if (item !== element) item.classList.remove("admin-edit-focus");
    });

    element.classList.remove("admin-edit-focus");
    void element.offsetWidth;
    element.classList.add("admin-edit-focus");
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    const focusTarget = focusSelector ? element.querySelector(focusSelector) : null;
    if (focusTarget) {
      window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 450);
    }
  };

  const clearEditFocus = () => {
    document.querySelectorAll(".admin-edit-focus").forEach((item) => item.classList.remove("admin-edit-focus"));
  };

  window.AdminAuth = {
    applyShell,
    canAccess,
    clearSession,
    clearEditFocus,
    focusEditTarget,
    getStoredUser,
    logout,
    requirePage,
    roleHome,
    roleLabel,
  };

  initAccessDeniedPage();
})();
