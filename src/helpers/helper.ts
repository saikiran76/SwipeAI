export const formatCurrency = (amount: string | number): string => {
  if (!amount || Number(amount) === 0) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(amount));
};
  