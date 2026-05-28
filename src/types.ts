export interface NfeItem {
  key: string;
  number: string;
  cnpjEmit: string;
  serie: string;
  ufCode: string;
  status: "pending" | "downloading" | "success" | "error";
  errorMsg?: string;
  xmlContent?: string;
  isValidDv: boolean;
  retries: number;
}

export interface LoteHistory {
  id: string;
  name: string;
  date: string;
  totalKeys: number;
  downloadedKeys: number;
  cnpjEmit: string;
  zipFileName: string;
  keysList: string[];
}

export interface SystemConfig {
  mode: "real" | "simulation";
  apiKey: string;
  apiUrl: string;
  concurrency: number;
  maxRetries: number;
  simulateDelay: boolean;
  autoZip: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "success" | "error";
  message: string;
}
