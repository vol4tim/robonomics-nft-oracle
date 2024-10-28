import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import config from "../../config";
import logger from "../../utils/logger";

let api = null;
let provider = null;

export function getProvider() {
  if (provider) {
    return provider;
  }
  provider = new WsProvider(config.PARACHAIN_ENDPOINT);
  provider.on("connected", () => {
    logger.info("Connected provider");
  });
  provider.on("disconnected", () => {
    logger.warn("Disconnected provider");
  });
  provider.on("error", (e) => {
    logger.error(`Error provider ${e.message}`);
  });
  return provider;
}

export function getInstance() {
  if (api) {
    return new Promise(function (resolve) {
      resolve(api);
    });
  }
  return ApiPromise.create({
    provider: getProvider(),
    types: config.CHAIN_TYPES,
  }).then((r) => {
    api = r;
    return r;
  });
}

export async function getLastBlock() {
  return Number((await api.rpc.chain.getBlock()).block.header.number);
}

export async function disconnect() {
  await api.disconnect();
  await provider.disconnect();
  api = null;
  provider = null;
}

export function getSigner() {
  const keyring = new Keyring({ type: "sr25519" });
  const account = keyring.addFromUri(config.SIGNER_PARACHAIN);
  return account;
}

export async function signAndSend(api, account, tx, options = {}) {
  // if (this.subscription && this.rws) {
  //   if (!this.rws.isSubscription(this.subscription)) {
  //     throw new Error(`Not subscription for ${this.subscription}`);
  //   }
  //   const devices = (await this.rws.getDevices(this.subscription)).map((item) =>
  //     encodeAddress(item.toString())
  //   );
  //   if (!devices.includes(encodeAddress(account.address))) {
  //     throw new Error(
  //       `Not device ${account.address} for ${this.subscription}`
  //     );
  //   }
  //   tx = this.rws.call(this.subscription, tx);
  // }
  return new Promise((resolve, reject) => {
    tx.signAndSend(account, options, (result) => {
      if (result.status.isInBlock) {
        result.events.forEach(async (events) => {
          const {
            event: { method, section },
            phase,
          } = events;
          if (section === "system" && method === "ExtrinsicFailed") {
            let message = "Error";
            if (result.dispatchError?.isModule) {
              const mod = result.dispatchError.asModule;
              const { docs, name, section } = mod.registry.findMetaError(mod);
              console.log(name, section, docs);
              message = docs.join(", ");
            }
            return reject(new Error(message));
          } else if (section === "system" && method === "ExtrinsicSuccess") {
            const block = await api.rpc.chain.getBlock(
              result.status.asInBlock.toString()
            );
            resolve({
              block: result.status.asInBlock.toString(),
              blockNumber: block.block.header.number.toNumber(),
              txIndex: phase.asApplyExtrinsic.toHuman(),
              tx: tx.hash.toString(),
            });
          }
        });
      }
    }).catch(reject);
  });
}

export async function setSubscribe(address) {
  const api = await getInstance();
  const signer = getSigner();
  const tx = api.tx.rws.setSubscription(address, {
    Daily: {
      days: 30,
    },
  });
  return await signAndSend(api, signer, tx);
}

export async function checkSubscription(address) {
  const api = await getInstance();

  const ledger = await api.query.rws.ledger(address);

  const DAYS_TO_MS = 24 * 60 * 60 * 1000;
  const validUntil = () => {
    if (!hasSubscription()) {
      return null;
    }
    if (ledger.value.kind.isLifetime) {
      return null;
    }
    const issue_time = ledger.value.issueTime.toNumber();
    let days = 0;
    if (ledger.value.kind.isDaily) {
      days = ledger.value.kind.value.days.toNumber();
    }
    return issue_time + days * DAYS_TO_MS;
  };

  const hasSubscription = () => {
    return !ledger.isEmpty;
  };

  const isActive = () => {
    if (
      !hasSubscription() ||
      (validUntil() !== null && Date.now() > validUntil())
    ) {
      return false;
    }
    return true;
  };

  return isActive();
}
