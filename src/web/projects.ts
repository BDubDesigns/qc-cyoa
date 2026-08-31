/**
 * Project shell + Asset Library (Issue #5 — Studio Slice 0).
 *
 * Hierarchy: Project -> Asset (logical) -> AssetAppearance (state)
 * -> AssetVariant (generated/uploaded attempt, one is active).
 *
 * This module mounts at `#/projects` (list) and `#/project?project=<id>`
 * (detail with asset browser). Assets are grouped lazily per appearance so
 * the list stays usable as it grows. All API calls are same-origin with
 * the httpOnly session cookie.
 */

import { api, ApiError, type Project, type Asset, type Appearance, type Variant } from "./api";
import { navBar, clearAndMount, panel, notice } from "./ui";
import { navigate } from "./router";

// ---------------------------------------------------------------------------
// Projects list — #/projects
// ---------------------------------------------------------------------------

export async function mountProjects(root: HTMLElement): Promise<void> {
  clearAndMount(root, navBar("projects"));
  const container = document.createElement("div");
  container.className = "projects-shell";
  root.appendChild(container);

  const head = document.createElement("div");
  head.className = "panel app-panel";
  const h = document.createElement("h2");
  h.textContent = "Projects";
  const sub = document.createElement("p");
  sub.className = "muted";
  sub.textContent = "Create a project, then open it to manage its assets.";
  head.append(h, sub);

  const createRow = document.createElement("div");
  createRow.className = "projects-create";
  const titleInput = document.createElement("input");
  titleInput.placeholder = "New project title";
  titleInput.className = "input";
  const createBtn = document.createElement("button");
  createBtn.className = "primary";
  createBtn.textContent = "Create project";
  createBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    if (!title) {
      notice(container, "Title is required.", "error");
      return;
    }
    createBtn.disabled = true;
    try {
      const { project } = await api.createProject(title);
      titleInput.value = "";
      // reload list
      await loadProjects();
      navigate({ name: "project", projectId: project.id });
    } catch (err) {
      notice(container, message(err), "error");
    } finally {
      createBtn.disabled = false;
    }
  });
  createRow.append(titleInput, createBtn);
  head.appendChild(createRow);
  container.appendChild(head);

  const listSec = document.createElement("div");
  listSec.className = "panel app-panel";
  const listHead = document.createElement("h3");
  listHead.className = "section-title";
  listHead.textContent = "Your projects";
  listSec.appendChild(listHead);
  const list = document.createElement("div");
  list.className = "project-list";
  listSec.appendChild(list);
  container.appendChild(listSec);

  async function loadProjects(): Promise<void> {
    list.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "muted";
    loading.textContent = "Loading…";
    list.appendChild(loading);
    try {
      const { projects } = await api.listProjects();
      list.replaceChildren();
      if (projects.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No projects yet. Create one above.";
        list.appendChild(empty);
        return;
      }
      for (const p of projects) list.appendChild(projectRow(p));
    } catch (err) {
      list.replaceChildren();
      if (err instanceof ApiError && err.status === 401) {
        const warn = document.createElement("p");
        warn.className = "notice-line error";
        warn.textContent = "Sign in (Account) to manage projects.";
        const a = document.createElement("a");
        a.href = "#/account";
        a.textContent = "Go to Account →";
        a.className = "primary";
        list.append(warn, a);
        return;
      }
      notice(list, message(err), "error");
    }
  }

  await loadProjects();
}

function projectRow(p: Project): HTMLElement {
  const row = document.createElement("div");
  row.className = "project-row";
  const info = document.createElement("div");
  info.className = "project-info";
  const title = document.createElement("strong");
  title.textContent = p.title;
  const meta = document.createElement("span");
  meta.className = "muted";
  meta.textContent = `— ${new Date(p.updated_at).toLocaleString()}`;
  info.append(title, meta);
  if (p.description) {
    const desc = document.createElement("p");
    desc.className = "muted project-desc";
    desc.textContent = p.description;
    info.appendChild(desc);
  }
  const open = document.createElement("button");
  open.className = "primary ghost";
  open.textContent = "Open →";
  open.addEventListener("click", () => navigate({ name: "project", projectId: p.id }));
  row.append(info, open);
  return row;
}

// ---------------------------------------------------------------------------
// Project detail + Asset Library — #/project?project=<id>
// ---------------------------------------------------------------------------

export async function mountProjectDetail(root: HTMLElement, projectId: string): Promise<void> {
  clearAndMount(root, navBar("project"));

  if (!projectId) {
    const sec = panel("Project not found", (() => {
      const d = document.createElement("div");
      d.textContent = "Missing project id.";
      return d;
    })());
    root.appendChild(sec);
    return;
  }

  const container = document.createElement("div");
  container.className = "project-shell";
  root.appendChild(container);

  let project: Project;
  try {
    const res = await api.getProject(projectId);
    project = res.project;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const sec = panel("Sign in required", (() => {
        const d = document.createElement("div");
        const p = document.createElement("p");
        p.className = "notice-line error";
        p.textContent = "Sign in to open this project.";
        const a = document.createElement("a");
        a.href = "#/account";
        a.textContent = "Go to Account →";
        a.className = "primary";
        d.append(p, a);
        return d;
      })());
      root.appendChild(sec);
      return;
    }
    const sec = panel("Project not found", (() => {
      const d = document.createElement("div");
      d.textContent = message(err);
      return d;
    })());
    root.appendChild(sec);
    return;
  }

  // Project header (editable)
  const head = document.createElement("div");
  head.className = "panel app-panel project-head";
  const h = document.createElement("h2");
  h.textContent = project.title;
  const subtitle = document.createElement("p");
  subtitle.className = "muted";
  subtitle.textContent = project.description || "Asset library for this project.";
  head.append(h, subtitle);

  const editRow = document.createElement("div");
  editRow.className = "project-edit";
  const titleEdit = document.createElement("input");
  titleEdit.value = project.title;
  titleEdit.className = "input";
  const descEdit = document.createElement("input");
  descEdit.value = project.description ?? "";
  descEdit.placeholder = "Description (optional)";
  descEdit.className = "input";
  const saveBtn = document.createElement("button");
  saveBtn.className = "primary ghost";
  saveBtn.textContent = "Save";
  const backBtn = document.createElement("button");
  backBtn.className = "ghost";
  backBtn.textContent = "← All projects";
  backBtn.addEventListener("click", () => navigate({ name: "projects" }));
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    try {
      const { project: updated } = await api.updateProject(project.id, titleEdit.value.trim(), descEdit.value.trim());
      project = updated;
      h.textContent = project.title;
      subtitle.textContent = project.description || "Asset library for this project.";
      notice(head, "Saved.", "info");
    } catch (err) {
      notice(head, message(err), "error");
    } finally {
      saveBtn.disabled = false;
    }
  });
  editRow.append(backBtn, titleEdit, descEdit, saveBtn);
  head.appendChild(editRow);
  container.appendChild(head);

  // Asset creation
  const createSec = document.createElement("div");
  createSec.className = "panel app-panel";
  const createTitle = document.createElement("h3");
  createTitle.textContent = "New asset";
  createTitle.className = "section-title";
  createSec.appendChild(createTitle);
  const assetName = document.createElement("input");
  assetName.placeholder = "Asset name (e.g. Sasquatch, Cup, Bedroom Background)";
  assetName.className = "input";
  const assetCat = document.createElement("select");
  for (const cat of ["character", "prop", "background", "inventory item", "clue", "effect", "other"]) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    assetCat.appendChild(opt);
  }
  const assetDesc = document.createElement("input");
  assetDesc.placeholder = "Description / notes (optional)";
  assetDesc.className = "input";
  const addAssetBtn = document.createElement("button");
  addAssetBtn.className = "primary";
  addAssetBtn.textContent = "Add asset";
  const createRow2 = document.createElement("div");
  createRow2.className = "projects-create";
  createRow2.append(assetName, assetCat, assetDesc, addAssetBtn);
  createSec.appendChild(createRow2);
  container.appendChild(createSec);

  // Asset list — each asset shows its appearances + variants
  const assetListSec = document.createElement("div");
  assetListSec.className = "panel app-panel";
  const listTitle = document.createElement("h3");
  listTitle.className = "section-title";
  listTitle.textContent = "Assets";
  assetListSec.appendChild(listTitle);
  const assetList = document.createElement("div");
  assetList.className = "asset-list";
  assetListSec.appendChild(assetList);
  container.appendChild(assetListSec);

  addAssetBtn.addEventListener("click", async () => {
    const name = assetName.value.trim();
    if (!name) {
      notice(createSec, "Asset name is required.", "error");
      return;
    }
    addAssetBtn.disabled = true;
    try {
      await api.createAsset(project.id, name, assetCat.value, assetDesc.value.trim());
      assetName.value = "";
      assetDesc.value = "";
      await loadAssets();
    } catch (err) {
      notice(createSec, message(err), "error");
    } finally {
      addAssetBtn.disabled = false;
    }
  });

  async function loadAssets(): Promise<void> {
    assetList.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "muted";
    loading.textContent = "Loading assets…";
    assetList.appendChild(loading);
    try {
      const { assets } = await api.listAssets(project.id);
      assetList.replaceChildren();
      if (assets.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No assets yet. Add one above — e.g. Sasquatch as character, then add appearances like “Hiding Badly”.";
        assetList.appendChild(empty);
        return;
      }
      for (const asset of assets) {
        const card = await buildAssetCard(project.id, asset);
        assetList.appendChild(card);
      }
    } catch (err) {
      assetList.replaceChildren();
      notice(assetList, message(err), "error");
    }
  }

  await loadAssets();
}

async function buildAssetCard(projectId: string, asset: Asset): Promise<HTMLElement> {
  const card = document.createElement("div");
  card.className = "asset-card";

  const head = document.createElement("div");
  head.className = "asset-head";
  const name = document.createElement("strong");
  name.textContent = asset.name;
  const cat = document.createElement("span");
  cat.className = "asset-cat";
  cat.textContent = `(${asset.category})`;
  const delBtn = document.createElement("button");
  delBtn.className = "ghost danger";
  delBtn.textContent = "Delete asset";
  delBtn.addEventListener("click", async () => {
    if (!confirm(`Delete asset "${asset.name}" and all its appearances/variants?`)) return;
    try {
      await api.deleteAsset(projectId, asset.id);
      card.remove();
    } catch (err) {
      notice(card, message(err), "error");
    }
  });
  head.append(name, cat, delBtn);
  if (asset.description) {
    const desc = document.createElement("p");
    desc.className = "muted asset-desc";
    desc.textContent = asset.description;
    head.appendChild(desc);
  }
  card.appendChild(head);

  // Appearances for this asset
  const appearancesWrap = document.createElement("div");
  appearancesWrap.className = "appearances";
  card.appendChild(appearancesWrap);

  const appearanceForm = document.createElement("div");
  appearanceForm.className = "appearance-form";
  const appName = document.createElement("input");
  appName.placeholder = "New appearance (e.g. Hiding Badly, Neutral)";
  appName.className = "input";
  const appDesc = document.createElement("input");
  appDesc.placeholder = "Notes / prompt guidance (optional)";
  appDesc.className = "input";
  const addAppBtn = document.createElement("button");
  addAppBtn.className = "primary ghost";
  addAppBtn.textContent = "+ Add appearance";
  appearanceForm.append(appName, appDesc, addAppBtn);
  card.appendChild(appearanceForm);

  addAppBtn.addEventListener("click", async () => {
    const n = appName.value.trim();
    if (!n) {
      notice(card, "Appearance name is required.", "error");
      return;
    }
    addAppBtn.disabled = true;
    try {
      await api.createAppearance(projectId, asset.id, n, appDesc.value.trim());
      appName.value = "";
      appDesc.value = "";
      await loadAppearances();
    } catch (err) {
      notice(card, message(err), "error");
    } finally {
      addAppBtn.disabled = false;
    }
  });

  async function loadAppearances(): Promise<void> {
    appearancesWrap.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "muted";
    loading.textContent = "Loading appearances…";
    appearancesWrap.appendChild(loading);
    try {
      const { appearances } = await api.listAppearances(projectId, asset.id);
      appearancesWrap.replaceChildren();
      if (appearances.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No appearances yet. Add one to generate or upload variants.";
        appearancesWrap.appendChild(empty);
        return;
      }
      for (const appearance of appearances) {
        const node = await buildAppearanceNode(projectId, asset.id, appearance);
        appearancesWrap.appendChild(node);
      }
    } catch (err) {
      appearancesWrap.replaceChildren();
      notice(appearancesWrap, message(err), "error");
    }
  }

  await loadAppearances();
  return card;
}

async function buildAppearanceNode(projectId: string, assetId: string, appearance: Appearance): Promise<HTMLElement> {
  const node = document.createElement("div");
  node.className = "appearance-node";

  const head = document.createElement("div");
  head.className = "appearance-head";
  const name = document.createElement("strong");
  name.textContent = appearance.name;
  name.title = appearance.description || "";
  const delBtn = document.createElement("button");
  delBtn.className = "ghost danger small";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", async () => {
    if (!confirm(`Delete appearance "${appearance.name}" and all its variants?`)) return;
    try {
      await api.deleteAppearance(projectId, assetId, appearance.id);
      node.remove();
    } catch (err) {
      notice(node, message(err), "error");
    }
  });
  head.append(name, delBtn);
  if (appearance.description) {
    const d = document.createElement("p");
    d.className = "muted appearance-desc";
    d.textContent = appearance.description;
    head.appendChild(d);
  }
  node.appendChild(head);

  // Variants grid
  const variantsWrap = document.createElement("div");
  variantsWrap.className = "variants-grid";
  node.appendChild(variantsWrap);

  // Generate bar
  const genRow = document.createElement("div");
  genRow.className = "gen-row";
  const promptInput = document.createElement("input");
  promptInput.placeholder = "Prompt for generation (e.g. cute sasquatch hiding badly, illustration)…";
  promptInput.className = "input gen-prompt";
  const genBtn = document.createElement("button");
  genBtn.className = "primary";
  genBtn.textContent = "Generate";
  genRow.append(promptInput, genBtn);
  node.appendChild(genRow);

  // Upload bar
  const uploadRow = document.createElement("div");
  uploadRow.className = "upload-row";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
  const uploadBtn = document.createElement("button");
  uploadBtn.className = "ghost";
  uploadBtn.textContent = "Upload";
  uploadBtn.disabled = true;
  fileInput.addEventListener("change", () => {
    uploadBtn.disabled = !fileInput.files || fileInput.files.length === 0;
  });
  uploadRow.append(fileInput, uploadBtn);
  node.appendChild(uploadRow);

  let currentActiveId: string | null = appearance.active_variant_id;

  function variantCard(variant: Variant): HTMLElement {
    const card = document.createElement("div");
    card.className = "variant-card";
    if (variant.id === currentActiveId) card.classList.add("active");

    // thumbnail
    const thumb = document.createElement("div");
    thumb.className = "variant-thumb";
    if (variant.status === "ready" && variant.file_url) {
      const img = document.createElement("img");
      // file fetch is auth-gated (same-origin cookie)
      img.src = variant.file_url;
      img.alt = variant.prompt ?? variant.id;
      img.loading = "lazy";
      thumb.appendChild(img);
    } else if (variant.status === "pending") {
      thumb.textContent = "pending…";
      thumb.classList.add("pending");
    } else if (variant.status === "failed") {
      thumb.textContent = "failed";
      thumb.classList.add("failed");
    } else {
      thumb.textContent = variant.status;
    }
    card.appendChild(thumb);

    const meta = document.createElement("div");
    meta.className = "variant-meta";
    const src = document.createElement("span");
    src.className = "muted small";
    src.textContent = `${variant.source_type} · ${variant.status}${variant.provider_id ? ` · ${variant.provider_id}` : ""}${variant.model_id ? `/${variant.model_id}` : ""}`;
    meta.appendChild(src);
    if (variant.prompt) {
      const p = document.createElement("p");
      p.className = "muted small variant-prompt";
      p.textContent = variant.prompt;
      meta.appendChild(p);
    }
    if (variant.error_message) {
      const err = document.createElement("p");
      err.className = "notice-line error small";
      err.textContent = variant.error_message;
      meta.appendChild(err);
    }
    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "variant-actions";
    if (variant.status === "ready") {
      const activeBtn = document.createElement("button");
      const isActive = variant.id === currentActiveId;
      activeBtn.className = isActive ? "primary small" : "ghost small";
      activeBtn.textContent = isActive ? "✓ Active" : "Set active";
      activeBtn.disabled = isActive;
      activeBtn.addEventListener("click", async () => {
        activeBtn.disabled = true;
        try {
          const { appearance: updated } = await api.setActiveVariant(projectId, assetId, appearance.id, variant.id);
          currentActiveId = updated.active_variant_id;
          // refresh to update active styling
          await loadVariants();
        } catch (err) {
          notice(node, message(err), "error");
        } finally {
          activeBtn.disabled = false;
        }
      });
      actions.appendChild(activeBtn);
    }
    const del = document.createElement("button");
    del.className = "ghost danger small";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      if (!confirm("Delete this variant?")) return;
      try {
        await api.deleteVariant(projectId, assetId, appearance.id, variant.id);
        if (currentActiveId === variant.id) currentActiveId = null;
        card.remove();
      } catch (err) {
        notice(node, message(err), "error");
      }
    });
    actions.appendChild(del);
    card.appendChild(actions);

    return card;
  }

  async function loadVariants(): Promise<void> {
    variantsWrap.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "muted small";
    loading.textContent = "Loading variants…";
    variantsWrap.appendChild(loading);
    try {
      const { variants } = await api.listVariants(projectId, assetId, appearance.id);
      // need fresh active id
      const { appearances } = await api.listAppearances(projectId, assetId);
      const fresh = appearances.find((a) => a.id === appearance.id);
      if (fresh) currentActiveId = fresh.active_variant_id;
      variantsWrap.replaceChildren();
      if (variants.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted small";
        empty.textContent = "No variants yet. Generate or upload one — multiple attempts are kept so you can compare.";
        variantsWrap.appendChild(empty);
        return;
      }
      for (const v of variants) variantsWrap.appendChild(variantCard(v));
    } catch (err) {
      variantsWrap.replaceChildren();
      notice(variantsWrap, message(err), "error");
    }
  }

  genBtn.addEventListener("click", async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      notice(node, "Prompt is required for generation.", "error");
      return;
    }
    genBtn.disabled = true;
    genBtn.textContent = "Generating…";
    try {
      const { variant } = await api.generateVariant(projectId, assetId, appearance.id, prompt);
      // show it immediately even if status is pending/failed
      void loadVariants();
      promptInput.value = "";
      if (variant.status === "failed" && variant.error_message?.includes("SINGULARITY")) {
        notice(node, "Generation requires Singularity integration. See docs/singularity-integration.md.", "error");
      }
    } catch (err) {
      notice(node, message(err), "error");
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = "Generate";
    }
  });

  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading…";
    try {
      const b64 = await fileToBase64(file);
      // b64 is dataUrl; send as imageBase64 so server can derive mime
      await api.uploadVariant(projectId, assetId, appearance.id, b64, file.type || undefined);
      fileInput.value = "";
      uploadBtn.disabled = true;
      await loadVariants();
    } catch (err) {
      notice(node, message(err), "error");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload";
    }
  });

  await loadVariants();
  return node;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("failed to read file"));
    reader.readAsDataURL(file);
  });
}

function message(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : String(err);
}
