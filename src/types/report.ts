import { reports } from "../db/schema";

export type ReportStatus = (typeof reports.$inferSelect)["status"];

const REPORT_STATUS: readonly ReportStatus[] = [
  "New Report",
  "Pending",
  "Resolved",
  "Canceled",
];

const AllowedReportStatus = [
  "all",
  "new_report",
  "pending",
  "resolved",
  "canceled",
];

const REPORT_STATUS_OPTIONS = [
  { value: "new_report", label: "New Report" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "canceled", label: "Canceled" },
];

export interface AdminGetReportsQuery {
  status?: ReportStatus;
  currentPage: number;
  limit: number;
}

export { REPORT_STATUS,AllowedReportStatus,REPORT_STATUS_OPTIONS };
