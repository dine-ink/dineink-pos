export const canManageBilling = (role: string | null | undefined) =>
  role === "MANAGER" || role === "CASHIER";
