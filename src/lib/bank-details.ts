import { BankDetails } from "@/lib/types";

function isPharmacyCourse(courseId: string | undefined): boolean {
  return courseId === "b-pharm" || courseId === "d-pharm" || courseId === "b-pharm-lateral";
}

export function getBankDetails(courseId?: string): BankDetails {
  if (isPharmacyCourse(courseId)) {
    return {
      accountHolderName: process.env.PHARMACY_BANK_ACCOUNT_HOLDER_NAME || "OM SRI SAI PHARMACY COLLEGE OF EDUCATION",
      accountNumber: process.env.PHARMACY_BANK_ACCOUNT_NUMBER || "132805500836",
      ifscCode: process.env.PHARMACY_BANK_IFSC_CODE || "ICIC0001328",
      accountType: process.env.PHARMACY_BANK_ACCOUNT_TYPE || "Current Account",
      bankBranch: process.env.PHARMACY_BANK_BRANCH || "ICICI, MADHUBANI"
    };
  }

  return {
    accountHolderName: process.env.BANK_ACCOUNT_HOLDER_NAME || "OM SRI SAI COLLEGE OF PARAMEDICAL AND SCIENCES",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || "132805500837",
    ifscCode: process.env.BANK_IFSC_CODE || "ICIC0001328",
    accountType: process.env.BANK_ACCOUNT_TYPE || "Current Account",
    bankBranch: process.env.BANK_BRANCH || "ICICI, MADHUBANI"
  };
}
