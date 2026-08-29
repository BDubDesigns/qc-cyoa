/**
 * Account screen: minimal username/password signup + login (temporary auth).
 * Also lists the current user's games once authenticated. This is the only
 * surface that will need to change when better-auth replaces the seam.
 */
import { api, ApiError, type User, type GameSummary } from "./api";
import { navBar, clearAndMount, panel, notice } from "./ui";
import { navigate } from "./router";

export async function mountAccount(root: HTMLElement): Promise<void> {
  clearAndMount(root, navBar("account"));

  const container = document.createElement("div");
  container.className = "account-layout";

  // Session check first.
  let current: User | null = null;
  try {
    const { user } = await api.session();
    current = user;
  } catch {
    current = null;
  }

  if (current) {
    container.appendChild(accountPanel(current));
  } else {
    container.appendChild(authPanel());
  }
  root.appendChild(container);
}

function authPanel(): HTMLElement {
  const sec = panel("Sign in or create an account", document.createElement("div"));
  const form = document.createElement("form");
  form.className = "auth-form";

  const username = textInput("username", "Username");
  const password = textInput("password", "Password (min 8 chars)");
  password.input.type = "password";

  const status = document.createElement("div");
  status.className = "auth-status";

  const row = document.createElement("div");
  row.className = "form-row";
  const loginBtn = document.createElement("button");
  loginBtn.type = "submit";
  loginBtn.className = "primary";
  loginBtn.textContent = "Log in";
  const signupBtn = document.createElement("button");
  signupBtn.type = "button";
  signupBtn.className = "ghost";
  signupBtn.textContent = "Sign up";
  row.append(loginBtn, signupBtn);

  form.append(username.label, password.label, row, status);

  loginBtn.addEventListener("click", async () => {
    status.replaceChildren();
    try {
      await api.login(username.input.value, password.input.value);
      location.reload();
    } catch (err) {
      showStatus(status, err);
    }
  });

  signupBtn.addEventListener("click", async () => {
    status.replaceChildren();
    try {
      await api.signup(username.input.value, password.input.value);
      location.reload();
    } catch (err) {
      showStatus(status, err);
    }
  });

  sec.appendChild(form);
  return sec;
}

function accountPanel(user: User): HTMLElement {
  const sec = panel(`Signed in as ${user.username}`, document.createElement("div"));
  const who = document.createElement("p");
  who.className = "muted";
  who.textContent = `User id: ${user.id}`;
  sec.appendChild(who);

  const myTitle = document.createElement("h3");
  myTitle.className = "subheading";
  myTitle.textContent = "My stories";
  sec.appendChild(myTitle);

  const myList = document.createElement("div");
  myList.className = "game-list";
  sec.appendChild(myList);

  api
    .myGames()
    .then(({ games }) => {
      if (games.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "You haven't authored anything yet. Open the Studio to start.";
        myList.appendChild(empty);
        return;
      }
      for (const g of games) myList.appendChild(myGameRow(g));
    })
    .catch((err) => notice(myList, `Couldn't load your stories: ${message(err)}`, "error"));

  const logout = document.createElement("button");
  logout.className = "ghost";
  logout.textContent = "Log out";
  logout.addEventListener("click", async () => {
    try {
      await api.logout();
    } finally {
      location.hash = "#/account";
      location.reload();
    }
  });
  sec.appendChild(logout);
  return sec;
}

function myGameRow(g: GameSummary): HTMLElement {
  const row = document.createElement("div");
  row.className = "my-game-row";
  const info = document.createElement("span");
  info.textContent = `${g.title}${g.is_published ? "" : " (draft)"}`;
  const edit = document.createElement("a");
  edit.className = "link-btn";
  edit.textContent = "Edit";
  edit.href = "#";
  edit.addEventListener("click", (e) => {
    e.preventDefault();
    navigate({ name: "studio", game: g.id });
  });
  row.append(info, edit);
  return row;
}

/* ------------------------------ form helpers ----------------------------- */

function textInput(name: string, placeholder: string): { label: HTMLLabelElement; input: HTMLInputElement } {
  const label = document.createElement("label");
  label.className = "field";
  const span = document.createElement("span");
  span.textContent = placeholder;
  const input = document.createElement("input");
  input.name = name;
  input.autocomplete = name === "password" ? "current-password" : "username";
  label.append(span, input);
  return { label, input };
}

function showStatus(status: HTMLElement, err: unknown): void {
  notice(status, message(err), "error");
}

function message(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : String(err);
}