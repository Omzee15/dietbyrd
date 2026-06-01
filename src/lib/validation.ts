export const normalizeIndianMobileInput = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
};

export const isValidIndianMobile = (phone: string) => /^[6-9]\d{9}$/.test(phone);
