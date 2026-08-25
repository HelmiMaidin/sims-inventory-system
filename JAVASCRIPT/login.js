

const SUPABASE_URL =
  "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const loginForm =
  document.getElementById("loginForm");

const usernameInput =
  document.getElementById("username");

const passwordInput =
  document.getElementById("password");

const errorMessage =
  document.getElementById("errorMessage");

const showPasswordButton =
  document.getElementById("showPasswordButton");

const loginButton =
  document.getElementById("loginButton");

let supabaseClient = null;

function showMessage(message, type) {
  errorMessage.textContent = message;
  errorMessage.className = `message ${type}`;
}

function redirectByRole(role) {
  if (role === "Admin") {
    window.location.href = "admin-dashboard.html";
    return;
  }

  if (role === "Supervisor") {
    window.location.href = "supervisor-dashboard.html";
    return;
  }

  window.location.href = "staff-dashboard.html";
}

/* Checks whether the Supabase library loaded from login.html. */
if (!window.supabase) {
  showMessage(
    "Supabase library could not load. Please check your internet connection and refresh the page.",
    "error-message"
  );
} else {
  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
}

showPasswordButton.addEventListener("click", function () {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    showPasswordButton.textContent = "Hide";
    return;
  }

  passwordInput.type = "password";
  showPasswordButton.textContent = "Show";
});

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!supabaseClient) {
    showMessage(
      "Supabase connection is unavailable. Refresh the page and try again.",
      "error-message"
    );

    return;
  }

  const username =
    usernameInput.value.trim().toLowerCase();

  const password =
    passwordInput.value;

  if (username === "" || password === "") {
    showMessage(
      "Please enter your username and password.",
      "error-message"
    );

    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";
  showMessage("", "");

  try {
    const accountResponse =
      await supabaseClient
        .from("login_accounts")
        .select("auth_email")
        .eq("username", username)
        .maybeSingle();

    if (accountResponse.error) {
      console.error(accountResponse.error);

      throw new Error(
        `Database login lookup failed: ${accountResponse.error.message}`
      );
    }

    if (!accountResponse.data) {
      throw new Error("Incorrect username or password.");
    }

    const signInResponse =
      await supabaseClient.auth.signInWithPassword({
        email: accountResponse.data.auth_email,
        password: password
      });

    if (signInResponse.error || !signInResponse.data.user) {
      console.error(signInResponse.error);

      throw new Error("Incorrect username or password.");
    }

    const profileResponse =
      await supabaseClient
        .from("profiles")
        .select(
          "id, username, full_name, role, active, must_change_password"
        )
        .eq("id", signInResponse.data.user.id)
        .single();

    if (profileResponse.error || !profileResponse.data) {
      console.error(profileResponse.error);

      await supabaseClient.auth.signOut();

      throw new Error(
        "Your SIMS profile could not be loaded."
      );
    }

    const profile = profileResponse.data;

    if (!profile.active) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "This account has been deactivated. Please contact the administrator."
      );
    }

    const activeUser = {
      id: profile.id,
      username: profile.username,
      name: profile.full_name,
      role: profile.role,
      mustChangePassword: profile.must_change_password
    };

    localStorage.setItem(
      "currentUser",
      JSON.stringify(activeUser)
    );

    await supabaseClient
      .from("activity_log")
      .insert({
        user_id: profile.id,
        user_name: profile.full_name,
        role: profile.role,
        activity: "User Login",
        details: `${profile.username} logged into the system.`
      });

    showMessage(
      "Login successful. Opening dashboard...",
      "success-message"
    );

    setTimeout(function () {
      redirectByRole(profile.role);
    }, 500);
  } catch (error) {
    console.error(error);

    showMessage(
      error.message || "Unable to log in. Please try again.",
      "error-message"
    );
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
});