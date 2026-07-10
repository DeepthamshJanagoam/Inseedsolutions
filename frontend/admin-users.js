const adminUsersRoot = document.querySelector("[data-admin-users]");

if (adminUsersRoot) {
  const session = window.AdminAuth?.requirePage("users");

  if (session) {
    const apiBase = window.APP_API_BASE || "";
    const { token } = session;
    const state = { users: [], editingId: "" };

    const getHeaders = () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    });

    const parseJsonResponse = async (response) => {
      const raw = await response.text();
      return raw ? JSON.parse(raw) : {};
    };

    const roleLabel = (role) =>
      role === "TRAINEE_OPERATOR"
        ? "Trainee Entry Operator"
        : role === "PLACEMENT_OPERATOR"
        ? "Placement Entry Operator"
        : "Admin";

    const renderMetrics = () => {
      const active = state.users.filter((item) => item.isActive).length;
      const mustChange = state.users.filter((item) => item.mustChangePassword).length;
      const operators = state.users.filter((item) => item.role !== "ADMIN").length;

      document.getElementById("usersMetricTotal").textContent = state.users.length;
      document.getElementById("usersMetricActive").textContent = active;
      document.getElementById("usersMetricPassword").textContent = mustChange;
      document.getElementById("usersMetricOperators").textContent = operators;
      document.getElementById("adminUsersTableCount").textContent = `${state.users.length} record${state.users.length === 1 ? "" : "s"}`;
    };

    const resetForm = () => {
      const form = document.getElementById("adminUsersForm");
      form?.reset();
      window.AdminAuth?.clearEditFocus?.();
      document.getElementById("adminUserEditId").value = "";
      state.editingId = "";
      document.getElementById("adminUsersCancelButton").hidden = true;
      document.getElementById("userFormHeading").textContent = "Create a new user";
      document.getElementById("adminUsersSubmitButton").textContent = "Save User";
      const passwordField = document.getElementById("adminUserPasswordField");
      const passwordInput = passwordField?.querySelector("input");
      if (passwordField) passwordField.hidden = false;
      if (passwordInput) {
        passwordInput.required = true;
        passwordInput.value = "";
      }
      document.getElementById("adminUsersFormStatus").textContent = "";
    };

    const renderTable = () => {
      const body = document.getElementById("adminUsersTableBody");
      renderMetrics();

      body.innerHTML = state.users
        .map(
          (user) => `
            <tr>
              <td>
                <strong>${user.name}</strong>
                <small>${user.email}</small>
              </td>
              <td>${roleLabel(user.role)}</td>
              <td><span class="status-badge ${user.isActive ? "placed" : "rejected"}">${user.isActive ? "Active" : "Inactive"}</span></td>
              <td><span class="status-badge ${user.mustChangePassword ? "interviewing" : "placed"}">${user.mustChangePassword ? "Reset required" : "Updated"}</span></td>
              <td>
                <div class="table-action-row">
                  <button class="table-action-link" type="button" data-edit-user="${user.id}">Edit</button>
                  <button class="table-action-link" type="button" data-reset-user="${user.id}">Reset Password</button>
                </div>
              </td>
            </tr>
          `
        )
        .join("");
    };

    const loadUsers = async () => {
      const response = await fetch(`${apiBase}${adminUsersRoot.dataset.usersApi}`, {
        headers: getHeaders(),
      });
      const result = await parseJsonResponse(response);

      if (!response.ok) throw new Error(result.message || "Unable to load users");

      state.users = result.data || [];
      renderTable();
      document.getElementById("usersModuleMeta").textContent = "Protected user records loaded successfully.";
    };

    const fillForm = (user) => {
      const form = document.getElementById("adminUsersForm");
      form.name.value = user.name;
      form.email.value = user.email;
      form.role.value = user.role;
      form.isActive.value = String(Boolean(user.isActive));
      form.mustChangePassword.value = String(Boolean(user.mustChangePassword));
      document.getElementById("adminUserEditId").value = user.id;
      state.editingId = user.id;
      document.getElementById("adminUsersCancelButton").hidden = false;
      document.getElementById("userFormHeading").textContent = `Edit ${user.name}`;
      document.getElementById("adminUsersSubmitButton").textContent = "Update User";
      const passwordField = document.getElementById("adminUserPasswordField");
      const passwordInput = passwordField?.querySelector("input");
      if (passwordField) passwordField.hidden = true;
      if (passwordInput) {
        passwordInput.required = false;
        passwordInput.value = "";
      }
      document.getElementById("adminUsersFormStatus").textContent = `Editing ${user.name}`;
      window.AdminAuth?.focusEditTarget?.(document.querySelector(".trainee-form-panel"));
    };

    document.getElementById("adminUsersLogoutButton")?.addEventListener("click", window.AdminAuth.logout);
    document.getElementById("adminUsersCancelButton")?.addEventListener("click", resetForm);

    document.getElementById("adminUsersForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitButton = document.getElementById("adminUsersSubmitButton");
      const status = document.getElementById("adminUsersFormStatus");
      const payload = Object.fromEntries(new FormData(form).entries());
      const isEditing = Boolean(state.editingId);

      if (!form.reportValidity()) return;

      if (status) status.textContent = isEditing ? "Updating user..." : "Creating user...";
      if (submitButton) submitButton.disabled = true;

      try {
        const endpoint = isEditing
          ? `${apiBase}${adminUsersRoot.dataset.usersApi}/${state.editingId}`
          : `${apiBase}${adminUsersRoot.dataset.usersApi}`;
        const response = await fetch(endpoint, {
          method: isEditing ? "PUT" : "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        const result = await parseJsonResponse(response);
        if (!response.ok) throw new Error(result.message || "Unable to save user");

        resetForm();
        await loadUsers();
        if (status) status.textContent = isEditing ? "User updated successfully." : "User created successfully.";
      } catch (error) {
        if (status) status.textContent = error.message || "Unable to save user.";
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    document.getElementById("adminUsersTableBody")?.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-edit-user]");
      if (editButton) {
        const user = state.users.find((item) => item.id === editButton.getAttribute("data-edit-user"));
        if (user) fillForm(user);
        return;
      }

      const resetButton = event.target.closest("[data-reset-user]");
      if (!resetButton) return;

      const user = state.users.find((item) => item.id === resetButton.getAttribute("data-reset-user"));
      if (!user) return;

      const temporaryPassword = window.prompt(`Set a temporary password for ${user.name}:`);
      if (!temporaryPassword) return;
      if (temporaryPassword.trim().length < 8) {
        document.getElementById("adminUsersFormStatus").textContent = "Temporary password must be at least 8 characters long.";
        return;
      }

      const response = await fetch(`${apiBase}${adminUsersRoot.dataset.usersApi}/${user.id}/reset-password`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ password: temporaryPassword }),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok) {
        document.getElementById("adminUsersFormStatus").textContent = result.message || "Unable to reset password.";
        return;
      }

      document.getElementById("adminUsersFormStatus").textContent = "Password reset successfully.";
      await loadUsers();
    });

    loadUsers().catch((error) => {
      document.getElementById("usersModuleMeta").textContent = error.message || "Unable to load user records.";
    });
  }
}
