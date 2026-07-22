const loginForm = document.querySelector("[data-login-form]");

if (loginForm) {
  const statusElement = document.getElementById("loginFormStatus");
  const apiBase = window.APP_API_BASE || "";
  const fields = Array.from(loginForm.querySelectorAll("input"));
  let hasUserTyped = false;

  const clearLoginFields = () => {
    if (hasUserTyped) return;
    loginForm.reset();
    fields.forEach((field) => {
      field.value = "";
      field.removeAttribute("value");
    });
  };

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      hasUserTyped = true;
    });
  });

  clearLoginFields();
  window.addEventListener("pageshow", clearLoginFields);
  [50, 250, 800].forEach((delay) => window.setTimeout(clearLoginFields, delay));

  const getRoleHome = (user) => {
    if (user.role === "TRAINEE_OPERATOR") return "admin-trainee-enrollment.html";
    if (user.role === "PLACEMENT_OPERATOR") return "admin-placement-details.html";
    if (user.role === "ADMIN") return "admin-dashboard.html";
    return loginForm.dataset.redirect || "index.html";
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = loginForm.querySelector("button[type='submit']");
    if (!loginForm.reportValidity()) {
      if (statusElement) {
        statusElement.dataset.state = "error";
        statusElement.textContent = "Please enter your email and password.";
      }
      return;
    }
    const payload = Object.fromEntries(new FormData(loginForm).entries());
    const endpoint = `${apiBase}${loginForm.dataset.api}`;

    if (statusElement) {
      statusElement.dataset.state = "loading";
      statusElement.textContent = "Verifying credentials...";
    }
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      const result = rawResponse ? JSON.parse(rawResponse) : {};
      if (!response.ok) throw new Error(result.message || "Login failed");

      sessionStorage.setItem("authToken", result.data.token);
      sessionStorage.setItem("authUser", JSON.stringify(result.data.user));
      localStorage.setItem("authToken", result.data.token);
      localStorage.setItem("authUser", JSON.stringify(result.data.user));
      sessionStorage.setItem(
        "adminLoginToast",
        JSON.stringify({
          name: result.data.user.name,
          role: result.data.user.role,
          timestamp: Date.now(),
        })
      );

      if (statusElement) {
        statusElement.dataset.state = "success";
        statusElement.textContent = `Welcome back, ${result.data.user.name}. Login successful.`;
      }

      if (result.data.user.mustChangePassword) {
        window.location.href = "admin-force-password-change.html";
      } else if (loginForm.dataset.api === "/api/admin/login") {
        window.location.href = getRoleHome(result.data.user);
      } else if (loginForm.dataset.redirect) {
        window.location.href = loginForm.dataset.redirect;
      }
    } catch (error) {
      const isNetworkError = error instanceof TypeError && /fetch/i.test(error.message || "");

      if (statusElement) {
        statusElement.dataset.state = "error";
        const rawMessage = error.message || "";
        const looksInternal =
          /prisma|findUnique|datasource|invocation|stack|backend\\src|backend\/src|at\s+/i.test(rawMessage);

        statusElement.textContent = isNetworkError
          ? "Unable to reach the login server. Please start the backend and try again."
          : error.message === "Unexpected end of JSON input"
          ? "The login server returned an invalid response. Please try again after the backend is restarted."
          : looksInternal
          ? "Login is temporarily unavailable because the server is not configured correctly."
          : rawMessage || "Unable to sign in right now.";
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
