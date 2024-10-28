import { ethers } from "ethers";
import config from "../../config";
import Subscription from "../../models/subscription";
import logger from "../../utils/logger";
import nft_abi from "./abi/NFT.json";
import { getInstance as getInstanceEthereum } from "./ethereum";
import { checkSubscription, setSubscribe } from "./parachain";

const verifyMessage = ({ message, address, signature }) => {
  try {
    const signerAddr = ethers.verifyMessage(message, signature);
    if (signerAddr !== ethers.getAddress(address)) {
      return false;
    }
    return true;
  } catch (err) {
    logger.error(err.message);
    return false;
  }
};

async function availible(tokenId, addressEthereum) {
  const row = await Subscription.findOne({ where: { tokenId: tokenId } });
  if (row) {
    throw new Error("Free minimum for this token has already been received");
  }

  const provider = getInstanceEthereum();
  const nftContract = new ethers.Contract(
    config.CONTRACTS.NFT,
    nft_abi,
    provider
  );

  const owner = await nftContract.ownerOf(tokenId);
  if (owner !== addressEthereum) {
    throw new Error("Token owner's address is incorrect");
  }

  const activated = await nftContract.activatedOf(tokenId);
  if (!activated) {
    throw new Error("Token not activated");
  }

  return true;
}

export default {
  async check(req, res) {
    const tokenId = req.body.nft;
    const address = ethers.getAddress(req.body.address);

    try {
      await availible(tokenId, address);
      res.send({
        result: true,
      });
    } catch (error) {
      res.send({
        error: error.message,
      });
    }
  },
  async verify(req, res) {
    const tokenId = req.body.nft;
    const addressEthereum = ethers.getAddress(req.body.address);
    const addressParachain = req.body.for;

    try {
      await availible(tokenId, addressEthereum);

      if (await checkSubscription(addressParachain)) {
        return res.send({
          error: "Subscription already",
        });
      }

      const message = JSON.stringify({
        nft: tokenId,
        address: req.body.address,
        for: addressParachain,
      });

      const result = verifyMessage({
        signature: req.body.signature,
        address: addressEthereum,
        message: message,
      });

      if (result) {
        const result = await setSubscribe(addressParachain);
        const r = await Subscription.create({
          addressEthereum: addressEthereum,
          addressParachain,
          tokenId,
          blockNumber: result.blockNumber,
          txIndex: result.txIndex,
        });
        if (r) {
          res.send({
            result: true,
          });
        } else {
          res.send({
            error: "Failed to free minimum",
          });
        }
      } else {
        res.send({
          error: "Bad signature",
        });
      }
    } catch (error) {
      res.send({
        error: error.message,
      });
    }
  },
};
