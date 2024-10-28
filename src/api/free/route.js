import express from "express";
import controller from "./controller";

const router = express.Router();

router.post("/verify", controller.verify);
router.post("/check", controller.check);

export default router;
