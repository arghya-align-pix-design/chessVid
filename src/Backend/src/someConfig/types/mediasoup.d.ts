
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

export interface WebRtcTransportOptions {
  listenIps: Array<{ ip: string; }>;  //announcedIp?: string 
  enableUdp?: boolean;
  enableTcp?: boolean;
  preferUdp?: boolean;
  preferTcp?: boolean;
  initialAvailableOutgoingBitrate?: number;
  minimumAvailableOutgoingBitrate?: number;
  maxSctpMessageSize?: number;
  appData?: Record<string, unknown>;
  enableSctp?: boolean;
  numSctpStreams?: {
    OS: number;
    MIS: number;
  };
}