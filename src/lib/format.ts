/** Money and date formatting for the Arabic (Egypt) UI. */

const moneyFmt = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 2,
});

export const formatMoney = (n: number) => moneyFmt.format(n);

const dateFmt = new Intl.DateTimeFormat("ar-EG", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
};

/** Today's date as YYYY-MM-DD for date inputs. */
export const todayIso = () => new Date().toISOString().slice(0, 10);
