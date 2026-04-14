import { BankDetails } from "@/lib/types";

export function getBankDetails(): BankDetails {
  return {
    accountHolderName: process.env.BANK_ACCOUNT_HOLDER_NAME || "OM SRI SAI COLLEGE OF PARAMEDICAL AND SCIENCES",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || "132805500837",
    ifscCode: process.env.BANK_IFSC_CODE || "ICIC0001328",
    accountType: process.env.BANK_ACCOUNT_TYPE || "Current Account",
    bankBranch: process.env.BANK_BRANCH || "ICICI, MADHUBANI"
  };
}
