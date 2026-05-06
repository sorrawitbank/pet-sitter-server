import { NextFunction, Request, Response } from "express";
import { UpdateUserBody, UserIdParams } from "../types/user";
import {
  dateRegex,
  idNumberRegex,
  nameRegex,
  phoneRegex,
  uuidRegex,
} from "../utils/regex";
import validateIdNumber from "../utils/validateIdNumber";

const UserMiddleware = {
  userId: (req: Request<UserIdParams>, res: Response, next: NextFunction) => {
    const userId = req.params.userId;

    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    next();
  },

  updateUserBody: (
    req: Request<{}, {}, { body: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.body?.body) {
      return res.status(400).json({ error: "Body is required" });
    }

    let body: UpdateUserBody;

    try {
      body = JSON.parse(req.body.body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    if (!Object.keys(body).length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { name, phone, idNumber, dateOfBirth, removeProfileImg } = body;

    if (
      !(
        name !== undefined ||
        phone !== undefined ||
        idNumber !== undefined ||
        dateOfBirth !== undefined
      )
    ) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Type validations
    if (name !== undefined) {
      if (typeof name !== "string") {
        return res.status(400).json({ error: "Name must be a string" });
      }

      if (!nameRegex.test(name)) {
        return res.status(400).json({ error: "Invalid name" });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({
          error: "Name must be at least 2 characters long",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          error: "Name must be less than 100 characters",
        });
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({ error: "Phone must be a string" });
      }

      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
    }

    if (idNumber !== undefined && idNumber !== null) {
      if (typeof idNumber !== "string") {
        return res.status(400).json({ error: "ID number must be a string" });
      }

      if (!(idNumberRegex.test(idNumber) && validateIdNumber(idNumber))) {
        return res.status(400).json({ error: "Invalid ID number" });
      }
    }

    if (dateOfBirth !== undefined && dateOfBirth !== null) {
      if (!dateRegex.test(dateOfBirth)) {
        return res.status(400).json({ error: "Invalid date of birth" });
      }

      const date = new Date(dateOfBirth);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date of birth" });
      }

      if (date > new Date()) {
        return res.status(400).json({
          error: "Date of birth must be in the past",
        });
      }
    }

    if (
      removeProfileImg !== undefined &&
      typeof removeProfileImg !== "boolean"
    ) {
      return res.status(400).json({
        error: "Remove profile image must be a boolean",
      });
    }

    next();
  },
};

export default UserMiddleware;
