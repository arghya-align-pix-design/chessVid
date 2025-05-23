import {
  WebRtcTransport,
  WebRtcTransportOptions,
  Producer,
  Consumer,
  RtpParameters,
  MediaKind,
  RtpCapabilities,
} from 'mediasoup/node/lib/types';

export type {
  WebRtcTransport,
  WebRtcTransportOptions,
  Producer,
  Consumer,
  RtpParameters,
  MediaKind,
  RtpCapabilities,
};
export interface WorkerSettings {
  logLevel?: 'debug' | 'warn' | 'error' | 'none';
  logTags?: Array<
    | 'info'
    | 'ice'
    | 'dtls'
    | 'rtp'
    | 'srtp'
    | 'rtcp'
    | 'rtx'
    | 'bwe'
    | 'score'
    | 'simulcast'
    | 'svc'
    | 'sctp'
  >;
  rtcMinPort?: number;
  rtcMaxPort?: number;
  dtlsCertificateFile?: string;
  dtlsPrivateKeyFile?: string;
}

export interface RouterOptions {
  mediaCodecs: RtpCodecCapability[];
  appData?: Record<string, unknown>;
}

// export interface WebRtcTransportOptions {
//   listenIps: Array<{ ip: string; }>;  //announcedIp?: string 
//   enableUdp?: boolean;
//   enableTcp?: boolean;
//   preferUdp?: boolean;
//   preferTcp?: boolean;
//   initialAvailableOutgoingBitrate?: number;
//   minimumAvailableOutgoingBitrate?: number;
//   maxSctpMessageSize?: number;
//   appData?: Record<string, unknown>;
//   enableSctp?: boolean;
//   numSctpStreams?: {
//     OS: number;
//     MIS: number;
//   };
// }

export interface WebRtcTransport <AppData = Record<string, unknown>> {
  id: string;
  closed: boolean;
  appData?: AppData;//Record<string, unknown>;
  dtlsParameters: DtlsParameters;
  iceCandidates: IceCandidate[];
  iceParameters: IceParameters;
  sctpParameters?: SctpParameters;

  // 🧠 Add this to fix your error
  produce:<ProducerAppData = AppData> (options: {
    kind: MediaKind;
    rtpParameters: RtpParameters;
    appData?: ProducerAppData;//Record<string, unknown>;
  }) => Promise<Producer<ProducerAppData>>;
}

export interface DtlsParameters {
  role?: 'auto' | 'client' | 'server';
  fingerprints: Array<{ algorithm: string; value: string }>;
}

export interface IceParameters {
  usernameFragment: string;
  password: string;
  iceLite?: boolean;
}

export interface IceCandidate {
  foundation: string;
  priority: number;
  ip: string;
  protocol: 'udp' | 'tcp';
  port: number;
  type: 'host' | 'srflx' | 'prflx' | 'relay';
  tcpType?: 'active' | 'passive' | 'so';
}

export interface SctpParameters {
  port: number;
  OS: number;
  MIS: number;
  maxMessageSize: number;
}


// 🔽 CUSTOM TYPES FOR FRONTEND & BACKEND USE 🔽

export type MediaKind = 'audio' | 'video';

export interface RtpCapabilities {
  codecs: RtpCodecCapability[];
  headerExtensions: RtpHeaderExtension[];
  fecMechanisms?: string[];
}

export interface RtpCodecCapability {
  kind: MediaKind;
  mimeType: string;
  preferredPayloadType?: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: Array<{ type: string; parameter?: string }>;
}

export interface RtpHeaderExtension {
  kind: MediaKind;
  uri: string;
  preferredId: number;
  preferredEncrypt?: boolean;
  direction?: 'sendrecv' | 'sendonly' | 'recvonly' | 'inactive';
}

export interface RtpHeaderExtensionParameters {
  id: number;                 // mandatory!
  uri: string;
  encrypt?: boolean;
  // any other properties Mediasoup expects
}

export interface RtpParameters {
  mid?: string;
  codecs: RtpCodecParameters[];
  headerExtensions?: RtpHeaderExtensionParameters[];
  encodings?: RtpEncodingParameters[];
  rtcp?: RtcpParameters; //{
  //   cname?: string;
  //   reducedSize?: boolean;
  //   mux?: boolean;
  // };
}

export interface RtpCodecParameters {
  mimeType: string;
  payloadType: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: Array<{ type: string; parameter?: string }>;
}

export interface RtpEncodingParameters {
  ssrc?: number;
  rid?: string;
  codecPayloadType?: number;
  maxBitrate?: number;
  minBitrate?: number;
  maxFramerate?: number;
  scaleResolutionDownBy?: number;
  scalabilityMode?: string;
}

export interface Producer <AppData = Record<string, unknown>> {
  id: string;
  kind: MediaKind;
  //rtpParameters: RtpParameters;
  
  paused: boolean;
  close: () => void;
  appData?: AppData; //Record<string, unknown>;
}

export interface Consumer {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  type: 'simple' | 'simulcast' | 'svc' | 'pipe';
  paused: boolean;
  appData?: Record<string, unknown>;
}

// export interface RtpHeaderExtensionParameters {
//   id: number;                 // mandatory!
//   uri: string;
//   encrypt?: boolean;
//   // any other properties Mediasoup expects
// }

// You can import from here like:
// import type { WebRtcTransportOptions, RtpCapabilities, Producer } from './someConfig/mediasoup.d.ts';