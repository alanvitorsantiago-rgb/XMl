import { Terminal, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { ActivityLog } from "../types";

interface LogsPanelProps {
  logs: ActivityLog[];
  onClear: () => void;
}

export default function LogsPanel({ logs, onClear }: LogsPanelProps) {
  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden text-slate-200 shadow-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0a0a0f]/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">Painel Auditoria de Logs</span>
          <span className="bg-white/10 text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded border border-white/5 font-semibold leading-none">
            {logs.length}
          </span>
        </div>
        
        {logs.length > 0 && (
          <button
            id="clear-logs-btn"
            onClick={onClear}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-400 font-medium transition-colors cursor-pointer py-1 px-2 rounded hover:bg-white/5 border border-transparent hover:border-white/5"
          >
            <Trash2 className="w-3 h-3" /> Limpar log
          </button>
        )}
      </div>

      {/* Terminal Area */}
      <div id="logs-terminal" className="flex-1 overflow-y-auto p-3.5 space-y-2 font-mono text-[11px] leading-relaxed select-text min-h-[140px] max-h-[300px]">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-1 py-6 text-center">
            <Terminal className="w-5 h-5 text-slate-700 animate-pulse" />
            <span className="text-slate-550 font-sans">Nenhuma atividade operacional registrada</span>
            <span className="text-slate-600 font-sans text-[10px]">As ações de bipe, validação e downloads aparecerão listadas aqui</span>
          </div>
        ) : (
          logs.map((log) => {
            const dateStr = log.timestamp.substring(11, 19); // HH:MM:SS
            let logColor = "text-slate-400";
            let Icon = Terminal;

            switch (log.type) {
              case "success":
                logColor = "text-emerald-400";
                Icon = CheckCircle2;
                break;
              case "warning":
                logColor = "text-amber-400";
                Icon = AlertTriangle;
                break;
              case "error":
                logColor = "text-rose-400";
                Icon = AlertCircle;
                break;
              case "info":
                logColor = "text-blue-400";
                Icon = Terminal;
                break;
            }

            return (
              <div 
                id={`log-${log.id}`} 
                key={log.id} 
                className={`flex gap-2 p-1.5 rounded bg-white/[0.01] hover:bg-white/5 border-b border-white/5 transition-colors ${logColor}`}
              >
                <span className="text-slate-600 shrink-0 select-none">[{dateStr}]</span>
                <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="flex-1 break-all text-left">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
