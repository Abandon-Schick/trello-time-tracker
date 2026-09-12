// Weekly Time Report generator.
// Runs the same math as popup-report.html, but standalone (no Trello iframe,
// no browser) so it can run unattended via GitHub Actions. Each run:
//   1. Fetches fresh card/comment data from Trello and computes live totals
//      (same merge logic as the Report popup).
//   2. Finds last week's report card (in TRELLO_REPORT_LIST) and extracts
//      its embedded cumulative-spent total, to compute a true weekly delta
//      rather than a lifetime running total.
//   3. Creates a new report card with the stats in its description, a
//      #estimate comment (pluginData can't be written directly via REST —
//      see README), and the full CSV attached.

const KEY = process.env.TRELLO_KEY;
const TOKEN = process.env.TRELLO_TOKEN; // needs read AND write scope
const BOARD = process.env.TRELLO_BOARD; // board id or shortLink
const REPORT_LIST = process.env.TRELLO_REPORT_LIST; // id of the list new report cards go into

if (!KEY || !TOKEN || !BOARD || !REPORT_LIST) {
  console.error("Missing TRELLO_KEY, TRELLO_TOKEN, TRELLO_BOARD, or TRELLO_REPORT_LIST environment variables.");
  process.exit(1);
}

const TIME_COMMENT_RE = /#time\s+([\d.:]+)\s*(h|hr|hrs|m|min|mins)?/i;
const ESTIMATE_COMMENT_RE = /#estimate\s+([\d.:]+)\s*(h|hr|hrs|m|min|mins)?/i;
const CARD_TITLE_SUFFIX = "Weekly Time Management";
const REPORT_ESTIMATE_HOURS = 0.5;

function parseHours(raw, unit) {
  unit = (unit || "h").toLowerCase();
  if (raw.indexOf(":") > -1) {
    const parts = raw.split(":");
    return (parseFloat(parts[0]) || 0) + (parseFloat(parts[1]) || 0) / 60;
  }
  const n = parseFloat(raw);
  if (isNaN(n)) return 0;
  return unit[0] === "m" ? n / 60 : n;
}

function extractTimeData(card) {
  let estimate = 0, spent = 0, lastCommentSync = null, lastEstimateCommentSync = null;
  (card.pluginData || []).forEach((pd) => {
    let val;
    try { val = JSON.parse(pd.value); } catch (e) { return; }
    if (val && (typeof val.estimate !== "undefined" || typeof val.spent !== "undefined")) {
      estimate += parseFloat(val.estimate) || 0;
      spent += parseFloat(val.spent) || 0;
      if (val.lastCommentSync) lastCommentSync = val.lastCommentSync;
      if (val.lastEstimateCommentSync) lastEstimateCommentSync = val.lastEstimateCommentSync;
    }
  });
  return { estimate, spent, lastCommentSync, lastEstimateCommentSync };
}

function liveTimeData(card, commentsByCard) {
  const base = extractTimeData(card);
  const comments = (commentsByCard[card.id] || [])
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let estimate = base.estimate, spent = base.spent;

  comments.forEach((c) => {
    if (base.lastCommentSync && new Date(c.date) <= new Date(base.lastCommentSync)) return;
    const m = c.text.match(TIME_COMMENT_RE);
    if (m) spent += parseHours(m[1], m[2]);
  });

  let latestEstimate = null;
  comments.forEach((c) => {
    if (base.lastEstimateCommentSync && new Date(c.date) <= new Date(base.lastEstimateCommentSync)) return;
    const m = c.text.match(ESTIMATE_COMMENT_RE);
    if (m) latestEstimate = { date: c.date, hours: parseHours(m[1], m[2]) };
  });
  if (latestEstimate) estimate = latestEstimate.hours;

  return { estimate, spent };
}

function csvField(v) {
  v = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Trello API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function postComment(cardId, text) {
  const res = await fetch(`https://api.trello.com/1/cards/${cardId}/actions/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key: KEY, token: TOKEN, text })
  });
  if (!res.ok) throw new Error(`Trello comment post failed ${res.status}: ${await res.text()}`);
}

async function postCsvAttachment(cardId, filename, csv) {
  const form = new FormData();
  form.append("key", KEY);
  form.append("token", TOKEN);
  form.append("name", filename);
  form.append("file", new Blob([csv], { type: "text/csv" }), filename);
  const res = await fetch(`https://api.trello.com/1/cards/${cardId}/attachments`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Trello attachment upload failed ${res.status}: ${await res.text()}`);
}

async function createCard({ idList, name, desc, due }) {
  const res = await fetch(`https://api.trello.com/1/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key: KEY, token: TOKEN, idList, name, desc, due })
  });
  if (!res.ok) throw new Error(`Trello card creation failed ${res.status}: ${await res.text()}`);
  return res.json();
}

// Trello IDs are MongoDB ObjectIds - the first 8 hex chars encode a Unix
// timestamp (seconds), so we can sort/date cards without extra API calls.
function cardCreatedAt(id) {
  return new Date(parseInt(id.substring(0, 8), 16) * 1000);
}

// Determine EDT (-4) vs EST (-5) for a given date, so "9am Eastern" converts
// to the correct UTC instant without an external timezone library.
function easternOffsetHours(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour: "numeric", hour12: false, timeZoneName: "short"
  }).formatToParts(date);
  const tzName = parts.find((p) => p.type === "timeZoneName").value;
  return tzName === "EDT" ? -4 : -5;
}

function nextMondayAt9amEasternISO(fromDate) {
  const d = new Date(fromDate);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  let daysUntilMonday = (1 - day + 7) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 7;
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysUntilMonday));
  const offset = easternOffsetHours(target);
  const utcHour = 9 - offset;
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), utcHour, 0, 0)).toISOString();
}

function mmdd(date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

async function main() {
  const base = `key=${KEY}&token=${TOKEN}`;
  const now = new Date();

  const [lists, cards, actions, priorReportCards] = await Promise.all([
    fetchJson(`https://api.trello.com/1/boards/${BOARD}/lists?${base}`),
    fetchJson(`https://api.trello.com/1/boards/${BOARD}/cards?fields=name,idList,labels,due&pluginData=true&${base}`),
    fetchJson(`https://api.trello.com/1/boards/${BOARD}/actions?filter=commentCard&limit=1000&fields=data,date&${base}`),
    fetchJson(`https://api.trello.com/1/lists/${REPORT_LIST}/cards?filter=all&fields=name,id,desc&${base}`)
  ]);

  const listMap = {};
  lists.forEach((l) => { listMap[l.id] = l.name; });

  const commentsByCard = {};
  actions.forEach((a) => {
    const cardId = a.data && a.data.card && a.data.card.id;
    const text = a.data && a.data.text;
    if (!cardId || !text) return;
    (commentsByCard[cardId] = commentsByCard[cardId] || []).push({ date: a.date, text });
  });

  // ---- Core per-card live totals ----
  const rows = [["Card", "List", "Labels", "Due Date", "Estimated Hours", "Spent Hours"]];
  let grandEst = 0, grandSpent = 0, totalRemaining = 0, touched = 0;

  const nextMondayISO = nextMondayAt9amEasternISO(now);
  const nextWeekEnd = new Date(new Date(nextMondayISO).getTime() + 6 * 24 * 3600 * 1000); // following Sunday, end of day-ish
  let dueNextWeekRemaining = 0;

  cards.forEach((card) => {
    const td = liveTimeData(card, commentsByCard);
    if (td.estimate || td.spent) touched++;
    grandEst += td.estimate;
    grandSpent += td.spent;

    const remaining = Math.max(0, td.estimate - td.spent);
    totalRemaining += remaining;

    if (card.due && new Date(card.due) <= nextWeekEnd) {
      dueNextWeekRemaining += remaining;
    }

    const listName = listMap[card.idList] || "";
    const labelNames = (card.labels || []).map((l) => l.name || l.color || "").join("; ");
    const due = card.due ? card.due.slice(0, 10) : "";
    rows.push([card.name, listName, labelNames, due, td.estimate || "", td.spent || ""]);
  });

  const csv = rows.map((r) => r.map(csvField).join(",")).join("\r\n");
  const round = (n) => Math.round(n * 100) / 100;

  // ---- Find last week's report card, diff against it for true weekly spent ----
  const priorReports = priorReportCards
    .filter((c) => c.name.endsWith(CARD_TITLE_SUFFIX))
    .sort((a, b) => cardCreatedAt(b.id) - cardCreatedAt(a.id));

  let weeklySpentLine;
  let weeklySpent = null;
  if (priorReports.length > 0) {
    const m = priorReports[0].desc.match(/TOTAL_SPENT:([\d.]+)/);
    if (m) {
      weeklySpent = round(grandSpent - parseFloat(m[1]));
      weeklySpentLine = `Time spent this week: ${weeklySpent}h`;
    } else {
      weeklySpentLine = "Time spent this week: unavailable (last report card had no embedded total)";
    }
  } else {
    weeklySpentLine = "Time spent this week: N/A (first report — comparison starts next week)";
  }

  // ---- Build the new card ----
  const titleDate = new Date(now.getTime() + 24 * 3600 * 1000); // day after a Saturday-night run = Sunday
  const title = `${mmdd(titleDate)} ${CARD_TITLE_SUFFIX}`;

  const desc =
    `**Week of ${mmdd(titleDate)}**\n\n` +
    `- ${weeklySpentLine}\n` +
    `- Total time remaining (all projects): ${round(totalRemaining)}h\n` +
    `- Remaining for tasks due by ${mmdd(nextWeekEnd)} (incl. overdue): ${round(dueNextWeekRemaining)}h\n\n` +
    `${touched} cards have time data logged. Full per-card detail attached as CSV.\n\n` +
    `<!-- TOTAL_SPENT:${grandSpent} -->`;

  const card = await createCard({
    idList: REPORT_LIST,
    name: title,
    desc,
    due: nextMondayAt9amEasternISO(now)
  });

  await postComment(card.id, `#estimate ${REPORT_ESTIMATE_HOURS}h`);
  await postCsvAttachment(card.id, `time-report-${mmdd(titleDate).replace("/", "-")}.csv`, csv);

  console.log(`Created card "${title}" (${card.id}).`);
  console.log(desc);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
