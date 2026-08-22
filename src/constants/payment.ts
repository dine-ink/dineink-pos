export const PAYMENT_SOURCE = {
  SHOP_CASH: "SHOP_CASH",
  EMPLOYEE_PAID: "EMPLOYEE_PAID",
} as const;

export const PAYMENT_SOURCES = [
  { value: PAYMENT_SOURCE.SHOP_CASH, label: "Shop Cash" },
  { value: PAYMENT_SOURCE.EMPLOYEE_PAID, label: "Employee Paid" },
] as const;
