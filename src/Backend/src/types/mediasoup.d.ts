export interface RtpCapabilities {
  codecs: any[]; 
  // codecs: RtpCodecCapability[];
  headerExtensions?: RtpHeaderExtension[];
  fecMechanisms?: string[];
}

export interface RtpCodecCapability {
  mimeType: string;
  kind: 'audio' | 'video';
  preferredPayloadType?: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: RtcpFeedback[];
}

export interface RtpHeaderExtension {
  uri: string;
  id: number;
  encrypt?: boolean;
  parameters?: Record<string, unknown>;
}

export interface RtcpFeedback {
  type: string;
  parameter?: string;
}

export interface RtpParameters {
  mid?: string;
  codecs: RtpCodecParameters[];
  headerExtensions?: RtpHeaderExtension[];
  encodings: RtpEncodingParameters[];
  rtcp?: RtcpParameters;
}

export interface RtpCodecParameters {
  mimeType: string;
  payloadType: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
}

export interface RtpEncodingParameters {
  ssrc?: number;
  rid?: string;
  rtx?: {
    ssrc: number;
  };
  scalabilityMode?: string;
}

export interface RtcpParameters {
  cname?: string;
  reducedSize?: boolean;
  mux?: boolean;
}

// Mediasoup Node-side
export interface WebRtcTransport {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
  sctpParameters?: SctpParameters;
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

export interface DtlsParameters {
  role?: 'auto' | 'client' | 'server';
  fingerprints: {
    algorithm: string;
    value: string;
  }[];
}

export interface Producer {
  id: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}

export interface Consumer {
  id: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}