import { ethers } from "ethers";
import config from "../../config";

export function getInstance() {
  return new ethers.WebSocketProvider(config.ETHEREUM_ENDPOINT);
}
