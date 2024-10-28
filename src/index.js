import cors from "cors";
import express from "express";
import free from "./api/free/route";
import config from "./config";
import db from "./models/db";
import createServer from "./server";
import logger from "./utils/logger";

const app = express();
const server = createServer(app);
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());
app.use("/api", free);

db.sequelize
  .sync()
  .then(() => {
    server.listen(config.SERVER.PORT, config.SERVER.HOST, "", () => {
      logger.info(
        "Web listening " + config.SERVER.HOST + " on port " + config.SERVER.PORT
      );
    });
  })
  .catch((e) => {
    logger.error(e.message);
  });
