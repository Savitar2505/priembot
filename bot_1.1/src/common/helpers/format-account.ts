export const formatAccountNumber = (number: string, type: string): string => {
  const last4 = number.slice(-4);
  return type === 'wallet' ? `...${last4}` : `*${last4}`;
};
