const STORAGE_KEY = "gym-progress-entries";

const form = document.getElementById("workout-form");
const tableBody = document.getElementById("workout-table");
const stats = document.getElementById("stats");
const clearButton = document.getElementById("clear-data");
const loadDemoButton = document.getElementById("load-demo");
const chartCanvas = document.getElementById("progress-chart");
const rowTemplate = document.getElementById("row-template");

const fields = {
  date: document.getElementById("date"),
  exercise: document.getElementById("exercise"),
  sets: document.getElementById("sets"),
  reps: document.getElementById("reps"),
  weight: document.getElementById("weight"),
  bodyweight: document.getElementById("bodyweight"),
};

const demoEntries = [
  { id: "demo-1", date: "2026-02-16", exercise: "Bench Press", sets: 4, reps: 8, weight: 70, bodyweight: 81.5 },
  { id: "demo-2", date: "2026-02-18", exercise: "Squat", sets: 5, reps: 5, weight: 100, bodyweight: 81.2 },
  { id: "demo-3", date: "2026-02-21", exercise: "Deadlift", sets: 3, reps: 5, weight: 130, bodyweight: 81.1 },
  { id: "demo-4", date: "2026-02-23", exercise: "Bench Press", sets: 5, reps: 5, weight: 80, bodyweight: 80.9 },
];

fields.date.valueAsDate = new Date();

function generateId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `entry-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function volume(entry) {
  return entry.sets * entry.reps * entry.weight;
}

function estimate1rm(entry) {
  return entry.weight * (1 + entry.reps / 30);
}

function renderStats(entries) {
  if (!entries.length) {
    stats.innerHTML = "<p class='subtle'>No workouts yet. Add your first session or click <strong>Load Demo Data</strong>.</p>";
    return;
  }

  const totalSessions = new Set(entries.map((entry) => entry.date)).size;
  const totalVolume = entries.reduce((sum, entry) => sum + volume(entry), 0);
  const maxWeight = Math.max(...entries.map((entry) => entry.weight));
  const latestBodyWeight = [...entries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .find((entry) => entry.bodyweight);

  const items = [
    ["Workout Entries", entries.length],
    ["Training Days", totalSessions],
    ["Total Volume", `${totalVolume.toFixed(0)} kg`],
    ["Heaviest Weight", `${maxWeight.toFixed(1)} kg`],
    ["Latest Body Weight", latestBodyWeight ? `${latestBodyWeight.bodyweight.toFixed(1)} kg` : "N/A"],
  ];

  stats.innerHTML = items
    .map(
      ([label, value]) =>
        `<article class="stat"><div class="label">${label}</div><div class="value">${value}</div></article>`,
    )
    .join("");
}

function renderTable(entries) {
  tableBody.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("tr");
    empty.innerHTML = '<td colspan="7" class="subtle">No entries yet. Use the form above or load demo data.</td>';
    tableBody.appendChild(empty);
    return;
  }

  entries
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((entry) => {
      const row = rowTemplate.content.firstElementChild.cloneNode(true);
      row.querySelector('[data-col="date"]').textContent = entry.date;
      row.querySelector('[data-col="exercise"]').textContent = entry.exercise;
      row.querySelector('[data-col="setsReps"]').textContent = `${entry.sets} × ${entry.reps}`;
      row.querySelector('[data-col="weight"]').textContent = `${entry.weight.toFixed(1)} kg`;
      row.querySelector('[data-col="volume"]').textContent = `${volume(entry).toFixed(0)} kg`;
      row.querySelector('[data-col="bodyweight"]').textContent = entry.bodyweight
        ? `${entry.bodyweight.toFixed(1)} kg`
        : "-";

      row.querySelector(".delete-btn").addEventListener("click", () => {
        const next = loadEntries().filter((candidate) => candidate.id !== entry.id);
        saveEntries(next);
        render();
      });

      tableBody.appendChild(row);
    });
}

function drawChart(entries) {
  const ctx = chartCanvas.getContext("2d");
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const padding = { top: 20, right: 22, bottom: 30, left: 48 };

  ctx.clearRect(0, 0, width, height);

  const points = entries
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((entry) => ({
      x: entry.date,
      y: estimate1rm(entry),
    }));

  if (points.length < 2) {
    ctx.fillStyle = "#64748b";
    ctx.font = "16px sans-serif";
    ctx.fillText("Add at least two entries to see a trend line.", 18, 40);
    return;
  }

  const minY = Math.min(...points.map((point) => point.y)) * 0.95;
  const maxY = Math.max(...points.map((point) => point.y)) * 1.05;

  const xStep = (width - padding.left - padding.right) / (points.length - 1);
  const yRange = maxY - minY || 1;

  const toCanvas = (point, index) => ({
    x: padding.left + index * xStep,
    y: height - padding.bottom - ((point.y - minY) / yRange) * (height - padding.top - padding.bottom),
  });

  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = "#475569";
  ctx.font = "12px sans-serif";
  ctx.fillText(maxY.toFixed(1), 6, padding.top + 4);
  ctx.fillText(minY.toFixed(1), 6, height - padding.bottom);

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    const coord = toCanvas(point, index);
    if (index === 0) ctx.moveTo(coord.x, coord.y);
    else ctx.lineTo(coord.x, coord.y);
  });
  ctx.stroke();

  ctx.fillStyle = "#1d4ed8";
  points.forEach((point, index) => {
    const coord = toCanvas(point, index);
    ctx.beginPath();
    ctx.arc(coord.x, coord.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (index === 0 || index === points.length - 1) {
      ctx.fillStyle = "#334155";
      ctx.fillText(point.x.slice(5), coord.x - 16, height - 10);
      ctx.fillStyle = "#1d4ed8";
    }
  });
}

function render() {
  const entries = loadEntries();
  renderStats(entries);
  renderTable(entries);
  drawChart(entries);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const entry = {
    id: generateId(),
    date: fields.date.value,
    exercise: fields.exercise.value.trim(),
    sets: Number(fields.sets.value),
    reps: Number(fields.reps.value),
    weight: Number(fields.weight.value),
    bodyweight: fields.bodyweight.value ? Number(fields.bodyweight.value) : null,
  };

  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);

  form.reset();
  fields.date.valueAsDate = new Date();
  render();
});

loadDemoButton.addEventListener("click", () => {
  saveEntries(demoEntries);
  render();
});

clearButton.addEventListener("click", () => {
  if (!confirm("Delete all saved workouts? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
});

render();
