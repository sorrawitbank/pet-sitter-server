import { NextFunction, Request, Response } from "express";
import { User } from "@supabase/supabase-js";
import UserRepository from "../repositories/user.repository";
import supabaseClient from "../supabase/client";
import { UserRole } from "../types/user";

type RequestWithUser = Request & { user?: User & { role: UserRole } };

function protect(role: UserRole, message: string) {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    try {
      const { data, error: authError } = await supabaseClient.auth.getUser(
        token,
      );

      if (authError || !data.user) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }

      const result = await UserRepository.getById(data.user.id);

      if (!result) {
        return res.status(404).json({ error: "User not found" });
      }

      req.user = { ...data.user, role: result.role };

      if (req.user.role !== role) {
        return res.status(403).json({ error: message });
      }
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }

    next();
  };
}

function protectAny(roles: UserRole[], message: string) {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    try {
      const { data, error: authError } = await supabaseClient.auth.getUser(
        token,
      );

      if (authError || !data.user) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }

      const result = await UserRepository.getById(data.user.id);

      if (!result) {
        return res.status(404).json({ error: "User not found" });
      }

      req.user = { ...data.user, role: result.role };

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: message });
      }
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }

    next();
  };
}

const ProtectMiddleware = {
  owner: protect("owner", "Forbidden: You do not have pet owner access"),

  sitter: protect("sitter", "Forbidden: You do not have pet sitter access"),

  ownerOrSitter: protectAny(
    ["owner", "sitter"],
    "Forbidden: You do not have owner or pet sitter access",
  ),

  admin: protect("admin", "Forbidden: You do not have admin access"),
};

export default ProtectMiddleware;
