export const accountTypes = ["checking", "savings", "credit", "loan"] as const;

export type AccountType = (typeof accountTypes)[number];

export type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  current_balance: number;
  initial_balance: number | null;
  has_payment_due: boolean;
  payment_due_date: string | null;
  payment_amount: number | null;
  is_primary: boolean;
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit",
  loan: "Loan",
};

export function getAccountTypeLabel(type: AccountType) {
  return accountTypeLabels[type];
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

export function groupAccountsByType(accounts: AccountRow[]) {
  return accountTypes.map((type) => ({
    type,
    label: getAccountTypeLabel(type),
    accounts: accounts.filter((account) => account.type === type),
  }));
}

export function getAccountSurfaceClass(type: AccountType) {
  switch (type) {
    case "checking":
      return "border-sky-200 bg-sky-50";
    case "savings":
      return "border-emerald-200 bg-emerald-50";
    case "credit":
      return "border-violet-200 bg-violet-50";
    case "loan":
      return "border-orange-200 bg-orange-50";
  }
}

export function getAccountBadgeClass(type: AccountType) {
  switch (type) {
    case "checking":
      return "border-sky-300 bg-sky-100 text-sky-900";
    case "savings":
      return "border-emerald-300 bg-emerald-100 text-emerald-900";
    case "credit":
      return "border-violet-300 bg-violet-100 text-violet-900";
    case "loan":
      return "border-orange-300 bg-orange-100 text-orange-900";
  }
}

export function getAccountGradientClass(type: AccountType) {
  switch (type) {
    case "checking":
      return "from-sky-500 to-cyan-400";
    case "savings":
      return "from-emerald-600 to-teal-400";
    case "credit":
      return "from-violet-600 to-indigo-500";
    case "loan":
      return "from-orange-600 to-amber-500";
  }
}

export function getAccountHeroSurfaceClass(type: AccountType) {
  switch (type) {
    case "checking":
      return "border-sky-200 bg-sky-50";
    case "savings":
      return "border-emerald-200 bg-emerald-50";
    case "credit":
      return "border-violet-200 bg-violet-50";
    case "loan":
      return "border-orange-200 bg-orange-50";
  }
}

export function getAccountHeroTextClass(type: AccountType) {
  switch (type) {
    case "checking":
      return "text-sky-900";
    case "savings":
      return "text-emerald-900";
    case "credit":
      return "text-violet-950";
    case "loan":
      return "text-orange-950";
  }
}

export function getAccountHeroMutedTextClass(type: AccountType) {
  switch (type) {
    case "checking":
      return "text-sky-800";
    case "savings":
      return "text-emerald-800";
    case "credit":
      return "text-violet-800";
    case "loan":
      return "text-orange-800";
  }
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
