const express = require("express"), fs = require("fs"), path = require("path");
const app = express(), FILE = path.join(__dirname, "data.json");
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const load = () => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : {});
const save = d => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
const validMonth = m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

// Read the plan (goals + daily logs) for a month
app.get("/api/plan/:month", (req, res) => {
  res.json(load()[req.params.month] || null);
});

// Create/replace the goals for a month (keeps existing logs)
app.post("/api/plan/:month", (req, res) => {
  const { month } = req.params, goals = req.body.goals;
  if (!validMonth(month) || !Array.isArray(goals) || goals.length < 1 || goals.length > 5)
    return res.status(400).json({ error: "Need a valid month and 1-5 goals." });
  for (const g of goals)
    if (!g.name || !(g.target > 0) || !g.unit || !(g.dailyHours > 0))
      return res.status(400).json({ error: "Each goal needs name, target, unit, dailyHours." });
  const data = load(), old = data[month];
  data[month] = { month, goals: goals.map((g, i) => ({ id: g.id || "g" + Date.now() + i, ...g })), logs: old ? old.logs : {} };
  save(data);
  res.json(data[month]);
});

// Save one day's entries: { date, entries: { goalId: { hours, units } } }
app.post("/api/plan/:month/log", (req, res) => {
  const { month } = req.params, { date, entries } = req.body;
  const data = load(), plan = data[month];
  if (!plan) return res.status(404).json({ error: "No plan for this month." });
  if (!date || !date.startsWith(month) || typeof entries !== "object")
    return res.status(400).json({ error: "Date must be inside the month." });
  plan.logs[date] = entries;
  save(data);
  res.json(plan);
});

app.listen(3000, () => console.log("Running at http://localhost:3000"));
