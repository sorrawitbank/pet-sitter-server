import { Request, Response } from "express";
import AppError from "../errors/AppError";
import AuthService from "../services/auth.service";
import SitterService from "../services/sitter.service";
import { LoginBody, RegisterBody, ResetPasswordBody } from "../types/auth";

const AuthController = {
  register: async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    const { email, phone, password, role } = req.body;

    try {
      await AuthService.register(email, phone, password, role);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({
        error: "An error occurred during registration",
      });
    }

    return res.status(201).json({ message: "User registered successfully" });
  },

  login: async (req: Request<{}, {}, LoginBody>, res: Response) => {
    const { email, password } = req.body;
    let accessToken;

    try {
      accessToken = await AuthService.login(email, password);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "An error occurred during login" });
    }

    return res.status(200).json({
      message: "Logged in successfully",
      accessToken,
    });
  },

  getUser: async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    let result;

    try {
      result = await AuthService.getUser(token);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    let sitterId: number | undefined = undefined;
    if (result.user.role === "sitter") {
      try {
        const sitter = await SitterService.getSitterByUserId(
          result.data.user.id,
        );
        sitterId = sitter.petSitterId;
      } catch {
        // non-fatal — sitter profile may not exist yet
        sitterId = undefined;
      }
    }

    const userResponse = {
      id: result.data.user.id,
      email: result.data.user.email,
      name: result.user.name,
      phone: result.user.phone,
      idNumber: result.user.idNumber,
      dateOfBirth: result.user.dateOfBirth,
      profileImgUrl: result.user.profileImgUrl,
      role: result.user.role,
      sitterId,
    };

    return res.status(200).json(userResponse);
  },

  resetPassword: async (
    req: Request<{}, {}, ResetPasswordBody>,
    res: Response,
  ) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const { oldPassword, newPassword } = req.body;

    try {
      await AuthService.resetPassword(token, oldPassword, newPassword);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({ message: "Password reset successfully" });
  },
};

export default AuthController;
