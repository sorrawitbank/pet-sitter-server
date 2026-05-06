import db from "../db/db";
import { reports, users } from "../db/schema";
import {
  AdminGetReportsQuery,
  REPORT_STATUS_OPTIONS,
  ReportStatus,
} from "../types/report";
import { and, count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const ReportRepository = {
  getAllReports: async (query: AdminGetReportsQuery) => {
    const { status, currentPage, limit } = query;
    const reporterUser = alias(users, "reporterUser");
    const reportedUser = alias(users, "reportedUser");
    const filters = [];
    
    if (status) {
      const useStatus = REPORT_STATUS_OPTIONS.find(
        (statusOption: { value: string }) => statusOption.value === status,
      );
      if (useStatus) {
        filters.push(eq(reports.status, useStatus?.label as any));
      }
    }
    const whereClause = and(...filters);
    // get total reports
    const total = await db
      .select({ total: count() })
      .from(reports)
      .where(whereClause);
    const totalPages = Math.ceil(total[0].total / limit);
    const page = currentPage > totalPages ? totalPages : currentPage;
    const offset = (page - 1) * limit;

    // get reports
    const result = await db
      .select({
        reportId: reports.reportId,
        reporterName: reporterUser.name,
        reportedName: reportedUser.name,
        issue: reports.issue,
        status: reports.status,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
      })
      .from(reports)
      .where(whereClause)
      .innerJoin(reporterUser, eq(reports.reporterUserId, reporterUser.userId))
      .innerJoin(reportedUser, eq(reports.reportedUserId, reportedUser.userId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(reports.updatedAt));

    return { reports: result, totalPages, totalReports: total[0].total };
  },
  getReportByIdForAdmin: async (reportId: string) => {
    const reporterUser = alias(users, "reporterUser");
    const reportedUser = alias(users, "reportedUser");

    return await db
      .select({
        reportId: reports.reportId,
        reporterName: reporterUser.name,
        reportedName: reportedUser.name,
        issue: reports.issue,
        description: reports.description,
        status: reports.status,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
      })
      .from(reports)
      .innerJoin(reporterUser, eq(reports.reporterUserId, reporterUser.userId))
      .innerJoin(reportedUser, eq(reports.reportedUserId, reportedUser.userId))
      .where(eq(reports.reportId, parseInt(reportId)));
  },
  patchReportStatusByIdForAdmin : async (id: string, status: ReportStatus) => {
    const result = await db
      .update(reports)
      .set({
        status: status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(reports.reportId, parseInt(id)));

    return result;
  },
  deleteReport: async (id: string) => {
    return await db.delete(reports).where(eq(reports.reportId, parseInt(id)));
  },
  createReport: async (payload: {
    reporterUserId: string;
    reportedUserId: string;
    issue: string;
    description?: string | null;
  }) => {
    const [report] = await db
      .insert(reports)
      .values({
        reporterUserId: payload.reporterUserId,
        reportedUserId: payload.reportedUserId,
        issue: payload.issue,
        description: payload.description ?? null,
      })
      .returning();

    return report;
  },

  findDuplicateOpenReport: async (payload: {
    reporterUserId: string;
    reportedUserId: string;
    issue: string;
  }) => {
    const report = await db.query.reports.findFirst({
      where: (reports, { and, eq, isNull }) =>
        and(
          eq(reports.reporterUserId, payload.reporterUserId),
          eq(reports.reportedUserId, payload.reportedUserId),
          eq(reports.issue, payload.issue),
          isNull(reports.resolvedAt),
          isNull(reports.cancelledAt),
        ),
      orderBy: [desc(reports.createdAt)],
    });

    return report;
  },

  getReportById: async (reportId: number) => {
    const report = await db.query.reports.findFirst({
      where: (reports, { eq }) => eq(reports.reportId, reportId),
    });

    return report;
  },
};

export default ReportRepository;