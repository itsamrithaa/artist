import { useState, useEffect, useMemo } from 'react';
import { 
  Beaker, 
  Dna, 
  History, 
  Activity, 
  ShieldCheck, 
  ArrowRight, 
  Download, 
  Trash2,
  BrainCircuit,
  Zap,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import Molecule3D from './components/Molecule3D';
import DecisionChart from './components/DecisionChart';
import { FRAGMENTS, PRESETS, MoleculeMetrics } from './constants';
import { useChemEngine } from './hooks/useChemEngine';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [currentSmiles, setCurrentSmiles] = useState('C');
  const [history, setHistory] = useState<string[]>(['C']);
  const [qValues, setQValues] = useState<number[]>(Array(FRAGMENTS.length).fill(0));
  const [selectedFragment, setSelectedFragment] = useState(FRAGMENTS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [sdf, setSdf] = useState<string | null>(null);
  const [presetValue, setPresetValue] = useState(PRESETS[0].smiles);

  const { isLoaded, calculateMetrics, predictActions, get3DCoords, rdkit } = useChemEngine();

  // Real metrics calculation using RDKit
  const metrics = useMemo<MoleculeMetrics>(() => {
    if (!isLoaded) return { qed: 0, sas: 0, mw: 0, logp: 0 };
    return calculateMetrics(currentSmiles);
  }, [currentSmiles, isLoaded, calculateMetrics]);

  // Real AI Inference with DQN Model
  useEffect(() => {
    if (!isLoaded) return;

    const infer = async () => {
      setIsProcessing(true);
      try {
        const qVals = await predictActions(currentSmiles);
        setQValues(qVals);
        
        // Also update 3D coords
        const coords = get3DCoords(currentSmiles);
        setSdf(coords);
      } catch (e) {
        console.error('Inference failed:', e);
      } finally {
        setIsProcessing(false);
      }
    };
    infer();
  }, [currentSmiles, isLoaded, predictActions, get3DCoords]);

  const bestActionIdx = qValues.indexOf(Math.max(...qValues));
  const suggestion = FRAGMENTS[bestActionIdx];

  const handleAddFragment = () => {
    if (selectedFragment.smiles === 'DONE') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2ff', '#00d9ff', '#ffffff']
      });
      return;
    }

    // Try to merge using RDKit for better chemistry
    let newSmiles = currentSmiles;
    
    if (rdkit) {
      try {
        // Try various bonding strategies
        const strategies = [
          () => rdkit.get_mol(`${currentSmiles}${selectedFragment.smiles}`), // Direct concat (common for simple strings)
          () => rdkit.get_mol(`${currentSmiles}-${selectedFragment.smiles}`), // Single bond
          () => rdkit.get_mol(`${currentSmiles}(${selectedFragment.smiles})`), // Branching
          () => rdkit.get_mol(`${currentSmiles}.${selectedFragment.smiles}`), // Salt/Independent
        ];

        let mol = null;
        for (const strategy of strategies) {
          try {
            mol = strategy();
            if (mol) break;
          } catch (e) { /* ignore strategy failure */ }
        }

        if (mol) {
          const smiles = mol.get_smiles();
          if (smiles && smiles !== currentSmiles) {
            newSmiles = smiles;
          } else {
            // Fallback if smiles is empty or unchanged
             newSmiles = `${currentSmiles}.${selectedFragment.smiles}`;
          }
          mol.delete();
        } else {
          newSmiles = `${currentSmiles}${selectedFragment.smiles}`;
        }
      } catch (err) {
        console.error('Chemical merging error:', err);
        newSmiles = `${currentSmiles}${selectedFragment.smiles}`;
      }
    } else {
      newSmiles = `${currentSmiles}${selectedFragment.smiles}`;
    }
    
    setCurrentSmiles(newSmiles);
    setHistory(prev => [...prev, newSmiles]);
  };

  const handleReset = (smiles: string) => {
    setCurrentSmiles(smiles);
    setHistory([smiles]);
    setPresetValue(smiles);
    setIsCustomMode(false);
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      setCurrentSmiles(customInput.trim());
      setHistory([customInput.trim()]);
      setPresetValue('CUSTOM');
    }
  };

    const handleExportSmiles = () => {
    const element = document.createElement("a");
    const file = new Blob([currentSmiles], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `molecule_${Date.now()}.smiles`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen scientific-grid selection:bg-brand-primary/30 flex flex-col">
      {/* Header */}
      <header className="h-24 border-b border-[#1a1a1a] bg-black/80 backdrop-blur-xl flex items-center px-12 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Beaker className="w-10 h-10 text-white" />
          <h1 className="text-6xl font-black tracking-tighter text-white font-sans">
            ARTIST
          </h1>
        </div>
      </header>

      <main className="flex-1 p-8 grid grid-cols-12 gap-8 max-w-[1920px] mx-auto w-full">
        
        {/* Left Col: Setup & Fragments */}
        <section className="col-span-12 lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 border-l-4 border-l-brand-primary">
            <div className="flex items-center gap-2 text-brand-primary mb-6">
              <Activity className="w-4 h-4" />
              <h2 className="font-bold text-xs uppercase tracking-[0.2em]">Control Room</h2>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 block">Initialization</label>
                <div className="space-y-3">
                  <select 
                    className="w-full bg-[#050505] border border-[#1a1a1a] rounded p-4 text-sm text-slate-300 focus:border-brand-primary/50 outline-none transition-all appearance-none cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsCustomMode(true);
                        setPresetValue('CUSTOM');
                      } else {
                        handleReset(e.target.value);
                      }
                    }}
                    value={presetValue}
                  >
                    {PRESETS.map(p => (
                      <option key={p.smiles} value={p.smiles}>{p.name}</option>
                    ))}
                    <option value="CUSTOM">Custom SMILES...</option>
                  </select>

                  <AnimatePresence>
                    {isCustomMode && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        <input 
                          type="text"
                          placeholder="Enter SMILES string..."
                          className="w-full bg-[#050505] border border-[#1a1a1a] rounded p-3 text-sm text-slate-300 focus:border-brand-primary/50 outline-none transition-all"
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                        />
                        <button 
                          onClick={handleCustomSubmit}
                          className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold rounded transition-all uppercase tracking-widest"
                        >
                          Initialize Custom
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 block">Fragment Selector</label>
                <select 
                  className="w-full bg-[#050505] border border-[#1a1a1a] rounded p-4 text-sm text-slate-300 focus:border-brand-primary/50 outline-none transition-all appearance-none cursor-pointer"
                  onChange={(e) => {
                    const frag = FRAGMENTS.find(f => f.id === e.target.value);
                    if (frag) setSelectedFragment(frag);
                  }}
                  value={selectedFragment.id}
                >
                  {FRAGMENTS.map(f => (
                    <option key={f.id} value={f.id}>{f.name} {f.smiles === 'DONE' ? '' : `(${f.smiles})`}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-brand-primary opacity-10 rounded-xl group-hover:opacity-20 transition duration-1000 blur"></div>
                  <div className="relative bg-[#0a0a0a] border border-blue-500/20 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-brand-primary animate-pulse" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">ARTIST Suggests</span>
                      </div>
                    </div>
                    
                    <div className="pl-6">
                      <div className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-[0_0_10px_rgba(0,242,255,0.3)]">
                        {suggestion?.name}
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleAddFragment}
                  disabled={isProcessing}
                  className={cn(
                    "w-full py-5 flex items-center justify-center gap-3 text-sm font-black rounded transition-all neon-border",
                    isProcessing 
                      ? "bg-slate-900 text-slate-700 cursor-not-allowed shadow-none border-[#1a1a1a]" 
                      : "bg-brand-primary text-black hover:brightness-110 active:scale-[0.98]"
                  )}
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Beaker className="w-4 h-4" />
                      {selectedFragment.smiles === 'DONE' ? 'FINALIZE MOLECULE' : 'ADD TO MOLECULE'}
                    </>
                  )}
                </button>
              </div>

              <button 
                onClick={() => handleReset('C')}
                className="w-full py-2 text-[10px] font-bold text-slate-700 hover:text-brand-danger transition-colors uppercase tracking-[0.3em] flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Reset Workspace
              </button>
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 text-slate-500 mb-6">
              <History className="w-4 h-4" />
              <h2 className="font-bold text-xs uppercase tracking-[0.2em]">Session History</h2>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((s, i) => (
                <div key={i} className="flex flex-col gap-1 p-3 bg-black/40 rounded border border-[#1a1a1a] group">
                  <span className="text-[9px] text-slate-700 font-bold uppercase">Transaction {i}</span>
                  <code className="text-[10px] text-brand-primary/70 break-all">{s}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Center Col: Visualization */}
        <section className="col-span-12 lg:col-span-6 flex flex-col gap-8">
          <div className="flex-1 min-h-[600px] flex flex-col gap-4">
            <div className="flex items-center justify-between text-brand-primary/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <h2 className="font-bold text-xs uppercase tracking-[0.2em]">Creation Engine</h2>
              </div>
              <div className="text-[12px] font-mono font-bold text-brand-primary truncate max-w-[400px] bg-brand-primary/5 px-3 py-1 rounded border border-brand-primary/10">
                {currentSmiles}
              </div>
            </div>
            <div className="flex-1 glass-panel overflow-hidden border-[#1a1a1a] relative">
              {!isLoaded && (
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
                  <p className="text-brand-primary font-bold tracking-widest text-xs uppercase animate-pulse">Initializing Chem Engine...</p>
                </div>
              )}
              <Molecule3D smiles={currentSmiles} sdf={sdf} />
            </div>
          </div>

          <div className="glass-panel p-8">
            <div className="flex items-center gap-3 mb-8">
              <BrainCircuit className="w-5 h-5 text-brand-primary" />
              <h2 className="font-bold text-sm text-white tracking-widest uppercase">Decision Logic</h2>
            </div>

            <div className="h-48">
              <DecisionChart qValues={qValues} />
            </div>
          </div>
        </section>

        {/* Right Col: Telemetry */}
        <section className="col-span-12 lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 border-r-4 border-r-brand-primary">
            <div className="flex items-center gap-2 text-brand-primary mb-8">
              <Activity className="w-4 h-4" />
              <h2 className="font-bold text-xs uppercase tracking-[0.2em]">Session Telemetry</h2>
            </div>
            
            <div className="space-y-12">
              <MetricBox label="Molecular Weight" value={metrics.mw.toFixed(1)} color="#3b82f6" />
              <MetricBox label="QED Estimate" value={metrics.qed.toFixed(3)} color="#10b981" />
              <MetricBox label="SAS Complexity" value={metrics.sas.toFixed(2)} color="#f43f5e" />
            </div>

            <div className="mt-12 pt-12 border-t border-[#1a1a1a] space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Chemical Passport</h3>
              </div>
              <ComplianceItem label="Rule of 5" status={metrics.mw < 500 ? 'success' : 'error'} />
              <ComplianceItem label="Lipophilicity" status={metrics.logp < 5 ? 'success' : 'error'} />
              <ComplianceItem label="Synthesis ease" status={metrics.sas < 4.5 ? 'success' : 'warning'} />
              
            <div className="pt-8">
              <button 
                onClick={handleExportSmiles} 
                className="w-full py-4 bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 text-brand-primary text-xs font-black rounded transition-all uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,242,255,0.1)]"
              >
                <Download className="w-4 h-4" />
                Export SMILES
              </button>
            </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="space-y-2">
      <p 
        className="text-xs font-black uppercase tracking-[0.3em]"
        style={{ color: color }}
      >
        {label}
      </p>
      <p className="text-5xl font-black text-white font-sans tracking-tighter">
        {value}
      </p>
    </div>
  );
}

function ComplianceItem({ label, status }: { label: string, status: 'success' | 'warning' | 'error' }) {
  const configs = {
    success: { color: 'text-brand-primary', bg: 'bg-brand-primary/5', border: 'border-brand-primary/20' },
    warning: { color: 'text-brand-warning', bg: 'bg-brand-warning/5', border: 'border-brand-warning/20' },
    error: { color: 'text-brand-danger', bg: 'bg-brand-danger/5', border: 'border-brand-danger/20' },
  };
  
  const config = configs[status];
  
  return (
    <div className={cn("flex items-center justify-between p-4 rounded-lg border", config.bg, config.border)}>
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(current)]", status === 'success' ? 'bg-brand-primary shadow-brand-primary/50' : status === 'warning' ? 'bg-brand-warning shadow-brand-warning/50' : 'bg-brand-danger shadow-brand-danger/50')} />
    </div>
  );
}
