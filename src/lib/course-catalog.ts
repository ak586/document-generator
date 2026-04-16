import { CourseDefinition } from "@/lib/types";

export const COURSE_CATALOG: CourseDefinition[] = [
  { id: "b-pharm", shortName: "B.Pharm", fullName: "Bachelor in Pharmacy", durationYears: 4, referenceCode: "BP" },
  { id: "b-pharm-lateral", shortName: "B.Pharm (Lateral)", fullName: "Bachelor in Pharmacy (Lateral)", durationYears: 3, referenceCode: "BPL" },
  { id: "d-pharm", shortName: "D.Pharm", fullName: "Diploma in Pharmacy", durationYears: 2, referenceCode: "DP" },
  { id: "bpt", shortName: "B.P.T", fullName: "Bachelor in Physiotherapy", durationYears: 4, referenceCode: "BPT" },
  { id: "bot", shortName: "B.O.T", fullName: "Bachelor in Occupational Therapy", durationYears: 4, referenceCode: "BOCT" },
  { id: "bhm", shortName: "B.H.M", fullName: "Bachelor in Hospital Management", durationYears: 3, referenceCode: "BHM" },
  { id: "b-yoga", shortName: "B.Yoga", fullName: "Bachelor in Yoga", durationYears: 4, referenceCode: "BYOGA" },
  { id: "bmlt", shortName: "B.M.L.T", fullName: "Bachelor in Medical Laboratory Technology", durationYears: 4, referenceCode: "BMLT" },
  { id: "dpt", shortName: "D.P.T", fullName: "Diploma in Physiotherapy", durationYears: 3, referenceCode: "DPT" },
  { id: "dota", shortName: "D.O.T.A", fullName: "Diploma in Occupational Therapy", durationYears: 2, referenceCode: "DOTA" },
  { id: "dmlt", shortName: "D.M.L.T", fullName: "Diploma in Medical Laboratory Technology", durationYears: 2, referenceCode: "DMLT" },
  { id: "diet", shortName: "D.I.E.T", fullName: "Diploma ECG Technician", durationYears: 2, referenceCode: "DIET" },
  { id: "dixt", shortName: "D.I.X.T", fullName: "Diploma in X-Ray Technician", durationYears: 2, referenceCode: "DIXT" },
  { id: "cmd", shortName: "C.M.D", fullName: "Diploma in Dresser", durationYears: 1, referenceCode: "DRESSER" }
];

export const DEFAULT_FEE_STRUCTURE = {
  tuitionFee: 60000,
  labFee: 5000,
  examinationFee: 10000,
  hostelFee: 60000,
  initialPayment: 10000
} as const;

export function getCourseById(courseId: string): CourseDefinition {
  const match = COURSE_CATALOG.find((course) => course.id === courseId);
  if (!match) {
    throw new Error(`Unsupported course id: ${courseId}`);
  }
  return match;
}

export function formatOrdinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

export function getAcademicYearLabel(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}

export function getCourseSessionLabel(startYear: number, durationYears: number): string {
  return `${startYear}-${startYear + durationYears}`;
}

export function buildDefaultReferenceNo(course: CourseDefinition, startYear: number, enrollmentNo: string): string {
  const prefix = course.id === "b-pharm" || course.id === "d-pharm" || course.id === "b-pharm-lateral" ? "OSSPCE" : "OSSCPS";
  return `${prefix}/${course.referenceCode}-${startYear}/${enrollmentNo}`;
}
