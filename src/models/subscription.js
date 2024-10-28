import db from "./db";

const Subscription = db.sequelize.define("subscription", {
  addressEthereum: {
    type: db.Sequelize.STRING,
    unique: true,
  },
  addressParachain: {
    type: db.Sequelize.STRING,
    unique: true,
  },
  tokenId: {
    type: db.Sequelize.INTEGER,
    unique: true,
  },
  blockNumber: {
    type: db.Sequelize.INTEGER,
  },
  txIndex: {
    type: db.Sequelize.INTEGER,
  },
});

export default Subscription;
