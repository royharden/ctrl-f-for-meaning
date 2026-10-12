import { useState, useCallback, useRef, type ReactNode } from 'react';
import {
  Search, FileText, Zap, MessageSquare, GitCompareArrows,
  BarChart3, Upload, Clipboard, BookOpen, Loader2, ChevronDown,
  CheckCircle2, AlertTriangle, CircleSlash, Cpu, Database,
  ArrowRight, Layers, Tag, ScanLine, Brain, Sparkles, Info,
} from 'lucide-react';
import type {
  DocLine, DocSection, VerdictThresholds, WriterMode,
  SearchResult, BaselineResult, TopLine,
} from '@/types';
import {
  prepareDocument, isTwoPass, getNeighborLines,
} from '@/lib/documentPrep';
import { computeVerdict, verdictLabel, verdictColor, noulConfidence } from '@/lib/verdict';
import {
  runSearch, loadSearchHistory, loadStats, type SearchOutcome,
  type SearchStats,
} from '@/lib/searchOrchestrator';
import type { SearchRecord } from '@/types';
import { sampleDocuments, presetQueries, type SampleDoc } from '@/data/sampleDocuments';
import { extractPdfText } from '@/lib/pdfExtract';
import { saveDocument } from '@/lib/edgeClient';
import { MAX_QUERY_CHARS } from '@/types';

type DocSource =
  | { type: 'sample'; doc: SampleDoc }
  | { type: 'custom'; title: string; text: string };

interface PreparedDoc {
  lines: DocLine[];
  sections: DocSection[];
  tokenEstimate: number;
  title: string;
  sourceId: string;
  source: string;
}

export default function App() {
  const [prepared, setPrepared] = useState<PreparedDoc | null>(null);
  const [docDbId, setDocDbId] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [compareEmbeddings, setCompareEmbeddings] = useState(false);
  const [writerMode, setWriterMode] = useState<WriterMode>('live');
  const [offlineReplay, setOfflineReplay] = useState(false);
  const [thresholds] = useState<VerdictThresholds>({ found: 0.7, absent: 0.35 });
  const [showComparison, setShowComparison] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<string | null>(null);
  const [showRelevanceHeatmap, setShowRelevanceHeatmap] = useState(false);
  const [history, setHistory] = useState<SearchRecord[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [activeTab, setActiveTab] = useState<'result' | 'document' | 'comparison' | 'stats'>('result');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docViewerRef = useRef<HTMLDivElement>(null);

  const loadSample = useCallback(async (doc: SampleDoc) => {
    setLoadingDoc(true);
    setError(null);
    setOutcome(null);
    setShowPaste(false);
    try {
      const { lines, sections, tokenEstimate } = prepareDocument(doc.text);
      const newPrepared: PreparedDoc = {
        lines, sections, tokenEstimate,
        title: doc.title, sourceId: doc.id, source: doc.id,
      };
      setPrepared(newPrepared);
      await persistDoc(newPrepared, true);
      setQuery('');
      setActiveTab('result');
    } catch (e) {
      setError(`Failed to load document: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setLoadingDoc(false);
    }
  }, []);

  const persistDoc = async (doc: PreparedDoc, isSample: boolean) => {
    try {
      const id = await saveDocument({
        title: doc.title,
        source: doc.source,
        isSample,
        lines: doc.lines,
        sections: doc.sections,
      });
      setDocDbId(id);
      await refreshHistory(id);
    } catch {
      setDocDbId(null);
    }
  };

  const refreshHistory = async (dbId: string) => {
    const h = await loadSearchHistory(dbId);
    setHistory(h);
    if (prepared) {
      const s = await loadStats(dbId, prepared.lines, 5);
      setStats(s);
    }
  };

  const handlePasteLoad = useCallback(async () => {
    if (!pasteText.trim()) return;
    setLoadingDoc(true);
    setError(null);
    setOutcome(null);
    try {
      const { lines, sections, tokenEstimate } = prepareDocument(pasteText);
      const title = pasteText.split('\n')[0]?.slice(0, 60) || 'Pasted Document';
      const newPrepared: PreparedDoc = {
        lines, sections, tokenEstimate,
        title, sourceId: 'paste', source: 'paste',
      };
      setPrepared(newPrepared);
      await persistDoc(newPrepared, false);
      setPasteText('');
      setShowPaste(false);
      setQuery('');
      setActiveTab('result');
    } catch (e) {
      setError(`Failed to process text: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setLoadingDoc(false);
    }
  }, [pasteText]);

  const handleFileUpload = useCallback(async (file: File) => {
    setLoadingDoc(true);
    setError(null);
    setOutcome(null);
    try {
      let text: string;
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
      if (!text.trim()) {
        setError('The file appears to be empty.');
        setLoadingDoc(false);
        return;
      }
      const { lines, sections, tokenEstimate } = prepareDocument(text);
      const title = file.name.replace(/\.[^.]+$/, '');
      const newPrepared: PreparedDoc = {
        lines, sections, tokenEstimate,
        title, sourceId: file.name, source: file.name,
      };
      setPrepared(newPrepared);
      await persistDoc(newPrepared, false);
      setQuery('');
      setActiveTab('result');
    } catch (e) {
      setError(`Failed to read file: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setLoadingDoc(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!prepared || !query.trim()) return;
    setSearching(true);
    setError(null);
    setHighlightedLine(null);
    try {
      const result = await runSearch({
        documentId: prepared.sourceId,
        docDbId,
        docTitle: prepared.title,
        docSource: prepared.source,
        docIsSample: sampleDocuments.some((d) => d.id === prepared.sourceId),
        docTokenEstimate: prepared.tokenEstimate,
        lines: prepared.lines,
        sections: prepared.sections,
        query: query.trim(),
        thresholds,
        compareEmbeddings,
        writerMode,
        offlineReplay,
        docSourceId: prepared.sourceId,
      });
      setOutcome(result);
      if (result.docDbId && result.docDbId !== docDbId) {
        setDocDbId(result.docDbId);
      }
      if (compareEmbeddings) {
        setShowComparison(true);
        setActiveTab('comparison');
      } else {
        setActiveTab('result');
      }
      if (result.docDbId) {
        await refreshHistory(result.docDbId);
      }
    } catch (e) {
      setError(`Search failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setSearching(false);
    }
  }, [prepared, query, thresholds, compareEmbeddings, writerMode, offlineReplay, docDbId]);

  const handlePresetClick = useCallback((presetQuery: string, docId: string) => {
    const sample = sampleDocuments.find((d) => d.id === docId);
    if (sample && (!prepared || prepared.sourceId !== docId)) {
      loadSample(sample).then(() => {
        setQuery(presetQuery);
      });
    } else {
      setQuery(presetQuery);
    }
  }, [prepared, loadSample]);

  const handleCitationClick = useCallback((lineId: string) => {
    setHighlightedLine(lineId);
    setActiveTab('document');
    setTimeout(() => {
      const el = document.getElementById(`line-${lineId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);

  const twoPass = prepared ? isTwoPass(prepared.lines, prepared.sections) : false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Hero
        prepared={prepared}
        loadingDoc={loadingDoc}
        twoPass={twoPass}
        onLoadSample={loadSample}
        onShowPaste={() => setShowPaste(true)}
        onFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
        showPaste={showPaste}
        pasteText={pasteText}
        setPasteText={setPasteText}
        onPasteLoad={handlePasteLoad}
        onCancelPaste={() => setShowPaste(false)}
      />

      <HowItWorks />

      {error && (
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        </div>
      )}

      {outcome?.notice && (
        <div className="max-w-5xl mx-auto px-6 py-2">
          <div className="bg-sky-50 border border-sky-200 text-sky-800 rounded-lg px-4 py-2.5 text-sm flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" />
            <span>{outcome.notice}</span>
          </div>
        </div>
      )}

      {outcome?.warning && (
        <div className="max-w-5xl mx-auto px-6 py-2">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2.5 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{outcome.warning}</span>
          </div>
        </div>
      )}

      {prepared && (
        <>
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={handleSearch}
            searching={searching}
            compareEmbeddings={compareEmbeddings}
            setCompareEmbeddings={setCompareEmbeddings}
            writerMode={writerMode}
            setWriterMode={setWriterMode}
            offlineReplay={offlineReplay}
            setOfflineReplay={setOfflineReplay}
            presets={presetQueries.filter((p) => p.docId === prepared.sourceId)}
            allPresets={presetQueries}
            onPresetClick={handlePresetClick}
          />

          <Tabs
            active={activeTab}
            setActive={setActiveTab}
            showComparison={showComparison || compareEmbeddings}
            hasResult={!!outcome}
          />

          <div className="max-w-7xl mx-auto px-6 pb-16">
            {activeTab === 'result' && (
              <ResultPanel
                outcome={outcome}
                searching={searching}
                onCitationClick={handleCitationClick}
                thresholds={thresholds}
              />
            )}
            {activeTab === 'document' && (
              <DocumentViewer
                lines={prepared.lines}
                highlightedLine={highlightedLine}
                onCitationClick={handleCitationClick}
                topLines={outcome?.result.topLines}
                showHeatmap={showRelevanceHeatmap}
                setShowHeatmap={setShowRelevanceHeatmap}
              />
            )}
            {activeTab === 'comparison' && (
              <ComparisonPanel
                outcome={outcome}
                searching={searching}
                onCitationClick={handleCitationClick}
              />
            )}
            {activeTab === 'stats' && (
              <StatsPanel
                history={history}
                stats={stats}
                prepared={prepared}
              />
            )}
          </div>
        </>
      )}

      {!prepared && !loadingDoc && (
        <div className="max-w-5xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              Load a sample document, paste text, or upload a .txt, .md, or .pdf file to get started.
            </p>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-slate-400">
          Ctrl+F for Meaning — Vectorless document search powered by Jev (TypeSafe AI)
        </div>
      </footer>
    </div>
  );
}

function Hero({
  prepared, loadingDoc, twoPass, onLoadSample, onShowPaste, onFileUpload,
  fileInputRef, showPaste, pasteText, setPasteText, onPasteLoad, onCancelPaste,
}: {
  prepared: PreparedDoc | null;
  loadingDoc: boolean;
  twoPass: boolean;
  onLoadSample: (doc: SampleDoc) => void;
  onShowPaste: () => void;
  onFileUpload: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  showPaste: boolean;
  pasteText: string;
  setPasteText: (s: string) => void;
  onPasteLoad: () => void;
  onCancelPaste: () => void;
}) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(56,189,248,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(34,197,94,0.2) 0%, transparent 50%)'
      }} />
      <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Ctrl+F for Meaning
            </h1>
            <p className="mt-2 text-lg text-slate-300">
              Search by meaning, no vector DB. Jev finds the exact lines, code ranks them, an LLM writes the answer.
            </p>
            {prepared && (
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                  <FileText className="w-3.5 h-3.5" />
                  {prepared.title}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                  <Layers className="w-3.5 h-3.5" />
                  {prepared.lines.length} lines
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                  <Cpu className="w-3.5 h-3.5" />
                  ~{(prepared.tokenEstimate / 1000).toFixed(1)}k tokens
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${twoPass ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                  <Layers className="w-3.5 h-3.5" />
                  {twoPass ? 'Two-pass' : 'Single-pass'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-[260px]">
            <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-3">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide font-medium">Load a document</p>
              <div className="space-y-1.5">
                {sampleDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onLoadSample(doc)}
                    disabled={loadingDoc}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </button>
                ))}
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={onShowPaste}
                    disabled={loadingDoc}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Clipboard className="w-3.5 h-3.5" /> Paste
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadingDoc}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onFileUpload(f);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
            {loadingDoc && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading document...
              </div>
            )}
          </div>
        </div>

        {showPaste && (
          <div className="mt-4 bg-white/5 backdrop-blur rounded-xl border border-white/10 p-4 fade-in">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your document text here..."
              className="w-full h-32 bg-slate-900/50 text-white text-sm rounded-lg p-3 border border-white/10 focus:border-sky-400 focus:outline-none resize-y scrollbar-thin"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={onPasteLoad}
                disabled={!pasteText.trim()}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 rounded-lg text-sm font-medium transition"
              >
                Load Text
              </button>
              <button
                onClick={onCancelPaste}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function HowItWorks() {
  const steps = [
    { icon: FileText, label: 'Document', desc: 'Load text' },
    { icon: Tag, label: 'Tag lines', desc: 'L0001| ...' },
    { icon: Layers, label: 'Outline', desc: 'Section choice' },
    { icon: ScanLine, label: 'Line choice', desc: '+ exists Noul' },
    { icon: Brain, label: 'Code ranks', desc: 'Thresholds' },
    { icon: MessageSquare, label: 'LLM answer', desc: 'With citations' },
  ];
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-thin">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center shrink-0">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <s.icon className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-slate-700">{s.label}</p>
                  <p className="text-[10px] text-slate-400">{s.desc}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchBar({
  query, setQuery, onSearch, searching, compareEmbeddings, setCompareEmbeddings,
  writerMode, setWriterMode, offlineReplay, setOfflineReplay,
  presets, allPresets, onPresetClick,
}: {
  query: string;
  setQuery: (s: string) => void;
  onSearch: () => void;
  searching: boolean;
  compareEmbeddings: boolean;
  setCompareEmbeddings: (b: boolean) => void;
  writerMode: WriterMode;
  setWriterMode: (m: WriterMode) => void;
  offlineReplay: boolean;
  setOfflineReplay: (b: boolean) => void;
  presets: typeof presetQueries;
  allPresets: typeof presetQueries;
  onPresetClick: (q: string, docId: string) => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !searching) onSearch(); }}
              maxLength={MAX_QUERY_CHARS}
              placeholder="Ask a plain-language question about the document..."
              className="w-full pl-11 pr-4 py-3 text-sm rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            />
          </div>
          <button
            onClick={onSearch}
            disabled={searching || !query.trim()}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {presets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-400 self-center mr-1">Try:</span>
            {presets.map((p) => (
              <button
                key={p.query}
                onClick={() => onPresetClick(p.query, p.docId)}
                disabled={searching}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {p.query}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  p.hint === 'answered' ? 'bg-emerald-50 text-emerald-600' :
                  p.hint === 'partial' ? 'bg-amber-50 text-amber-600' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {p.hintLabel}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <Toggle
            checked={compareEmbeddings}
            onChange={setCompareEmbeddings}
            icon={GitCompareArrows}
            label="Compare with embeddings"
          />
          <Toggle
            checked={offlineReplay}
            onChange={setOfflineReplay}
            icon={Database}
            label="Offline replay"
          />
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-400">Writer:</span>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {(['live', 'mock', 'offline'] as WriterMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setWriterMode(mode)}
                  className={`px-2.5 py-1 text-xs capitalize transition ${
                    writerMode === mode
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, icon: Icon, label }: {
  checked: boolean;
  onChange: (b: boolean) => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        checked
          ? 'bg-sky-50 text-sky-700 border border-sky-200'
          : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <span className={`w-4 h-4 rounded-full border-2 transition ${checked ? 'bg-sky-500 border-sky-500' : 'border-slate-300'}`} />
    </button>
  );
}

function Tabs({ active, setActive, showComparison, hasResult }: {
  active: string;
  setActive: (t: 'result' | 'document' | 'comparison' | 'stats') => void;
  showComparison: boolean;
  hasResult: boolean;
}) {
  const tabs = [
    { id: 'result', label: 'Result', icon: MessageSquare, show: true },
    { id: 'document', label: 'Document', icon: FileText, show: true },
    { id: 'comparison', label: 'Comparison', icon: GitCompareArrows, show: showComparison },
    { id: 'stats', label: 'Stats', icon: BarChart3, show: true },
  ];
  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id as 'result' | 'document' | 'comparison' | 'stats')}
            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition ${
              active === t.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultPanel({
  outcome, searching, onCitationClick, thresholds,
}: {
  outcome: SearchOutcome | null;
  searching: boolean;
  onCitationClick: (lineId: string) => void;
  thresholds: VerdictThresholds;
}) {
  if (searching && !outcome) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Searching document...</span>
      </div>
    );
  }

  if (!outcome) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="w-10 h-10 text-slate-200 mb-3" />
        <p className="text-slate-400">Enter a question and click Search to find answers in the document.</p>
      </div>
    );
  }

  const { result, verdict, answer, isReplay, isFallback } = outcome;
  const colors = verdictColor(verdict);
  const confidence = noulConfidence(result.exists);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 pt-6 fade-in">
      <div className="space-y-4">
        {/* Verdict + Answer */}
        <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-5`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full ${colors.dot} flex items-center justify-center`}>
              {verdict === 'answered' && <CheckCircle2 className="w-5 h-5 text-white" />}
              {verdict === 'partial' && <AlertTriangle className="w-5 h-5 text-white" />}
              {verdict === 'not_in_document' && <CircleSlash className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className={`font-semibold ${colors.text}`}>{verdictLabel(verdict)}</p>
              <p className="text-xs text-slate-500">
                exists = {result.exists.toFixed(2)} | confidence = {confidence.toFixed(2)}
                {isReplay && <span className="ml-2 inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-medium"><Database className="w-2.5 h-2.5" /> Replayed</span>}
                {isFallback && <span className="ml-2 inline-flex items-center gap-1 bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-medium">Fallback (not Jev)</span>}
              </p>
            </div>
          </div>

          {/* Exists gauge */}
          <div className="mb-4">
            <ExistsGauge value={result.exists} thresholds={thresholds} />
          </div>

          {/* Answer */}
          <div className="bg-white/60 rounded-lg p-4 border border-slate-200/50">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Answer</p>
            <AnswerText text={answer} onCitationClick={onCitationClick} />
          </div>
        </div>

        {/* Top lines */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">Top lines by relevance</p>
            <span className="text-xs text-slate-400">{result.topLines.length} lines</span>
          </div>
          <div className="space-y-2">
            {result.topLines.slice(0, 5).map((line, i) => (
              <LineCard key={line.lineId} line={line} rank={i + 1} onClick={() => onCitationClick(line.lineId)} />
            ))}
            {result.topLines.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">No lines matched.</p>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar: metadata */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Search metadata</p>
          <dl className="space-y-2 text-sm">
            <Meta label="Model" value={result.model} />
            <Meta label="Mode" value={result.mode.replace('_', '-')} />
            <Meta label="Latency" value={`${result.latencyMs} ms`} />
            <Meta label="Input tokens" value={String(result.usage.input_tokens)} />
            <Meta label="Cost" value={`$${result.costUsd.toFixed(7)}`} />
            <Meta label="Requests" value={String(result.requests.length)} />
          </dl>
        </div>

        {result.sections && result.sections.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Section probabilities</p>
            <div className="space-y-2">
              {result.sections.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 truncate max-w-[240px]">{s.id} — {s.heading}</span>
                    <span className="text-slate-400 ml-2 shrink-0">{s.probability.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.id === 'none' ? 'bg-slate-300' : 'bg-sky-400'}`}
                      style={{ width: `${Math.max(2, s.probability * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isFallback && !isReplay && (
          <div className="bg-sky-50 rounded-xl border border-sky-200 p-4">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-700">
                Jev pointed to the lines; code ranked them by probability. The exists Noul ({result.exists.toFixed(2)}) determines the verdict.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExistsGauge({ value, thresholds }: { value: number; thresholds: VerdictThresholds }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);
  const color = value >= thresholds.found ? '#10b981' : value < thresholds.absent ? '#94a3b8' : '#f59e0b';
  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          className="gauge-ring"
        />
        <text x="60" y="64" textAnchor="middle" className="text-2xl font-bold fill-slate-700" style={{ fontSize: '22px' }}>
          {value.toFixed(2)}
        </text>
        <text x="60" y="80" textAnchor="middle" className="fill-slate-400" style={{ fontSize: '10px' }}>exists</text>
      </svg>
      <div className="text-xs text-slate-500 space-y-1">
        <p>found ≥ <span className="font-medium text-emerald-600">{thresholds.found}</span></p>
        <p>absent {'<'} <span className="font-medium text-slate-500">{thresholds.absent}</span></p>
        <p className="text-slate-400">between = partial</p>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-mono text-slate-700 text-xs">{value}</dd>
    </div>
  );
}

function LineCard({ line, rank, onClick }: { line: TopLine; rank: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition group"
    >
      <div className="flex items-start gap-3">
        <span className="text-xs font-mono text-slate-400 shrink-0 mt-0.5">#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-sky-600 group-hover:text-sky-700">{line.lineId}</span>
            {line.sectionId && (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{line.sectionId}</span>
            )}
          </div>
          <p className="text-sm text-slate-600 line-clamp-2">{line.text}</p>
          <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full"
              style={{ width: `${Math.max(2, line.relevance * 100)}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400 shrink-0">{line.relevance.toFixed(3)}</span>
      </div>
    </button>
  );
}

function AnswerText({ text, onCitationClick }: { text: string; onCitationClick: (id: string) => void }) {
  const parts = text.split(/(\[L\d+\])/g);
  return (
    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/\[L(\d+)\]/);
        if (match) {
          const lineId = `L${match[1].padStart(4, '0')}`;
          return (
            <button
              key={i}
              onClick={() => onCitationClick(lineId)}
              className="inline-flex items-center text-sky-600 hover:text-sky-700 hover:underline font-mono text-xs font-medium mx-0.5"
            >
              [{lineId}]
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function DocumentViewer({
  lines, highlightedLine, onCitationClick, topLines, showHeatmap, setShowHeatmap,
}: {
  lines: DocLine[];
  highlightedLine: string | null;
  onCitationClick: (id: string) => void;
  topLines?: TopLine[];
  showHeatmap: boolean;
  setShowHeatmap: (b: boolean) => void;
}) {
  const relevanceMap = new Map<string, number>();
  if (topLines) {
    for (const l of topLines) {
      relevanceMap.set(l.lineId, l.relevance);
    }
  }

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">{lines.length} lines</p>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
            showHeatmap ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-white text-slate-500 border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Relevance heatmap
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 max-h-[600px] overflow-y-auto scrollbar-thin">
        <div className="font-mono text-xs">
          {lines.map((line) => {
            const isHighlighted = highlightedLine === line.id;
            const relevance = relevanceMap.get(line.id);
            const hasRelevance = relevance !== undefined && relevance > 0;
            const heatBg = showHeatmap && hasRelevance
              ? `rgba(56, 189, 248, ${Math.min(0.15, relevance * 0.15)})`
              : undefined;
            return (
              <div
                key={line.id}
                id={`line-${line.id}`}
                className={`flex group hover:bg-slate-50 transition ${
                  isHighlighted ? 'line-highlight' : ''
                }`}
                style={heatBg ? { backgroundColor: heatBg } : undefined}
              >
                <button
                  onClick={() => onCitationClick(line.id)}
                  className="w-16 shrink-0 px-2 py-1 text-slate-400 hover:text-sky-600 text-right select-none"
                >
                  {line.id}
                </button>
                <span className="px-3 py-1 text-slate-700 break-words flex-1">{line.text}</span>
                {hasRelevance && showHeatmap && (
                  <span className="px-2 py-1 text-sky-500 shrink-0">{relevance.toFixed(2)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ComparisonPanel({
  outcome, searching, onCitationClick,
}: {
  outcome: SearchOutcome | null;
  searching: boolean;
  onCitationClick: (id: string) => void;
}) {
  if (!outcome || !outcome.baseline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <GitCompareArrows className="w-10 h-10 text-slate-200 mb-3" />
        <p className="text-slate-400">Enable "Compare with embeddings" and run a search to see the side-by-side comparison.</p>
      </div>
    );
  }

  const { result, baseline } = outcome;
  const jevIds = new Set(result.topLines.slice(0, 5).map((l) => l.lineId));
  const embedIds = new Set(baseline.topLines.slice(0, 5).map((l) => l.lineId));
  let overlap = 0;
  for (const id of jevIds) if (embedIds.has(id)) overlap++;
  const overlapAt5 = overlap / 5;

  return (
    <div className="pt-6 space-y-4 fade-in">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Overlap@5</p>
            <p className="text-2xl font-bold text-slate-700">{(overlapAt5 * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Jev latency</p>
            <p className="text-2xl font-bold text-sky-600">{result.latencyMs}<span className="text-sm text-slate-400">ms</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Embed latency</p>
            <p className="text-2xl font-bold text-violet-600">{baseline.latencyMs}<span className="text-sm text-slate-400">ms</span></p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-center">
          <div>
            <p className="text-xs text-slate-400">Jev cost</p>
            <p className="text-sm font-mono text-slate-600">${result.costUsd.toFixed(7)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Embed cost</p>
            <p className="text-sm font-mono text-slate-600">${baseline.costUsd.toFixed(7)}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-sky-500" />
            <p className="text-sm font-semibold text-slate-700">Jev (vectorless)</p>
            <span className="ml-auto text-xs text-slate-400">{result.model}</span>
          </div>
          <div className="space-y-2">
            {result.topLines.slice(0, 5).map((line, i) => (
              <LineCard key={line.lineId} line={line} rank={i + 1} onClick={() => onCitationClick(line.lineId)} />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                outcome.verdict === 'answered' ? 'bg-emerald-50 text-emerald-600' :
                outcome.verdict === 'partial' ? 'bg-amber-50 text-amber-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {verdictLabel(outcome.verdict)}
              </span>
              <span className="ml-2">exists = {result.exists.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-violet-500" />
            <p className="text-sm font-semibold text-slate-700">Embeddings baseline</p>
            <span className="ml-auto text-xs text-slate-400">{baseline.model}</span>
          </div>
          <div className="space-y-2">
            {baseline.topLines.slice(0, 5).map((line, i) => (
              <LineCard key={line.lineId} line={line} rank={i + 1} onClick={() => onCitationClick(line.lineId)} />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              Embeddings always return nearest neighbors and cannot say "not in this document."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsPanel({
  history, stats, prepared,
}: {
  history: SearchRecord[];
  stats: SearchStats | null;
  prepared: PreparedDoc;
}) {
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-10 h-10 text-slate-200 mb-3" />
        <p className="text-slate-400">Run a search to see stats.</p>
      </div>
    );
  }

  return (
    <div className="pt-6 space-y-4 fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total searches" value={String(stats.totalSearches)} icon={Search} />
        <StatCard label="Avg Jev latency" value={`${stats.avgJevLatency} ms`} icon={Zap} />
        <StatCard label="Jev cost" value={`$${stats.jevCost.toFixed(7)}`} icon={Cpu} />
        <StatCard label="Embed cost" value={`$${stats.embedCost.toFixed(7)}`} icon={Database} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">Cost comparison per search</p>
        <div className="space-y-3">
          <CostBar label="Jev (vectorless)" cost={stats.jevCost / Math.max(1, stats.totalSearches)} color="bg-sky-500" />
          <CostBar label="Embeddings baseline" cost={stats.embedCost / Math.max(1, stats.totalSearches)} color="bg-violet-500" />
          <CostBar label="LLM reads whole doc" cost={stats.llmReadCost} color="bg-amber-500" />
        </div>
        <p className="text-xs text-slate-400 mt-3">
          The "LLM reads whole doc" estimate assumes sending all ~{prepared.tokenEstimate.toLocaleString()} tokens to a model at $5/M tokens.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">Recent searches</p>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No searches yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {history.map((s) => {
              const v = computeVerdict(Number(s.exists_p), { found: 0.7, absent: 0.35 });
              const colors = verdictColor(v);
              return (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                  <span className="text-slate-700 truncate flex-1">{s.query}</span>
                  <span className="text-xs text-slate-400 shrink-0">{s.latency_ms}ms</span>
                  <span className="text-xs font-mono text-slate-400 shrink-0">{Number(s.exists_p).toFixed(2)}</span>
                  <span className={`text-xs shrink-0 ${colors.text}`}>{verdictLabel(v)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <Icon className="w-4 h-4 text-slate-300" />
      </div>
      <p className="text-xl font-bold text-slate-700">{value}</p>
    </div>
  );
}

function CostBar({ label, cost, color }: { label: string; cost: number; color: string }) {
  const maxCost = Math.max(cost, 0.0001);
  const widthPct = Math.min(100, (cost / maxCost) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-mono text-slate-400">${cost.toFixed(7)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.max(2, widthPct)}%` }} />
      </div>
    </div>
  );
}
