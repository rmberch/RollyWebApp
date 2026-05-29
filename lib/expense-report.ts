import { formatCurrency, formatDate } from "@/lib/rolly";

export type MonthMeta = {
  year: number;
  month: number;
  start: string;
  end: string;
  label: string;
};

export type ExpenseReportTransaction = {
  id: string;
  name: string;
  amount: number;
  date: string;
  isTracked: boolean;
  accountName: string | null;
};

export type ExpenseReportMember = {
  displayName: string;
  spent: number;
  remaining: number;
};

export type ExpenseReportPdfInput = {
  householdName: string;
  profileDisplayName: string | null;
  month: MonthMeta;
  generatedAt: string;
  periodStartLabel: string;
  periodEndLabel: string;
  transactionCount: number;
  trackedCount: number;
  billCount: number;
  trackedTotal: number;
  billTotal: number;
  spendingLimit: number;
  remaining: number;
  personalSpendingEnabled: boolean;
  personalSpendingByMember: ExpenseReportMember[];
  trackedTransactions: ExpenseReportTransaction[];
  billTransactions: ExpenseReportTransaction[];
};

export function getMonthMeta(dateString: string, offsetMonths = 0): MonthMeta {
  const baseYear = Number(dateString.slice(0, 4));
  const baseMonth = Number(dateString.slice(5, 7));
  const monthIndex = baseMonth - 1 + offsetMonths;
  const year = baseYear + Math.floor(monthIndex / 12);
  const normalizedMonthIndex = ((monthIndex % 12) + 12) % 12;
  const month = normalizedMonthIndex + 1;
  const nextMonthIndex =
    normalizedMonthIndex === 11 ? 0 : normalizedMonthIndex + 1;
  const nextMonthYear = normalizedMonthIndex === 11 ? year + 1 : year;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${nextMonthYear}-${String(nextMonthIndex + 1).padStart(2, "0")}-01`;
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${start}T12:00:00Z`));

  return {
    year,
    month,
    start,
    end,
    label,
  };
}

function getReportDateLabel(value: string) {
  return formatDate(value);
}

function getReportGeneratedLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(date);
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u00b7]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return sanitizePdfText(value).replace(/([\\()])/g, "\\$1");
}

function truncatePdfText(value: string, maxLength: number) {
  const text = sanitizePdfText(value);

  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength <= 1) {
    return ".";
  }

  if (maxLength === 2) {
    return "..";
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

type PdfTextElement = {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  font: "regular" | "bold";
};

type PdfLineElement = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
};

type PdfPage = {
  elements: Array<PdfTextElement | PdfLineElement>;
};

function createPage(): PdfPage {
  return { elements: [] };
}

function addText(
  page: PdfPage,
  text: string,
  x: number,
  y: number,
  size = 12,
  font: "regular" | "bold" = "regular",
) {
  page.elements.push({ kind: "text", x, y, text, size, font });
}

function addLine(
  page: PdfPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width = 1,
) {
  page.elements.push({ kind: "line", x1, y1, x2, y2, width });
}

function addTableRow(
  page: PdfPage,
  values: string[],
  xPositions: number[],
  y: number,
  sizes: number[] = [],
  font: "regular" | "bold" = "regular",
) {
  values.forEach((value, index) => {
    addText(page, value, xPositions[index] ?? 54, y, sizes[index] ?? 10, font);
  });
}

function addTableHeader(
  page: PdfPage,
  headers: string[],
  xPositions: number[],
  y: number,
) {
  addTableRow(page, headers, xPositions, y, headers.map(() => 9), "bold");
}

function addTableRule(
  page: PdfPage,
  x1: number,
  x2: number,
  y: number,
  width = 0.8,
) {
  addLine(page, x1, y, x2, y, width);
}

function sortTransactionsByDate(transactions: ExpenseReportTransaction[]) {
  return [...transactions].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );
}

function buildPdf(pages: PdfPage[]) {
  const width = 612;
  const height = 792;
  const objects: string[] = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages
    .map((_, index) => `${6 + index * 2} 0 R`)
    .join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pages.forEach((page, index) => {
    const contentObjectNumber = 5 + index * 2;
    const pageObjectNumber = contentObjectNumber + 1;
    const contentOps = page.elements
      .map((element) => {
        if (element.kind === "line") {
          return `q ${element.width ?? 1} w ${element.x1} ${element.y1} m ${element.x2} ${element.y2} l S Q`;
        }

        const fontResource = element.font === "bold" ? "/F2" : "/F1";
        return `BT ${fontResource} ${element.size} Tf ${element.x} ${element.y} Td (${escapePdfText(
          element.text,
        )}) Tj ET`;
      })
      .join("\n");

    objects[contentObjectNumber] = `<< /Length ${Buffer.byteLength(contentOps, "utf8")} >>\nstream\n${contentOps}\nendstream`;
    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
  });

  const header = "%PDF-1.4\n";
  let output = header;
  const offsets = ["0000000000 65535 f \n"];

  for (let i = 1; i < objects.length; i += 1) {
    const object = objects[i];

    if (!object) {
      continue;
    }

    offsets.push(String(output.length).padStart(10, "0") + " 00000 n \n");
    output += `${i} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = output.length;
  output += `xref\n0 ${offsets.length}\n${offsets.join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(output);
}

function formatMemberLimit(member: ExpenseReportMember) {
  return formatCurrency(member.spent + member.remaining);
}

export function buildExpenseReportPdf(input: ExpenseReportPdfInput) {
  const pages: PdfPage[] = [];
  const pageWidth = 612;
  const marginLeft = 54;
  const marginRight = 54;
  const bottomLimit = 72;

  let page = createPage();
  let y = 732;

  function finishPage() {
    pages.push(page);
    page = createPage();
    y = 732;
  }

  function ensureSpace(requiredHeight: number, restartSection?: () => void) {
    if (y - requiredHeight >= bottomLimit) {
      return;
    }

    finishPage();

    if (restartSection) {
      restartSection();
    }
  }

  function drawReportHeader() {
    addText(page, "Rolly", marginLeft, y, 12, "bold");
    y -= 22;
    addText(page, "Last Month's Transactions", marginLeft, y, 20, "bold");
    y -= 24;
    addText(page, input.householdName, marginLeft, y, 14, "bold");
    y -= 18;

    const subtitle = input.profileDisplayName
      ? `Prepared for ${input.profileDisplayName}`
      : "Prepared for your household";
    addText(page, subtitle, marginLeft, y, 10);
    y -= 14;
    addText(
      page,
      `${input.month.label} | ${input.periodStartLabel} to ${input.periodEndLabel}`,
      marginLeft,
      y,
      10,
    );
    y -= 14;
    addText(page, `Generated ${input.generatedAt}`, marginLeft, y, 10);
    y -= 20;
    addLine(page, marginLeft, y, pageWidth - marginRight, y, 1);
    y -= 18;
  }

  function drawTransactionSectionTitle(title: string) {
    addText(page, title, marginLeft, y, 14, "bold");
    y -= 16;
  }

  function drawTransactionTableHeader() {
    addTableHeader(
      page,
      ["Date", "Description", "Account", "Amount"],
      [marginLeft, marginLeft + 120, marginLeft + 315, pageWidth - marginRight - 70],
      y,
    );
    y -= 6;
    addTableRule(page, marginLeft, pageWidth - marginRight, y);
    y -= 14;
  }

  function drawSummarySectionTitle(title: string) {
    addText(page, title, marginLeft, y, 12, "bold");
    y -= 16;
  }

  function drawExpenseSummary() {
    ensureSpace(62);
    drawSummarySectionTitle("Expense summary");
    addTableHeader(
      page,
      ["Transactions", "Spending limit", "Amount spent", "Amount remaining"],
      [marginLeft, marginLeft + 130, marginLeft + 275, marginLeft + 390],
      y,
    );
    y -= 6;
    addTableRule(page, marginLeft, pageWidth - marginRight, y);
    y -= 14;
    addTableRow(
      page,
      [
        String(input.trackedCount),
        formatCurrency(input.spendingLimit),
        formatCurrency(input.trackedTotal),
        formatCurrency(input.remaining),
      ],
      [marginLeft, marginLeft + 130, marginLeft + 275, marginLeft + 390],
      y,
      [10, 10, 10, 10],
    );
    y -= 20;
  }

  function drawPersonalSpendingSummary() {
    if (!input.personalSpendingEnabled || input.personalSpendingByMember.length === 0) {
      return;
    }

    const estimatedHeight = 42 + input.personalSpendingByMember.length * 14;
    ensureSpace(estimatedHeight);
    drawSummarySectionTitle("Personal spending");
    addTableHeader(
      page,
      ["Member", "Spending limit", "Amount spent", "Amount remaining"],
      [marginLeft, marginLeft + 130, marginLeft + 275, marginLeft + 390],
      y,
    );
    y -= 6;
    addTableRule(page, marginLeft, pageWidth - marginRight, y);
    y -= 14;

    for (const member of input.personalSpendingByMember) {
      addTableRow(
        page,
        [
          member.displayName,
          formatMemberLimit(member),
          formatCurrency(member.spent),
          formatCurrency(member.remaining),
        ],
        [marginLeft, marginLeft + 130, marginLeft + 275, marginLeft + 390],
        y,
        [10, 10, 10, 10],
      );
      y -= 14;
    }

    y -= 18;
  }

  function drawBillsSummary() {
    ensureSpace(58);
    drawSummarySectionTitle("Bills summary");
    addTableHeader(page, ["Total amount spent"], [marginLeft], y);
    y -= 6;
    addTableRule(page, marginLeft, pageWidth - marginRight, y);
    y -= 14;
    addTableRow(page, [formatCurrency(input.billTotal)], [marginLeft], y, [10]);
    y -= 24;
  }

  function drawTransactionRow(transaction: ExpenseReportTransaction) {
    addText(page, getReportDateLabel(transaction.date), marginLeft, y, 10);
    addText(
      page,
      truncatePdfText(transaction.name, 34),
      marginLeft + 120,
      y,
      11,
      "bold",
    );
    addText(
      page,
      truncatePdfText(transaction.accountName ?? "No account", 18),
      marginLeft + 315,
      y,
      10,
    );
    addText(
      page,
      formatCurrency(transaction.amount),
      pageWidth - marginRight - 70,
      y,
      11,
      "bold",
    );
    y -= 17;
  }

  function renderTransactionSection(
    title: string,
    transactions: ExpenseReportTransaction[],
    afterRows: () => void,
  ) {
    const rows = sortTransactionsByDate(transactions);
    ensureSpace(58);
    drawTransactionSectionTitle(title);
    drawTransactionTableHeader();

    for (const transaction of rows) {
      ensureSpace(20, () => {
        drawTransactionSectionTitle(title);
        drawTransactionTableHeader();
      });
      drawTransactionRow(transaction);
    }

    afterRows();
  }

  drawReportHeader();

  renderTransactionSection("Expenses", input.trackedTransactions, () => {
    y -= 10;
    drawExpenseSummary();
    drawPersonalSpendingSummary();
    y -= 8;
  });

  renderTransactionSection("Bills", input.billTransactions, () => {
    y -= 4;
    drawBillsSummary();
  });

  pages.push(page);
  return buildPdf(pages);
}

export function buildExpenseReportFilename(month: MonthMeta) {
  return `rolly-${month.start.slice(0, 7)}-transactions.pdf`;
}

export function getExpenseReportGeneratedLabel(date = new Date()) {
  return getReportGeneratedLabel(date);
}

export function getExpenseReportPeriodLabels(month: MonthMeta) {
  const startLabel = getReportDateLabel(month.start);
  const endDate = new Date(`${month.end}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(endDate);

  return {
    startLabel,
    endLabel,
  };
}
