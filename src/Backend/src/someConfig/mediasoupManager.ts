// import type { WebRtcTransport,
//   Producer,Consumer,
//   RtpCapabilities,MediaKind,
//   RtpParameters, AppData} from  "./types/mediasoup";
import { mediasoupConfig } from "./mediaSoupConfig";// Import your config file
import { getRouter } from "./worker";
import * as mediasoup from "mediasoup";

// let worker: Worker;
// let router: Router;
//const transports = new Map<string, WebRtcTransport>();
const transports = new Map<string, any>(); 

type MyAppData = {
  role: string;
  roomId: string;
};


//WebRTC transport created
export const createWebRtcTransport = async (): Promise<mediasoup.types.WebRtcTransport<MyAppData>> => { //options: mediasoupTypes.WebRtcTransportOptions
  const router = getRouter();  //creater the router instance
  const transport = await router.createWebRtcTransport(mediasoupConfig.webRtcTransport);
    console.log("✅ WebRTC Transport created");

    // Store transport in the map
    transports.set(transport.id, transport);
    return transport as mediasoup.types.WebRtcTransport<MyAppData>;
};

//WebRTC producers has been created
export const createProducer = async (
  transport:mediasoup.types.WebRtcTransport,
  track: MediaStreamTrack, 
  rtpParameters: mediasoup.types.RtpParameters):Promise<mediasoup.types.Producer>=> {
  const producer = await transport.produce({
    kind: track.kind as mediasoup.types.MediaKind,  // Explicitly cast, Audio or Video
    rtpParameters,  // Required for RTP transmission 
  });
  console.log("✅ Producer created");
  return producer;
};

//WebRTC consumer has been created
export const createConsumer = async (
  transport:mediasoup.types.WebRtcTransport,
  producerId:string,
  rtpCapabilities:mediasoup.types.RtpCapabilities
):Promise<mediasoup.types.Consumer> => {
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


export const getTransportById = (id: string): mediasoup.types.WebRtcTransport | undefined => {
  return transports.get(id)as mediasoup.types.WebRtcTransport;  // Retrieve transport by ID
};