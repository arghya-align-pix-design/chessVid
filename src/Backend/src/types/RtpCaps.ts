export interface RtpCapabilities {
  codecs: any[]; 
  // codecs: RtpCodecCapability[];
  headerExtensions?: RtpHeaderExtension[];
  fecMechanisms?: string[];
}

export interface RtpHeaderExtension {
  uri: string;
  id: number;
  encrypt?: boolean;
  parameters?: Record<string, unknown>;
}

