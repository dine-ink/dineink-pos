export const formatCurrency = (amount: number | string | null | undefined) => {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatLongDate = (date: string | number | Date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export const formatShortDate = (date: string | number | Date) =>
  new Date(date).toLocaleDateString("en-GB");

export const formatTime = (date: string | number | Date) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
