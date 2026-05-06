import { NextFunction, Request, Response } from "express";
import { GetOwnersQuery } from "../types/owner";

const OwnerMiddleware = {
  getOwnersQuery: (
    req: Request<{}, {}, {}, GetOwnersQuery>,
    res: Response,
    next: NextFunction,
  ) => {
    const { page, limit } = req.query;
    const parsedPage = Number(page);
    const parsedlimit = Number(limit);

    if (
      !(
        (page === undefined ||
          (Number.isInteger(parsedPage) && parsedPage > 0)) &&
        (limit === undefined ||
          (Number.isInteger(parsedlimit) && parsedlimit > 0))
      )
    ) {
      return res.status(400).json({
        error: "Page and limit must be positive integers",
      });
    }

    if (parsedlimit > 20) {
      return res.status(400).json({
        error: "Limit must be less than or equal to 20",
      });
    }

    next();
  },
};

export default OwnerMiddleware;
