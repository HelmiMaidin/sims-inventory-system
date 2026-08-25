const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let users = [];

const adminName = document.getElementById("adminName");
const sidebarAdminName = document.getElementById("sidebarAdminName");

const adminAvatar = document.getElementById("adminAvatar");
const sidebarAdminAvatar =
  document.getElementById("sidebarAdminAvatar");

const logoutButton = document.getElementById("logoutButton");

const message = document.getElementById("message");
const emptyMessage = document.getElementById("emptyMessage");

const adminAccountForm =
  document.getElementById("adminAccountForm");

const adminUsername =
  document.getElementById("adminUsername");

const adminPassword =
  document.getElementById("adminPassword");

const showAdminPasswordButton =
  document.getElementById("showAdminPasswordButton");

const addUserForm =
  document.getElementById("addUserForm");

const newName = document.getElementById("newName");
const newUsername = document.getElementById("newUsername");
const newPassword = document.getElementById("newPassword");
const newRole = document.getElementById("newRole");

const showNewPasswordButton =
  document.getElementById("showNewPasswordButton");

const userTableBody =
  document.getElementById("userTableBody");

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

function togglePassword(input, button) {
  if (input.type === "password") {
    input.type = "text";
    button.textContent = "Hide";
  } else {
    input.type = "password";
    button.textContent = "Show";
  }
}

async function getFunctionErrorMessage(error) {
  let errorText =
    "The user-management service could not complete this request.";

  if (!error) {
    return errorText;
  }

  if (error.context) {
    try {
      const response = error.context.clone
        ? error.context.clone()
        : error.context;

      const errorBody = await response.json();

      return (
        errorBody.error ||
        errorBody.message ||
        errorText
      );
    } catch (responseError) {
      // Uses the fallback message below.
    }
  }

  return error.message || errorText;
}

async function callManageUser(action, details) {
  const { data, error } =
    await supabaseClient.functions.invoke(
      "manage-user",
      {
        body: {
          action,
          ...details
        }
      }
    );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(error)
    );
  }

  if (!data || data.success !== true) {
    throw new Error(
      data?.error || "The request could not be completed."
    );
  }

  return data;
}

function displayUsers() {
  userTableBody.innerHTML = "";

  if (users.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  users.forEach(function (user) {
    const isActive = user.active === true;

    userTableBody.innerHTML += `
      <tr>
        <td>${escapeHtml(user.full_name)}</td>
        <td>${escapeHtml(user.username)}</td>

        <td>
          <select id="role-${user.id}" class="role-select">
            <option
              value="Staff"
              ${user.role === "Staff" ? "selected" : ""}
            >
              Staff
            </option>

            <option
              value="Supervisor"
              ${user.role === "Supervisor" ? "selected" : ""}
            >
              Supervisor
            </option>
          </select>
        </td>

        <td>
          <span class="status ${
            isActive ? "active-status" : "inactive-status"
          }">
            ${isActive ? "Active" : "Inactive"}
          </span>
        </td>

        <td>
          <div class="password-cell">
            <input
              id="password-${user.id}"
              type="password"
              minlength="6"
              placeholder="New password"
            >

            <button
              type="button"
              class="show-password-button"
              data-show-password="${user.id}"
            >
              Show
            </button>
          </div>
        </td>

        <td>
          <div class="action-buttons">
            <button
              type="button"
              class="action-button"
              data-save-role="${user.id}"
            >
              Save Role
            </button>

            <button
              type="button"
              class="action-button"
              data-reset-password="${user.id}"
            >
              Save Password
            </button>

            <button
              type="button"
              class="${
                isActive
                  ? "delete-button"
                  : "restore-button"
              }"
              data-toggle-status="${user.id}"
            >
              ${isActive ? "Deactivate" : "Activate"}
            </button>

            <button
              type="button"
              class="permanent-delete-button"
              data-delete-user="${user.id}"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

async function loadUsers() {
  const { data, error } =
    await supabaseClient.rpc("admin_list_users");

  if (error) {
    showMessage(
      `Unable to load users: ${error.message}`,
      "error"
    );

    return;
  }

  users = data || [];
  displayUsers();
}

async function saveUserRole(userId) {
  const user = users.find(function (item) {
    return item.id === userId;
  });

  if (!user) {
    return;
  }

  const roleInput =
    document.getElementById(`role-${userId}`);

  try {
    await callManageUser("update_user", {
      userId,
      role: roleInput.value,
      active: user.active
    });

    user.role = roleInput.value;

    showMessage(
      `${user.full_name}'s privilege was updated successfully.`,
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function saveUserPassword(userId) {
  const user = users.find(function (item) {
    return item.id === userId;
  });

  if (!user) {
    return;
  }

  const passwordInput =
    document.getElementById(`password-${userId}`);

  const password = passwordInput.value;

  if (password.length < 6) {
    showMessage(
      "New passwords must contain at least 6 characters.",
      "error"
    );

    return;
  }

  try {
    await callManageUser("reset_password", {
      userId,
      password
    });

    passwordInput.value = "";

    showMessage(
      `Password updated successfully for ${user.full_name}.`,
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function toggleUserStatus(userId) {
  const user = users.find(function (item) {
    return item.id === userId;
  });

  if (!user) {
    return;
  }

  const newStatus = !user.active;
  const actionText = newStatus ? "activate" : "deactivate";

  if (
    !confirm(
      `Are you sure you want to ${actionText} "${user.full_name}"?`
    )
  ) {
    return;
  }

  try {
    await callManageUser("update_user", {
      userId,
      role: user.role,
      active: newStatus
    });

    user.active = newStatus;

    displayUsers();

    showMessage(
      `${user.full_name} was ${
        newStatus ? "activated" : "deactivated"
      }.`,
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function deleteUser(userId) {
  const user = users.find(function (item) {
    return item.id === userId;
  });

  if (!user) {
    return;
  }

  const confirmed = confirm(
    `Permanently delete "${user.full_name}"?\n\nThey will no longer be able to log in. This cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  try {
    await callManageUser("delete_user", {
      userId
    });

    users = users.filter(function (item) {
      return item.id !== userId;
    });

    displayUsers();

    showMessage(
      `${user.full_name}'s account was permanently deleted.`,
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }
}

adminAccountForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const username =
      adminUsername.value.trim().toLowerCase();

    const password = adminPassword.value;

    if (!username) {
      showMessage("Admin username is required.", "error");
      return;
    }

    if (password && password.length < 6) {
      showMessage(
        "New passwords must contain at least 6 characters.",
        "error"
      );

      return;
    }

    try {
      await callManageUser("update_admin_account", {
        username,
        password
      });

      currentUser.username = username;

      localStorage.setItem(
        "currentUser",
        JSON.stringify(currentUser)
      );

      adminPassword.value = "";

      showMessage(
        "Admin account updated successfully.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }
);

addUserForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const fullName = newName.value.trim();
    const username = newUsername.value.trim().toLowerCase();
    const password = newPassword.value;
    const role = newRole.value;

    if (!fullName || !username || !password) {
      showMessage("Please complete every new-user field.", "error");
      return;
    }

    if (password.length < 6) {
      showMessage(
        "Temporary passwords must contain at least 6 characters.",
        "error"
      );

      return;
    }

    try {
      await callManageUser("create_user", {
        fullName,
        username,
        password,
        role
      });

      addUserForm.reset();

      showMessage(
        `${fullName} was created as ${role}.`,
        "success"
      );

      await loadUsers();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }
);

userTableBody.addEventListener(
  "click",
  function (event) {
    const showButton =
      event.target.closest("[data-show-password]");

    if (showButton) {
      const userId = showButton.dataset.showPassword;

      togglePassword(
        document.getElementById(`password-${userId}`),
        showButton
      );

      return;
    }

    const roleButton =
      event.target.closest("[data-save-role]");

    if (roleButton) {
      saveUserRole(roleButton.dataset.saveRole);
      return;
    }

    const passwordButton =
      event.target.closest("[data-reset-password]");

    if (passwordButton) {
      saveUserPassword(
        passwordButton.dataset.resetPassword
      );

      return;
    }

    const statusButton =
      event.target.closest("[data-toggle-status]");

    if (statusButton) {
      toggleUserStatus(
        statusButton.dataset.toggleStatus
      );

      return;
    }

    const deleteButton =
      event.target.closest("[data-delete-user]");

    if (deleteButton) {
      deleteUser(deleteButton.dataset.deleteUser);
    }
  }
);

showAdminPasswordButton.addEventListener(
  "click",
  function () {
    togglePassword(
      adminPassword,
      showAdminPasswordButton
    );
  }
);

showNewPasswordButton.addEventListener(
  "click",
  function () {
    togglePassword(
      newPassword,
      showNewPasswordButton
    );
  }
);

logoutButton.addEventListener("click", async function () {
  if (!confirm("Are you sure you want to logout?")) {
    return;
  }

  await supabaseClient.auth.signOut();

  localStorage.removeItem("currentUser");

  window.location.href = "login.html";
});

async function initialisePage() {
  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "login.html";
    return;
  }

  const { data: profile, error: profileError } =
    await supabaseClient
      .from("profiles")
      .select("id, username, full_name, role, active")
      .eq("id", data.session.user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.active !== true ||
    profile.role !== "Admin"
  ) {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return;
  }

  currentUser = {
    id: profile.id,
    username: profile.username,
    name: profile.full_name,
    role: profile.role
  };

  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );

  const firstName =
    currentUser.name.split(" ")[0] || "Admin";

  const initial =
    firstName.charAt(0).toUpperCase() || "A";

  adminName.textContent = currentUser.name;
  sidebarAdminName.textContent = currentUser.name;

  adminAvatar.textContent = initial;
  sidebarAdminAvatar.textContent = initial;

  adminUsername.value = currentUser.username;

  await loadUsers();
}

initialisePage();