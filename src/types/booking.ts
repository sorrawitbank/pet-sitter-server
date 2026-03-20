import { ParamsDictionary } from "express-serve-static-core";
import { User } from "@supabase/supabase-js";
import { UserRole } from "./user";
import { Request } from "express";

export interface BookingIdParams extends ParamsDictionary {
  bookingId: string;
}

export interface GetBookingsFilter {
  petSitterId?: number;
  petOwnerId?: string;
}

export type RequestWithUser = Request & { user?: User & { role: UserRole } };

export interface GetBookingListsQuery {
  keyword?: string;
  status?: string;
  currentPage?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface GetBookingsInDateRangeQuery {
  start: string;
  end: string;
}

export const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "waiting_confirm", label: "Waiting for confirm" },
  { value: "waiting_service", label: "Waiting for service" },
  { value: "in_service", label: "In service" },
  { value: "success", label: "Success" },
  { value: "canceled", label: "Canceled" },
];

export type UpdateBookingTimeInput = {
  bookingId: number;
  startTime: string;
  endTime: string;
};

export interface UpdateBookingTimeParams {
  bookingId: string;
  [key: string]: string;
}

export interface UpdateBookingTimeBody {
  startTime: string;
  endTime: string;
}

export type UpdateBookingTimeRequest = Request<
  UpdateBookingTimeParams,
  unknown,
  UpdateBookingTimeBody
>;
export type CreateBookingInput = {
  petOwnerId: string;
  petSitterId: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  note?: string;
  petIds?: number[];
};
