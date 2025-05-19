import os from "os";
import { WorkerSettings, RouterOptions, WebRtcTransportOptions } from "mediasoup/node/lib/types";

export const mediasoupConfig = {
  worker: <WorkerSettings>{
    logLevel: "warn",
    logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
    // rtcMinPort: 2000,
    // rtcMaxPort: 3000,
    rtcMinPort: 10000,
    rtcMaxPort: 60000,
    workerCount: Math.max(1, os.cpus().length - 1),
  },

  router: <RouterOptions>{
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/vp8",
        clockRate: 90000,
      },
      {
        kind: "video",
        mimeType: "video/h264",
        clockRate: 90000,
        parameters: { "packetization-mode": 1 },
      },
      // {
      //   kind: "video",
      //   mimeType: "video/av1",
      //   clockRate: 90000,
      // },
    ],
  },

  webRtcTransport: <WebRtcTransportOptions>{
    listenInfos: [{ ip: "0.0.0.0",
      //announcedIp: " 192.168.29.111", // <- IMPORTANT! Replace with your actual public IP
      protocol: "udp", // You can also use 'udp/tcp' if needed
     }],  //, announcedIp: "YOUR_PUBLIC_IP"
    maxSctpMessageSize: 262144, // Increase SCTP size for large messages
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    //maxIncomingBitrate: 1000000, // Limit bandwidth
    maxIncomingBitrate: 1500000, // Increased bitrate for better video quality
    initialAvailableOutgoingBitrate: 1000000,
    //initialAvailableOutgoingBitrate: 1500000,
    //maxSctpMessageSize: 262144,
  } as WebRtcTransportOptions,

  roomSettings: {
    maxPlayers: 2,
    maxAudience: 10,
    chatModes: {
      friendly: {
        audienceCanTalk: true,
      },
      championship: {
        audienceCanTalk: false,
      },
    },
  },
};
