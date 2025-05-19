//import { WebRtcTransport,Producer, Consumer, RtpCapabilities} from "mediasoup";
import { WebRtcTransport,
  Producer,Consumer,
  RtpCapabilities,MediaKind,
  RtpParameters} from  "mediasoup/node/lib/types";
import { mediasoupConfig } from "./mediaSoupConfig";// Import your config file
import { getRouter } from "./worker";
import * as mediasoupTypes from "mediasoup/node/lib/types";

// let worker: Worker;
// let router: Router;
const transports = new Map<string, WebRtcTransport>();
  
//WebRTC transport created
export const createWebRtcTransport = async (): Promise<mediasoupTypes.WebRtcTransport | null> => { //options: mediasoupTypes.WebRtcTransportOptions
  const router = getRouter();  //creater the router instance
  const transport = await router.createWebRtcTransport(mediasoupConfig.webRtcTransport);
    console.log("✅ WebRTC Transport created");

    // Store transport in the map
    transports.set(transport.id, transport);
    return transport;
};

//WebRTC producers has been created
export const createProducer = async (
  transport:WebRtcTransport,
  track: MediaStreamTrack, 
  rtpParameters: RtpParameters):Promise<Producer>=> {
  const producer = await transport.produce({
    kind: track.kind as MediaKind,  // Explicitly cast, Audio or Video
    rtpParameters,  // Required for RTP transmission 
  });
  console.log("✅ Producer created");
  return producer;
};

//WebRTC consumer has been created
export const createConsumer = async (
  transport:WebRtcTransport,
  producerId:string,
  rtpCapabilities:RtpCapabilities
):Promise<Consumer> => {
  const router = getRouter();
  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error("Cannot consume this producer");
  }
  const consumer = await transport.consume({
    producerId, 
    rtpCapabilities,
    paused:true
  });
  console.log("✅ Consumer created");
  return consumer;
};


export const getTransportById = (id: string): WebRtcTransport | undefined => {
  return transports.get(id);  // Retrieve transport by ID
};