import * as mediaSoup from "mediasoup";
import {mediasoupConfig} from "./mediaSoupConfig";

let worker: mediaSoup.types.Worker;
let router: mediaSoup.types.Router;

export const initializeWorker = async () => {
  worker = await mediaSoup.createWorker(mediasoupConfig.worker);
  console.log("✅ Mediasoup Worker created");

  router = await worker.createRouter(mediasoupConfig.router);
  console.log("✅ Mediasoup Router created");
};

export const getWorker = () => worker;
export const getRouter = () => router;
