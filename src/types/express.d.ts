import type { User } from "@supabase/supabase-js";
import type { UserRole } from "./user";

declare global {
  namespace Express {
    interface Request {
      user?: User & { role: UserRole };
    }
  }
}

export {};
