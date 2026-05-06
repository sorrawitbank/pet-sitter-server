import { NextFunction, Request, Response } from "express";
import multer from "multer";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const imageMimeFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = ["image/png", "image/jpg", "image/jpeg"];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Only .png .jpg .jpeg allowed"));
  } else {
    cb(null, true);
  }
};

const imageUpload = multer({
  storage,
  limits: { fieldSize: MAX_SIZE, files: 1 },
  fileFilter: imageMimeFilter,
});

const sitterProfileUpload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 11 },
  fileFilter: imageMimeFilter,
}).fields([
  { name: "profileImage", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

const finishMulter = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }

  if (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "File upload error",
    });
  }

  next();
};

const UploadMiddleware = {
  requireFile: (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.file) {
        return res.status(400).json({
          message: `${fieldName.slice(0, 1).toUpperCase()}${fieldName.slice(
            1,
          )} is required`,
        });
      }

      next();
    };
  },

  singleImage: (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      imageUpload.single(fieldName)(req, res, (error) =>
        finishMulter(error, res, next),
      );
    };
  },

  uploadSitterProfile: (req: Request, res: Response, next: NextFunction) => {
    sitterProfileUpload(req, res, (error) => finishMulter(error, res, next));
  },
};

export default UploadMiddleware;
