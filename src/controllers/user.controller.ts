import { Request, Response } from "express";
import AppError from "../errors/AppError";
import AuthService from "../services/auth.service";
import UserService from "../services/user.service";
import { UpdateUserBody } from "../types/user";

const UserController = {
  updateUser: async (req: Request<{}, {}, { body: string }>, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const body: UpdateUserBody = JSON.parse(req.body.body);

    const { name, phone, idNumber, dateOfBirth, removeProfileImg } = body;

    const file = req.file;

    try {
      const user = await AuthService.getUser(token);

      await UserService.updateUser(
        user.data.user.id,
        typeof name === "string" ? name.trim() : name,
        phone,
        idNumber,
        dateOfBirth,
        undefined,
        file,
        Boolean(removeProfileImg),
      );
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({ message: "Updated successfully" });
  },
};

export default UserController;
