// import type { WebRtcTransport,
//   Producer,Consumer,
//   RtpCapabilities,MediaKind,
//   RtpParameters, AppData} from  "./types/mediasoup";
import { mediasoupConfig } from "./mediaSoupConfig";// Import your config file
import { getRouter } from "./worker";
import * as mediasoup from "mediasoup";

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

export const connectWebRtcTransport = async (
  transportId: string,
  dtlsParameters: mediasoup.types.DtlsParameters
) => {
  const transport = transports.get(transportId);
  if (!transport) throw new Error("Transport not found");

  await transport.connect({ dtlsParameters });
  console.log("✅ Transport connected:", transportId);
};

//WebRTC producers has been created
export const createProducer = async (
  transport:mediasoup.types.WebRtcTransport,
  kind:mediasoup.types.MediaKind,
  // track: MediaStreamTrack,
  rtpParameters: mediasoup.types.RtpParameters):Promise<mediasoup.types.Producer>=> {
  const producer = await transport.produce({
    kind,
    rtpParameters,  // Required for RTP transmission
  });
  console.log("✅ Producer created of kind:",kind," from mediasoupManager");
  return producer;
};

//WebRTC consumer has been created
export const createConsumer = async(
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
  console.log("✅ Consumer created of from mediasoupManager",);
  return consumer;
};


export const getTransportById = (id: string): mediasoup.types.WebRtcTransport | undefined => {
  return transports.get(id)as mediasoup.types.WebRtcTransport;  // Retrieve transport by ID
};

export const closeUserTransports = (roomId: string) => {
  for (const [id, transport] of transports.entries()) {
    if (transport.appData.roomId === roomId) {
      transport.close();
      transports.delete(id);
      console.log("🧹 Closed transport:", id);
    }
  }
};