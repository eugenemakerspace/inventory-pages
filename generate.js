import fs from "fs/promises";
import path from "path";
import Mustache from "mustache";
import { google } from "googleapis";

function formatHeaderAsIDString(text) {
  if (!text) {
    return "";
  }
  return text.trim().toLowerCase().replace(/\s+/g, "_");
}

const SHEET_ID = process.env.SHEET_ID;

const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

const sheets = google.sheets({ version: "v4", auth });
const template = await fs.readFile("./templates/page.html", "utf8");
const indexTemplate = await fs.readFile("./templates/index.html", "utf8");

await fs.mkdir("dist/", { recursive: true });
await fs.cp("static", "dist", { recursive: true });

const response = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: "Equipment"
});

const [headers, ...rows] = response.data.values;
const items = [];

for (const values of rows) {
  const row = Object.fromEntries(
    headers.map((h, i) => [formatHeaderAsIDString(h), values[i]])
  );
  if (!row.name?.trim()) {
    continue;
  }
  row.title = `Item ${row.id}: ${row.name}`;

  const html = Mustache.render(template, row);
  const dir = `dist/`;

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    `${dir}${row.id}.html`,
    html
  );

  items.push({ title: row.title, href: `${row.id}.html` });
}

await fs.writeFile("dist/index.html", Mustache.render(indexTemplate, { items }));