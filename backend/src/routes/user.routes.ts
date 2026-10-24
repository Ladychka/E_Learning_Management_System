import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createUserSchema, updateUserSchema, userQuerySchema } from "../validations/user.schema";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  suspendUser,
  reactivateUser,
} from "../controllers/user.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(userQuerySchema),
  getUsers
);
router.get("/:id", authenticate, getUserById);
router.post("/", authenticate, authorize("ADMIN"), validate(createUserSchema), createUser);
router.patch("/:id", authenticate, authorize("ADMIN"), validate(updateUserSchema), updateUser);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteUser);
router.post("/:id/suspend", authenticate, authorize("ADMIN"), suspendUser);
router.post("/:id/reactivate", authenticate, authorize("ADMIN"), reactivateUser);

export { router as userRouter };