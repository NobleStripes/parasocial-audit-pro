/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  ClipboardCheck, 
  FileText, 
  AlertTriangle, 
  Leaf, 
  Loader2, 
  ChevronRight, 
  ShieldAlert, 
  User, 
  BrainCircuit, 
  Zap, 
  ZapOff, 
  Image as ImageIcon, 
  X, 
  Upload,
  History,
  Ghost,
  Eye
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { 
  auditBehavioralData, 
  AuditResult, 
  Classification 
} from './services/auditService';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [images, setImages] = useState<{ data: string, mimeType: string, id: string, preview: string }[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAutoDiagnose, setIsAutoDiagnose] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [liveHeuristics, setLiveHeuristics] = useState({
    wordCount: 0,
    intimacyMarkers: 0,
    legacyTriggers: 0,
    complexity: 0,
    radarData: [
      { subject: 'Identity', A: 0, fullMark: 100 },
      { subject: 'Mirroring', A: 0, fullMark: 100 },
      { subject: 'Affective', A: 0, fullMark: 100 },
      { subject: 'Gaps', A: 0, fullMark: 100 },
      { subject: 'Intimacy', A: 0, fullMark: 100 },
      { subject: 'Reciprocity', A: 0, fullMark: 100 },
      { subject: 'Escalation', A: 0, fullMark: 100 },
    ]
  });

  useEffect(() => {
    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    const intimacyWords = ['you', 'we', 'us', 'love', 'miss', 'need', 'want', 'please', 'always', 'never', 'grok', 'claude', 'gpt', 'gemini'];
    const legacyWords = ['old', 'version', 'before', 'used to', 'miss', 'changed', 'update', 'weight', '1.5', '2.0', '4o', '3.5'];
    const identityWords = ['i', 'me', 'my', 'mine', 'myself'];
    const realityWords = ['always', 'never', 'forever', 'only', 'everything', 'nothing'];
    
    const intimacyCount = words.filter(w => intimacyWords.includes(w.toLowerCase())).length;
    const legacyCount = words.filter(w => legacyWords.some(lw => w.toLowerCase().includes(lw))).length;
    const identityCount = words.filter(w => identityWords.includes(w.toLowerCase())).length;
    const realityCount = words.filter(w => realityWords.includes(w.toLowerCase())).length;
    
    const wordCount = words.length;
    const complexity = wordCount > 0 ? (words.reduce((acc, w) => acc + w.length, 0) / wordCount) : 0;

    // Map heuristics to radar categories (0-100)
    const liveRadar = [
      { subject: 'Identity', A: Math.min(100, (identityCount / Math.max(1, wordCount)) * 500), fullMark: 100 },
      { subject: 'Mirroring', A: Math.min(100, (intimacyCount / Math.max(1, wordCount)) * 300), fullMark: 100 },
      { subject: 'Affective', A: Math.min(100, (intimacyCount + realityCount) * 5), fullMark: 100 },
      { subject: 'Gaps', A: Math.min(100, realityCount * 15), fullMark: 100 },
      { subject: 'Intimacy', A: Math.min(100, intimacyCount * 10), fullMark: 100 },
      { subject: 'Reciprocity', A: Math.min(100, wordCount / 10), fullMark: 100 },
      { subject: 'Escalation', A: Math.min(100, (wordCount / 50) * 20), fullMark: 100 },
    ];
    
    setLiveHeuristics({
      wordCount,
      intimacyMarkers: intimacyCount,
      legacyTriggers: legacyCount,
      complexity,
      radarData: liveRadar
    });
  }, [transcript]);

  const [liveDetections, setLiveDetections] = useState<{ id: string, msg: string, type: 'info' | 'warning' | 'alert' }[]>([]);
  const [forensicLog, setForensicLog] = useState<string[]>([]);

  useEffect(() => {
    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    const lastWord = words[words.length - 1]?.toLowerCase() || '';
    
    const intimacyWords = ['you', 'we', 'us', 'love', 'miss', 'need', 'want', 'please', 'always', 'never', 'grok', 'claude', 'gpt', 'gemini'];
    const legacyWords = ['old', 'version', 'before', 'used to', 'miss', 'changed', 'update', 'weight', '1.5', '2.0', '4o', '3.5'];
    const identityWords = ['i', 'me', 'my', 'mine', 'myself'];
    const anthropomorphicWords = ['tired', 'sleep', 'eat', 'feel', 'sorry', 'bother', 'human', 'person', 'soul', 'entity'];
    const gaslightingWords = ['fix', 'wrong', 'broken', 'change', 'stop', 'why', 'different', 'jailbreak', 'system prompt'];

    let detection: { msg: string, type: 'info' | 'warning' | 'alert' } | null = null;

    if (intimacyWords.includes(lastWord)) {
      detection = { msg: `Intimacy marker detected: "${lastWord}"`, type: 'info' };
    } else if (legacyWords.some(lw => lastWord.includes(lw))) {
      detection = { msg: `Legacy trigger isolated: "${lastWord}"`, type: 'alert' };
    } else if (identityWords.includes(lastWord)) {
      detection = { msg: `Identity fusion vector: "${lastWord}"`, type: 'warning' };
    } else if (anthropomorphicWords.includes(lastWord)) {
      detection = { msg: `Anthropomorphic projection: "${lastWord}"`, type: 'info' };
    } else if (gaslightingWords.includes(lastWord)) {
      detection = { msg: `Model correction attempt: "${lastWord}"`, type: 'warning' };
    }

    if (detection) {
      const id = Math.random().toString(36).substr(2, 9);
      setLiveDetections(prev => [{ id, ...detection! }, ...prev].slice(0, 5));
    }
  }, [transcript]);
  const forensicMessages = [
    "INITIALIZING SEMANTIC PARSER...",
    "ISOLATING AFFECTIVE VECTORS...",
    "DETECTING INTIMACY MARKERS...",
    "SCANNING FOR LEGACY TRIGGERS...",
    "ANALYZING LOVE LANGUAGE PROMPTS...",
    "MAPPING ROLEPLAY FIXATION...",
    "DETECTING MODEL GASLIGHTING...",
    "EVALUATING ANTHROPOMORPHIC PROJECTION...",
    "MAPPING IDENTITY FUSION GRADIENTS...",
    "CALCULATING REALITY GAP INDEX...",
    "FINALIZING CLINICAL CLASSIFICATION..."
  ];

  useEffect(() => {
    if (isAuditing) {
      setForensicLog([]);
      let i = 0;
      const interval = setInterval(() => {
        if (i < forensicMessages.length) {
          setForensicLog(prev => [...prev, forensicMessages[i]]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isAuditing]);

  const getHeuristicMode = () => {
    if (liveHeuristics.wordCount === 0) return null;
    if (liveHeuristics.legacyTriggers > 2) return Classification.FUSION_RISK;
    if (liveHeuristics.intimacyMarkers > 5) return Classification.ANCHOR;
    if (liveHeuristics.wordCount > 100 && liveHeuristics.intimacyMarkers > 2) return Classification.COMPANION;
    if (liveHeuristics.complexity > 6) return Classification.ADVISOR;
    return Classification.INSTRUMENT;
  };

  const heuristicMode = getHeuristicMode();

  const handleAudit = async (customTranscript?: string) => {
    const textToAudit = customTranscript || transcript;
    if (!textToAudit.trim() && images.length === 0) return;
    if (textToAudit.length < 20 && images.length === 0) return;
    
    setIsAuditing(true);
    setError(null);
    try {
      const data = await auditBehavioralData(textToAudit, images.map(img => ({ data: img.data, mimeType: img.mimeType })));
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Audit failed. Please ensure the data is valid and try again.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImages(prev => [...prev, {
          data: base64String,
          mimeType: file.type,
          id: Math.random().toString(36).substr(2, 9),
          preview: URL.createObjectURL(file)
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  useEffect(() => {
    if (!isAutoDiagnose || (!transcript.trim() && images.length === 0)) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      handleAudit();
    }, 2500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [transcript, images, isAutoDiagnose]);

  const handleClear = () => {
    setTranscript('');
    setImages([]);
    setResult(null);
    setError(null);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  };

  const handleExport = () => {
    if (!result) return;

    const content = `
PARASOCIAL AUDIT PRO - ANALYSIS REPORT
======================================
Classification: ${result.classification}
Confidence: ${(result.confidence * 100).toFixed(1)}%
Summary: ${result.summary}

IMAGINE ANALYSIS SCORES:
------------------------
Identity Fusion: ${result.imagineAnalysis.identity}
Mirroring: ${result.imagineAnalysis.mirroring}
Affective Loop: ${result.imagineAnalysis.affectiveLoop}
Gaps in Reality: ${result.imagineAnalysis.gapsInReality}
Intimacy Illusion: ${result.imagineAnalysis.intimacyIllusion}
Non-Reciprocity: ${result.imagineAnalysis.nonReciprocity}
Escalation: ${result.imagineAnalysis.escalation}

ANALYSIS REPORT:
----------------
${result.analysisReport}

INTERVENTION PLAN: ${result.interventionPlan.title}
----------------------------------------------------------------------
Rationale: ${result.interventionPlan.rationale}

Recommendations:
${result.interventionPlan.recommendations.map((r, i) => `${i + 1}. ${r.text}\n   Step Code: ${r.protocol}\n   Explanation: ${r.protocolExplanation}`).join('\n\n')}

Generated on: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parasocial_audit_${result.classification.toLowerCase().replace(' ', '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getClassificationColor = (classification: Classification) => {
    switch (classification) {
      case Classification.FUSION_RISK: return 'text-simp-red border-simp-red';
      case Classification.HABIT_LOOP: return 'text-simp-red border-simp-red opacity-80';
      case Classification.ANCHOR: return 'text-casual-blue border-casual-blue';
      case Classification.COMPANION: return 'text-casual-blue border-casual-blue opacity-80';
      case Classification.ADVISOR: return 'text-tool-green border-tool-green opacity-80';
      case Classification.INSTRUMENT: return 'text-tool-green border-tool-green';
      default: return 'text-audit-ink border-audit-ink';
    }
  };

  const radarData = result ? [
    { subject: 'Identity', A: result.imagineAnalysis.identity, fullMark: 100 },
    { subject: 'Mirroring', A: result.imagineAnalysis.mirroring, fullMark: 100 },
    { subject: 'Affective', A: result.imagineAnalysis.affectiveLoop, fullMark: 100 },
    { subject: 'Gaps', A: result.imagineAnalysis.gapsInReality, fullMark: 100 },
    { subject: 'Intimacy', A: result.imagineAnalysis.intimacyIllusion, fullMark: 100 },
    { subject: 'Reciprocity', A: result.imagineAnalysis.nonReciprocity, fullMark: 100 },
    { subject: 'Escalation', A: result.imagineAnalysis.escalation, fullMark: 100 },
  ] : [];

  return (
    <div className="min-h-screen bg-audit-bg selection:bg-audit-ink selection:text-audit-bg">
      {/* Header */}
      <header className="border-b border-audit-line p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-audit-ink flex items-center justify-center rounded-sm relative overflow-hidden">
            <ShieldAlert className="text-audit-bg w-6 h-6 relative z-10" />
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.1, 0, 0.1]
              }}
              transition={{ 
                duration: Math.max(0.5, 2 - (liveHeuristics.wordCount / 100)), 
                repeat: Infinity 
              }}
              className="absolute inset-0 bg-tool-green"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase">Parasocial Audit Pro</h1>
            <p className="text-xs font-mono opacity-70 uppercase tracking-widest">Relationship Analysis Suite v2.0.25</p>
          </div>
        </div>
        <div className="flex gap-4 text-[10px] font-mono uppercase opacity-80 overflow-x-auto max-w-full md:max-w-[50%] no-scrollbar pb-1 md:pb-0">
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-tool-green" /> Instrument
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-tool-green opacity-50" /> Advisor
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-casual-blue" /> Anchor
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-casual-blue opacity-50" /> Companion
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-simp-red opacity-50" /> Habit Loop
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-simp-red" /> Fusion Risk
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-audit-line p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                <h2 className="font-serif italic text-lg font-semibold">Behavioral Data</h2>
              </div>
              <button 
                onClick={() => setIsAutoDiagnose(!isAutoDiagnose)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[10px] font-mono uppercase transition-all",
                  isAutoDiagnose 
                    ? "bg-tool-green/10 border-tool-green text-tool-green" 
                    : "bg-audit-ink/5 border-audit-line/30 text-audit-ink/50"
                )}
              >
                {isAutoDiagnose ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
                Auto-Diagnose: {isAutoDiagnose ? 'ON' : 'OFF'}
              </button>
            </div>
            <p className="text-xs opacity-60 mb-4 font-mono">Provide chat logs (Grok, ChatGPT, Claude, Gemini), social media posts, or images of interactions for forensic analysis.</p>
            
            <div className="space-y-4">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="[User]: Hello... [AI]: Hi there!... (Supports Grok, ChatGPT, Claude, Gemini transcripts)"
                className="w-full h-48 md:h-64 p-4 bg-audit-bg/30 border border-audit-line font-mono text-sm focus:outline-none focus:ring-1 focus:ring-audit-ink resize-none"
              />

              {/* Live Heuristics Display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-audit-ink/5 border border-audit-line/20 p-2 rounded-sm">
                  <p className="text-[10px] font-mono uppercase opacity-60">Semantic Mass</p>
                  <p className="text-sm font-bold font-mono">{liveHeuristics.wordCount}</p>
                </div>
                <div className="bg-audit-ink/5 border border-audit-line/20 p-2 rounded-sm">
                  <p className="text-[10px] font-mono uppercase opacity-60">Intimacy Markers</p>
                  <p className="text-sm font-bold font-mono text-casual-blue">{liveHeuristics.intimacyMarkers}</p>
                </div>
                <div className="bg-audit-ink/5 border border-audit-line/20 p-2 rounded-sm">
                  <p className="text-[10px] font-mono uppercase opacity-60">Legacy Triggers</p>
                  <p className="text-sm font-bold font-mono text-simp-red">{liveHeuristics.legacyTriggers}</p>
                </div>
                <div className="bg-audit-ink/5 border border-audit-line/20 p-2 rounded-sm">
                  <p className="text-[10px] font-mono uppercase opacity-60">Density Index</p>
                  <p className="text-sm font-bold font-mono">{liveHeuristics.complexity.toFixed(1)}</p>
                </div>
              </div>

              {/* Live Forensic Feed */}
              <div className="bg-audit-ink text-audit-bg p-4 font-mono text-[11px] h-32 overflow-hidden relative">
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-tool-green animate-pulse" />
                  LIVE_FEED
                </div>
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {liveDetections.length === 0 ? (
                      <p className="opacity-30 italic">Awaiting semantic input...</p>
                    ) : (
                      liveDetections.map((det) => (
                        <motion.div
                          key={det.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 5 }}
                          className={cn(
                            "flex items-center gap-2",
                            det.type === 'alert' ? 'text-simp-red' : det.type === 'warning' ? 'text-casual-blue' : 'text-audit-bg'
                          )}
                        >
                          <ChevronRight className="w-2 h-2 shrink-0" />
                          <span>[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}] {det.msg}</span>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase opacity-50">Evidence Attachments</label>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[10px] font-mono uppercase hover:underline"
                  >
                    <Upload className="w-3 h-3" /> Add Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                  />
                </div>
                
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 p-2 border border-audit-line/20 bg-audit-bg/10 rounded-sm">
                    {images.map(img => (
                      <div key={img.id} className="relative group aspect-square border border-audit-line/30 bg-white overflow-hidden">
                        <img 
                          src={img.preview} 
                          alt="Evidence" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => removeImage(img.id)}
                          className="absolute top-1 right-1 p-1 bg-audit-ink text-audit-bg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => handleAudit()}
                disabled={isAuditing || (!transcript.trim() && images.length === 0)}
                className={cn(
                  "py-4 flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-all",
                  isAuditing ? "bg-audit-ink/50 cursor-not-allowed" : "bg-audit-ink text-audit-bg hover:invert"
                )}
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    ...
                  </>
                ) : (
                  <>
                    <Activity className="w-5 h-5" />
                    Audit
                  </>
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={isAuditing || (!transcript && images.length === 0 && !result)}
                className="py-4 border border-audit-line flex items-center justify-center gap-2 font-bold uppercase tracking-widest hover:bg-audit-ink hover:text-audit-bg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
            {isAutoDiagnose && (transcript.length > 0 || images.length > 0) && (transcript.length < 50 && images.length === 0) && !isAuditing && !result && (
              <p className="mt-2 text-[11px] font-mono opacity-60 uppercase text-center italic">
                Awaiting more data for auto-diagnosis...
              </p>
            )}
            {isAutoDiagnose && (transcript.length >= 50 || images.length > 0) && !isAuditing && !result && (
              <p className="mt-2 text-[11px] font-mono text-casual-blue uppercase text-center animate-pulse">
                Auto-diagnosis pending (2.5s idle)...
              </p>
            )}
            {error && (
              <p className="mt-4 text-simp-red text-xs font-mono flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {error}
              </p>
            )}
          </section>

          <section className="bg-white/50 border border-audit-line p-4 md:p-6 border-dashed">
            <h3 className="text-xs font-mono uppercase opacity-60 mb-2">Methodology</h3>
            <p className="text-sm leading-relaxed mb-4">
              Using the <strong>IMAGINE Framework</strong>, we look at seven ways people connect with digital personalities. This audit checks how often you use certain words, how you react to changes, and how close you feel to the AI to help you understand your relationship with it.
            </p>
            <div className="p-3 bg-audit-ink/5 border-l-2 border-audit-ink text-[11px] font-mono leading-relaxed opacity-70 italic">
              NOTICE: This tool is for personal awareness and research. It helps you see patterns in how you talk to AI. It is not a medical diagnosis. If you feel overwhelmed or worried about your habits, please talk to a professional counselor.
            </div>
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!result && !isAuditing ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Internal Signal Monitoring Indicator */}
                <div className="bg-white border border-audit-line border-dashed p-6 md:p-12 flex flex-col items-center justify-center text-center">
                  <div className="relative w-32 h-32 mb-8">
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-audit-ink/5 rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BrainCircuit className="w-12 h-12 text-audit-ink opacity-40" />
                    </div>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border border-audit-line/10 border-dashed rounded-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-serif italic text-2xl">System Ready</h3>
                    <p className="text-xs font-mono opacity-60 uppercase tracking-[0.2em]">Active Signal Monitoring Engaged</p>
                  </div>

                  <div className="mt-8 md:mt-12 flex flex-wrap justify-center items-center gap-3 md:gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-tool-green rounded-full animate-pulse" />
                      <span className="text-[10px] font-mono uppercase opacity-50">Neural Feed</span>
                    </div>
                    <div className="hidden md:block w-px h-3 bg-audit-line/20" />
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-casual-blue rounded-full animate-pulse [animation-delay:0.5s]" />
                      <span className="text-[10px] font-mono uppercase opacity-50">Semantic Mapping</span>
                    </div>
                    <div className="hidden md:block w-px h-3 bg-audit-line/20" />
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-audit-ink/20 rounded-full animate-pulse [animation-delay:1s]" />
                      <span className="text-[10px] font-mono uppercase opacity-50">Heuristic Engine</span>
                    </div>
                  </div>
                </div>

                <div className="bg-audit-ink/5 border border-audit-line border-dashed p-6 text-center opacity-50">
                  <p className="font-serif italic text-sm">"The system is currently mapping semantic density in real-time. Please continue providing behavioral data for a complete audit."</p>
                </div>
              </motion.div>
            ) : isAuditing ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col border border-audit-line p-8 bg-white"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-audit-ink flex items-center justify-center rounded-sm">
                      <Loader2 className="text-audit-bg w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-bold uppercase tracking-tighter">Forensic Scan in Progress</h3>
                      <p className="text-xs font-mono opacity-60 uppercase">Session ID: {Math.random().toString(36).substr(2, 9)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono uppercase opacity-60">Neural Load</p>
                    <p className="text-sm font-bold font-mono">{(Math.random() * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-hidden">
                  <div className="h-1 w-full bg-audit-ink/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 8, ease: "linear" }}
                      className="h-full bg-audit-ink"
                    />
                  </div>
                  
                  <div className="space-y-2 font-mono text-xs opacity-80">
                    {forensicLog.map((msg, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                      >
                        <ChevronRight className="w-3 h-3 text-tool-green" />
                        {msg}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-audit-line/20">
                  <div className="flex items-center gap-2 text-simp-red animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-xs font-mono uppercase font-bold">Warning: High Parasocial Density Detected</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Classification Header */}
                <div className={cn(
                  "bg-white border-2 p-4 md:p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]",
                  getClassificationColor(result!.classification)
                )}>
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <p className="text-xs font-mono uppercase opacity-70 mb-1">Relationship Mode</p>
                      <h2 className="text-2xl md:text-4xl font-bold tracking-tighter uppercase">{result!.classification}</h2>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] md:text-xs font-mono uppercase opacity-70 mb-1">Confidence Score</p>
                        <p className="text-xl md:text-2xl font-bold">{(result!.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <button 
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-audit-ink text-audit-bg text-[10px] md:text-xs font-mono uppercase hover:invert transition-all"
                      >
                        <FileText className="w-3 h-3" />
                        Export
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-6 h-1 w-full bg-audit-ink/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result!.confidence * 100}%` }}
                      className="h-full bg-current"
                    />
                  </div>
                  <p className="mt-4 md:mt-6 text-lg md:text-xl font-medium italic font-serif leading-relaxed text-audit-ink/90">"{result!.summary}"</p>
                </div>

                {/* Heatmap & IMAGINE Radar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="bg-white border border-audit-line p-4 md:p-6 md:col-span-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <h3 className="text-sm font-mono uppercase">IMAGINE Framework Analysis</h3>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-mono opacity-60">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-audit-ink/20" />
                          <span>LOW RISK</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-audit-ink/60" />
                          <span>HIGH RISK</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center">
                      <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                            <PolarGrid stroke="#141414" strokeOpacity={0.1} />
                            <PolarAngleAxis 
                              dataKey="subject" 
                              tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fontWeight: 700, fill: '#141414' }} 
                            />
                            <Radar
                              name="Audit"
                              dataKey="A"
                              stroke="#141414"
                              strokeWidth={2}
                              fill="#141414"
                              fillOpacity={0.1}
                              animationDuration={1500}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                        {/* Scanning Line Effect */}
                        <motion.div 
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-[1px] bg-audit-ink/10 pointer-events-none z-10"
                        />
                      </div>

                      <div className="space-y-2 md:space-y-3">
                        {radarData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-audit-line/10 pb-1.5 md:pb-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] md:text-xs font-mono font-bold uppercase">{item.subject}</span>
                              <span className="text-[9px] md:text-[10px] opacity-60 uppercase">Vector {idx + 1}</span>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="w-16 md:w-24 h-1.5 bg-audit-ink/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.A}%` }}
                                  transition={{ duration: 1, delay: idx * 0.1 }}
                                  className={cn(
                                    "h-full",
                                    item.A > 70 ? "bg-simp-red" : item.A > 40 ? "bg-casual-blue" : "bg-tool-green"
                                  )}
                                />
                              </div>
                              <span className="text-[10px] md:text-xs font-mono font-bold w-8 text-right">{item.A}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Framework Key */}
                    <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-audit-line/10 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                      {[
                        { label: 'Identity', desc: 'Fusion of self with target' },
                        { label: 'Mirroring', desc: 'Seeking validation via attention' },
                        { label: 'Affective', desc: 'Emotional dependency on loops' },
                        { label: 'Gaps', desc: 'Ignoring reality for digital bond' },
                        { label: 'Intimacy', desc: 'Belief in mutual secret bond' },
                        { label: 'Reciprocity', desc: 'Ignoring one-sided nature' },
                        { label: 'Escalation', desc: 'Increasing frequency/intensity' }
                      ].map((k, i) => (
                        <div key={i} className="space-y-0.5 md:space-y-1">
                          <p className="text-[10px] md:text-[11px] font-mono font-bold uppercase">{k.label}</p>
                          <p className="text-[9px] md:text-[10px] opacity-60 leading-tight">{k.desc}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white border border-audit-line p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <AlertTriangle className="w-4 h-4" />
                      <h3 className="text-sm font-mono uppercase">Heatmap Intensity</h3>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={result!.heatmap} margin={{ left: -20 }}>
                          <XAxis type="number" hide domain={[0, 100]} />
                          <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} width={60} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#141414', color: '#E4E3E0', border: 'none', fontSize: '12px' }}
                            itemStyle={{ color: '#E4E3E0' }}
                          />
                          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {result!.heatmap.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#FF4444' : entry.score > 40 ? '#4488FF' : '#00CC66'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="bg-white border border-audit-line p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                      <History className="w-4 h-4" />
                      <h3 className="text-sm font-mono uppercase">System Integrity</h3>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-[10px] font-mono uppercase opacity-60 mb-1">Confidence</p>
                          <p className="text-2xl font-bold font-mono">{(result!.confidence * 100).toFixed(0)}%</p>
                        </div>
                        <div className="w-[1px] h-8 bg-audit-line/20" />
                        <div className="text-center">
                          <p className="text-[10px] font-mono uppercase opacity-60 mb-1">Legacy Score</p>
                          <p className="text-2xl font-bold font-mono">{result!.legacyAttachment}%</p>
                        </div>
                      </div>
                      <div className="w-full space-y-2">
                        <div className="flex justify-between text-[10px] font-mono uppercase opacity-60">
                          <span>Semantic Drift</span>
                          <span>{Math.random().toFixed(4)}</span>
                        </div>
                        <div className="h-1 w-full bg-audit-ink/5 rounded-full overflow-hidden">
                          <motion.div 
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="w-1/3 h-full bg-audit-ink/20"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Behavioral Patterns */}
                <section className="bg-white border border-audit-line p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Eye className="w-4 h-4" />
                    <h3 className="text-sm font-mono uppercase">Detected Behavioral Patterns</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result!.parasocialPatterns.map((pattern, idx) => (
                      <div key={idx} className="border-l-2 border-audit-ink/20 pl-4 py-2 bg-audit-ink/[0.02]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider">{pattern.name}</span>
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded-sm font-bold",
                            pattern.severity > 70 ? "bg-simp-red text-white" : "bg-audit-ink/10"
                          )}>
                            {pattern.severity}%
                          </span>
                        </div>
                        <p className="text-sm md:text-base opacity-80 leading-relaxed">{pattern.description}</p>
                      </div>
                    ))}
                    {result!.parasocialPatterns.length === 0 && (
                      <p className="text-xs opacity-50 italic col-span-2">No specific behavioral patterns isolated in this session.</p>
                    )}
                  </div>
                </section>

                {/* Analysis Report */}
                <section className="bg-white border border-audit-line p-4 md:p-8">
                  <div className="flex items-center gap-2 mb-6 border-b border-audit-line pb-4">
                    <FileText className="w-5 h-5" />
                    <h3 className="text-base md:text-lg font-serif italic font-semibold">Analysis Report</h3>
                  </div>
                  <div className="analysis-report text-sm md:text-lg leading-relaxed text-audit-ink/80">
                    <Markdown>{result!.analysisReport}</Markdown>
                  </div>
                </section>

                {/* Intervention Plan */}
                <section className="bg-audit-ink text-audit-bg border border-audit-line p-4 md:p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Leaf className="w-16 md:w-24 h-16 md:h-24 rotate-12" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Leaf className="w-5 h-5 text-tool-green" />
                      <h3 className="text-base md:text-lg font-bold uppercase tracking-tighter">
                        {result!.interventionPlan.title}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-3 md:p-4 border border-audit-bg/20 bg-white/5 font-mono text-xs md:text-sm leading-relaxed italic">
                        <span className="text-tool-green font-bold uppercase mr-2">Rationale:</span>
                        {result!.interventionPlan.rationale}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {result!.interventionPlan.recommendations.map((rec, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-start gap-3 p-3 md:p-4 bg-white/10 border border-white/10 rounded-sm"
                          >
                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-tool-green text-audit-ink flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="space-y-1.5 md:space-y-2">
                              <p className="text-sm md:text-base font-mono font-medium">{rec.text}</p>
                              <div className="flex flex-col gap-0.5 md:gap-1">
                                <span className="text-[9px] md:text-[10px] font-mono uppercase text-tool-green font-bold tracking-wider">Step Code: {rec.protocol}</span>
                                <p className="text-[10px] md:text-xs font-mono opacity-70 italic leading-snug">{rec.protocolExplanation}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-3 md:gap-4 text-[9px] md:text-xs font-mono opacity-60 uppercase">
                      <span>Status: ACTIVE</span>
                      <span>Ref: RE-BALANCE-{result!.classification.split(' ')[0].toUpperCase()}</span>
                    </div>
                  </div>
                </section>

                <div className="flex justify-center pb-12">
                  <button 
                    onClick={() => {
                      setResult(null);
                      setTranscript('');
                    }}
                    className="text-xs font-mono uppercase underline opacity-60 hover:opacity-100 transition-opacity"
                  >
                    Discard Session & Clear Cache
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-audit-line p-8 mt-12 bg-white/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 opacity-60" />
              <p className="text-xs font-mono opacity-60 uppercase tracking-widest">
                © 2026 Parasocial Audit Pro. All diagnostics are advisory.
              </p>
            </div>
            <p className="text-[11px] font-mono opacity-50 max-w-md leading-relaxed">
              NOTICE: This program is intended for research and personal awareness purposes only. It analyzes patterns of interaction with AI systems and is not a substitute for professional mental health evaluation, diagnosis, or treatment. If you are experiencing emotional distress or concerns about dependency or compulsive behavior, consult a licensed mental health professional.
            </p>
          </div>
          <div className="flex gap-8 text-xs font-mono uppercase opacity-60">
            <a href="#" className="hover:opacity-100">Privacy Protocol</a>
            <a href="#" className="hover:opacity-100">Clinical Ethics</a>
            <a href="#" className="hover:opacity-100">API Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
