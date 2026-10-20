"use strict";

const FIELDS = [
  { key: "patient_id", label: "Patient identifier", aliases: ["patient_id", "patient id", "client_id", "client id", "patient number"] },
  { key: "visit_date", label: "Visit date", aliases: ["visit_date", "visit date", "encounter date", "date of visit"] },
  { key: "systolic_bp", label: "Systolic blood pressure", aliases: ["systolic_bp", "systolic bp", "sbp", "systolic"] },
  { key: "diastolic_bp", label: "Diastolic blood pressure", aliases: ["diastolic_bp", "diastolic bp", "dbp", "diastolic"] },
  { key: "diagnosis", label: "Hypertension diagnosis/status", aliases: ["diagnosis", "hypertension diagnosis", "hypertension status", "diagnosis code"] },
  { key: "medication", label: "Medication / treatment", aliases: ["medication", "treatment", "drug", "prescribed medication"] },
  { key: "follow_up_date", label: "Follow-up date", aliases: ["follow_up_date", "follow up date", "next appointment", "review date"] }
];

const REQUIRED_DEFAULTS = new Set(["patient_id", "visit_date", "systolic_bp", "diastolic_bp"]);
const state = { headers: [], rows: [], source: "", mapping: {}, required: new Set(REQUIRED_DEFAULTS) };
const fileInput = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("The CSV contains a quoted value that was not closed.");
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (rows.length < 2) throw new Error("The CSV needs a header row and at least one data row.");

  const headers = rows[0].map((header, index) => header.trim() || `Column ${index + 1}`);
  if (new Set(headers.map(normalize)).size !== headers.length) {
    throw new Error("The CSV has duplicate column names. Rename the duplicate columns and try again.");
  }
  const data = rows.slice(1).map((values) => headers.map((_, index) => values[index] ?? ""));
  return { headers, rows: data };
}

function matchHeader(field, headers) {
  const aliases = new Set(field.aliases.map(normalize));
  return headers.find((header) => aliases.has(normalize(header))) || "";
}

function loadCsv(text, source) {
  const parsed = parseCsv(text);
  state.headers = parsed.headers;
  state.rows = parsed.rows;
  state.source = source;
  state.mapping = Object.fromEntries(FIELDS.map((field) => [field.key, matchHeader(field, state.headers)]));
  document.querySelector("#error-message").hidden = true;
  document.querySelector("#review").hidden = false;
  renderMapping();
  renderResults();
  document.querySelector("#review").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMapping() {
  const host = document.querySelector("#mapping-grid");
  host.replaceChildren();
  for (const field of FIELDS) {
    const wrapper = document.createElement("div");
    wrapper.className = "mapping-item";
    const label = document.createElement("label");
    label.htmlFor = `mapping-${field.key}`;
    label.textContent = field.label;

    const select = document.createElement("select");
    select.id = `mapping-${field.key}`;
    select.setAttribute("aria-label", `${field.label} column`);
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Not mapped";
    select.append(empty);
    for (const header of state.headers) {
      const option = document.createElement("option");
      option.value = header;
      option.textContent = header;
      select.append(option);
    }
    select.value = state.mapping[field.key];
    select.addEventListener("change", () => {
      state.mapping[field.key] = select.value;
      renderResults();
    });

    const requiredLabel = document.createElement("label");
    requiredLabel.className = "required-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.required.has(field.key);
    checkbox.setAttribute("aria-label", `Require ${field.label}`);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.required.add(field.key);
      else state.required.delete(field.key);
      renderResults();
    });
    requiredLabel.append(checkbox, document.createTextNode("Required"));
    wrapper.append(label, select, requiredLabel);
    host.append(wrapper);
  }
}

function valueFor(row, key) {
  const header = state.mapping[key];
  if (!header) return "";
  return String(row[state.headers.indexOf(header)] ?? "").trim();
}

function isValidDate(value) {
  if (!value) return true;
  let year;
  let month;
  let day;
  let parts = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (parts) {
    [, year, month, day] = parts;
  } else {
    parts = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!parts) return false;
    const first = Number(parts[1]);
    year = parts[3];
    if (first > 12) {
      day = parts[1];
      month = parts[2];
    } else {
      month = parts[1];
      day = parts[2];
    }
  }
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
}

function renderResults() {
  if (!state.rows.length) return;
  const rows = state.rows;
  document.querySelector("#record-count").textContent = rows.length.toLocaleString();
  document.querySelector("#source-name").textContent = state.source;

  const selectedRequired = FIELDS.filter((field) => state.required.has(field.key) && state.mapping[field.key]);
  const requiredCells = selectedRequired.length * rows.length;
  const recordedRequired = selectedRequired.reduce((sum, field) =>
    sum + rows.filter((row) => valueFor(row, field.key) !== "").length, 0);
  const missingRows = rows.filter((row) =>
    selectedRequired.some((field) => valueFor(row, field.key) === "")).length;
  document.querySelector("#completeness").textContent = requiredCells
    ? `${Math.round((recordedRequired / requiredCells) * 100)}%`
    : "—";
  document.querySelector("#completeness-foot").textContent = selectedRequired.length
    ? `${selectedRequired.length} required field${selectedRequired.length === 1 ? "" : "s"} · ${recordedRequired.toLocaleString()} of ${requiredCells.toLocaleString()} values recorded`
    : "Map and mark at least one required field";
  document.querySelector("#incomplete-count").textContent = missingRows.toLocaleString();

  const issues = { visit_date: 0, systolic_bp: 0, diastolic_bp: 0 };
  for (const row of rows) {
    if (state.mapping.visit_date && valueFor(row, "visit_date") && !isValidDate(valueFor(row, "visit_date"))) issues.visit_date += 1;
    for (const key of ["systolic_bp", "diastolic_bp"]) {
      const value = valueFor(row, key);
      if (state.mapping[key] && value && !Number.isFinite(Number(value))) issues[key] += 1;
    }
  }
  const issueCount = Object.values(issues).reduce((sum, count) => sum + count, 0);
  document.querySelector("#quality-count").textContent = issueCount.toLocaleString();
  renderFieldTable(rows);
  renderIssues(issues);
}

function renderFieldTable(rows) {
  const body = document.querySelector("#field-results");
  body.replaceChildren();
  for (const field of FIELDS) {
    const header = state.mapping[field.key];
    const recorded = header ? rows.filter((row) => valueFor(row, field.key) !== "").length : 0;
    const missing = header ? rows.length - recorded : rows.length;
    const percent = header && rows.length ? Math.round((recorded / rows.length) * 100) : 0;
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = field.label;
    if (state.required.has(field.key)) {
      const badge = document.createElement("span");
      badge.className = "required-badge";
      badge.textContent = "REQUIRED";
      name.append(badge);
    }
    const mapped = document.createElement("td");
    mapped.textContent = header || "Not mapped";
    const recordedCell = document.createElement("td");
    recordedCell.textContent = header ? `${recorded.toLocaleString()} / ${rows.length.toLocaleString()}` : "—";
    const missingCell = document.createElement("td");
    missingCell.textContent = header ? missing.toLocaleString() : "—";
    const coverageCell = document.createElement("td");
    if (header) {
      const coverage = document.createElement("div");
      coverage.className = "coverage";
      const track = document.createElement("span");
      track.className = "coverage-track";
      const fill = document.createElement("span");
      fill.className = "coverage-fill";
      fill.style.width = `${percent}%`;
      track.append(fill);
      const value = document.createElement("span");
      value.className = "coverage-value";
      value.textContent = `${percent}%`;
      coverage.append(track, value);
      coverageCell.append(coverage);
    } else {
      coverageCell.textContent = "—";
    }
    tr.append(name, mapped, recordedCell, missingCell, coverageCell);
    body.append(tr);
  }
}

function renderIssues(issues) {
  const host = document.querySelector("#issue-results");
  host.replaceChildren();
  const descriptions = [
    ["visit_date", "Unparseable visit dates"],
    ["systolic_bp", "Non-numeric systolic BP values"],
    ["diastolic_bp", "Non-numeric diastolic BP values"]
  ].filter(([key]) => state.mapping[key]);
  const total = descriptions.reduce((sum, [key]) => sum + issues[key], 0);
  if (!total) {
    const message = document.createElement("div");
    message.className = "issue-empty";
    message.textContent = descriptions.length
      ? "No unparseable dates or non-numeric blood-pressure values found in the mapped fields."
      : "Map visit date and/or blood-pressure fields to check values.";
    host.append(message);
    return;
  }
  for (const [key, label] of descriptions) {
    if (!issues[key]) continue;
    const card = document.createElement("div");
    card.className = "issue-card";
    const count = document.createElement("strong");
    count.textContent = issues[key].toLocaleString();
    card.append(count, document.createTextNode(label));
    host.append(card);
  }
}

function showError(error) {
  const message = document.querySelector("#error-message");
  message.textContent = error instanceof Error ? error.message : "The CSV could not be read.";
  message.hidden = false;
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    loadCsv(await file.text(), file.name);
  } catch (error) {
    showError(error);
  } finally {
    fileInput.value = "";
  }
});

document.querySelector("#sample-button").addEventListener("click", () => {
  const sample = [
    "patient_id,visit_date,systolic_bp,diastolic_bp,diagnosis,medication,follow_up_date",
    "EXAMPLE-001,2026-03-12,142,91,Hypertension,Amlodipine,2026-04-12",
    "EXAMPLE-002,2026-03-14,138,88,Hypertension,,2026-04-14",
    "EXAMPLE-003,not-a-date,unknown,84,Hypertension,Lisinopril,",
    "EXAMPLE-004,2026-03-20,128,82,,Lifestyle advice,2026-04-20"
  ].join("\n");
  try {
    loadCsv(sample, "Example data (synthetic)");
  } catch (error) {
    showError(error);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".csv")) {
    showError(new Error("Please choose a CSV file."));
    return;
  }
  try {
    loadCsv(await file.text(), file.name);
  } catch (error) {
    showError(error);
  }
});
