const forcePasswordChangeRoot = document.querySelector("[data-force-password-change]");

if (forcePasswordChangeRoot) {
  const session = window.AdminAuth?.requirePage("force-password-change");

  if (session) {
    const apiBase = window.APP_API_BASE || "";
    const { token, user } = session;
    const form = document.getElementById("forcePasswordChangeForm");
    const statusElement = document.getElementById("forcePasswordStatus");

    document.getElementById("adminPasswordLogoutButton")?.addEventListener("click", window.AdminAuth.logout);

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = form.querySelector("button[type='submit']");
      const payload = Object.fromEntries(new FormData(form).entries());

      if (statusElement) statusElement.textContent = "Updating password...";
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch(`${apiBase}${forcePasswordChangeRoot.dataset.api}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const raw = await response.text();
        const result = raw ? JSON.parse(raw) : {};

        if (!response.ok) {
          throw new Error(result.message || "Unable to update password");
        }

        sessionStorage.setItem("authToken", result.data.token);
        sessionStorage.setItem("authUser", JSON.stringify(result.data.user));
        if (statusElement) statusElement.textContent = "Password updated successfully. Redirecting...";

        window.location.href = window.AdminAuth.roleHome(user.role);
      } catch (error) {
        if (statusElement) statusElement.textContent = error.message || "Unable to update password.";
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
}
