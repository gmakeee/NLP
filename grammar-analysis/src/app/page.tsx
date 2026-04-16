"use client";

import React, { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Info, BookOpen } from "lucide-react";

// --- Types ---
interface RuleResult {
  id: string;
  ruleId: string;
  isCorrect: boolean;
  fragment: string;
  errorNote: string | null;
}

interface Analysis {
  id: string;
  content: string;
  rds: number;
  car: number;
  gci: number;
  ruleResults: RuleResult[];
}

// --- Text Highlighting Algorithm ---
// Handles overlapping matches gracefully by analyzing character-by-character mapping
function buildHighlights(text: string, rules: RuleResult[]) {
  const chars = text.split("").map((c) => ({ char: c, matchedRules: [] as RuleResult[] }));

  rules.forEach((rule) => {
    if (!rule.fragment) return;
    let startIndex = 0;
    while ((startIndex = text.indexOf(rule.fragment, startIndex)) !== -1) {
      for (let i = startIndex; i < startIndex + rule.fragment.length; i++) {
        // Safely access array under strict index typing
        const charObj = chars[i];
        if (charObj) {
          // Prevent duplicate refs if indexOf loops back
          if (!charObj.matchedRules.find((r) => r.id === rule.id)) {
            charObj.matchedRules.push(rule);
          }
        }
      }
      startIndex += rule.fragment.length;
    }
  });

  const spans = [];
  let currentHash = "";
  let currentStr = "";
  let currentRules: RuleResult[] = [];

  for (let i = 0; i < chars.length; i++) {
    const charObj = chars[i];
    if (!charObj) continue;

    // Generate a unique signature for the exact combination of rules applying to this character
    const hash = charObj.matchedRules
      .map((r) => r.id)
      .sort()
      .join(",");

    if (hash !== currentHash) {
      if (currentStr.length > 0) {
        spans.push({ text: currentStr, rules: currentRules });
      }
      currentStr = charObj.char;
      currentRules = [...charObj.matchedRules];
      currentHash = hash;
    } else {
      currentStr += charObj.char;
    }
  }
  if (currentStr.length > 0) {
    spans.push({ text: currentStr, rules: currentRules });
  }

  return spans;
}

export default function AnalysisDashboard() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  
  // Tooltip tracking
  const [hoveredRules, setHoveredRules] = useState<RuleResult[] | null>(null);

  const handleAnalyze = async () => {
    if (text.length < 10) {
      setError("Text must be at least 10 characters long.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setHoveredRules(null);

    try {
      const res = await fetch("/api/analyze/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to analyze text");
      }

      setAnalysis(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHighlightClass = (rules: RuleResult[]) => {
    if (rules.length === 0) return "";
    // If ANY overlapping rule is incorrect, mark the block as an error (Red)
    const hasError = rules.some((r) => !r.isCorrect);
    return hasError
      ? "bg-red-200 text-red-900 border-b-2 border-red-500 cursor-pointer"
      : "bg-green-200 text-green-900 border-b-2 border-green-500 cursor-pointer";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Панель лингвистического анализа
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Input / Action Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <label htmlFor="text-input" className="block text-sm font-medium text-slate-700 mb-2">
                Введите текст на русском языке (макс. 10 000 знаков)
              </label>
              <textarea
                id="text-input"
                className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y transition-all"
                placeholder="Мама мыла раму..."
                maxLength={10000}
                value={text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-slate-400 font-medium">
                  {text.length} / 10 000 знаков
                </span>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || text.length === 0}
                  className="flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Анализируется
                    </>
                  ) : (
                    "Анализировать текст"
                  )}
                </button>
              </div>
              
              {/* Error Alert */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* Results Display */}
            {analysis && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  Карта синтаксического разбора
                  <Info className="w-5 h-5 text-slate-400 ml-2" />
                </h2>
                
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-lg leading-relaxed md:leading-loose text-slate-800">
                  {buildHighlights(analysis.content, analysis.ruleResults).map((span, idx) => {
                    if (span.rules.length === 0) {
                      return <span key={idx}>{span.text}</span>;
                    }

                    return (
                      <span
                        key={idx}
                        className={`transition-colors duration-200 ease-in-out ${getHighlightClass(span.rules)}`}
                        onClick={() => setHoveredRules(span.rules)}
                        onMouseEnter={() => setHoveredRules(span.rules)}
                        onMouseLeave={() => setHoveredRules(null)}
                      >
                        {span.text}
                      </span>
                    );
                  })}
                </div>
                
                <p className="text-xs text-slate-500 mt-4 flex items-center justify-end">
                  <span className="inline-block w-3 h-3 bg-green-400 rounded-sm mr-1"></span> Корректно
                  <span className="inline-block w-3 h-3 bg-red-400 rounded-sm ml-4 mr-1"></span> Ошибка 
                  <span className="ml-4">(Наведите на выделенный фрагмент для деталей)</span>
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar: Metrics & Tooltips */}
          <div className="space-y-6">
            
            {/* Dynamic Hover Tooltip Panel */}
            {analysis && (
              <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700 transition-all min-h-[150px]">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Результаты диагностики
                </h3>
                
                {!hoveredRules || hoveredRules.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">
                    Наведите на выделенный фрагмент в тексте, чтобы увидеть сработавшие правила и выявленные ошибки.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {hoveredRules.map((r, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {r.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          )}
                          <span className="font-mono text-sm bg-slate-700 px-2 py-0.5 rounded">
                            {r.ruleId}
                          </span>
                        </div>
                        {r.errorNote && (
                          <p className="text-sm text-red-300 mt-1 pl-7">
                            Ошибка: {r.errorNote}
                          </p>
                        )}
                        {r.isCorrect && (
                          <p className="text-sm text-green-300 mt-1 pl-7">
                            Синтаксическая структура верна.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metrics Dashboard */}
            {analysis && (
              <div className="space-y-4">
                {/* RDS Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">Индекс разнообразия правил (RDS)</p>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold tracking-tight text-blue-600">
                      {typeof analysis.rds === 'number' ? (analysis.rds * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Охват различных системных правил.</p>
                </div>

                {/* CAR Card with Progress Ring UI */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-3">Коэффициент корректности (CAR)</p>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="4" />
                        <circle
                          cx="18" cy="18" r="16" fill="none"
                          className="stroke-green-500 transition-all duration-1000 ease-out"
                          strokeWidth="4"
                          strokeDasharray="100"
                          strokeDashoffset={100 - (analysis.car || 0) * 100}
                        />
                      </svg>
                      <span className="absolute text-sm font-bold text-slate-700">
                        {typeof analysis.car === 'number' ? (analysis.car * 100).toFixed(0) : "0"}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex-1">
                      Доля правильно построенных синтаксических конструкций.
                    </p>
                  </div>
                </div>

                {/* GCI Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">Индекс сложности (GCI)</p>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold tracking-tight text-purple-600">
                      {typeof analysis.gci === 'number' ? analysis.gci.toFixed(2) : "0.00"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Взвешенная алгоритмическая плотность грамматики.</p>
                </div>
              </div>
            )}
            
            {/* Empty State / Wait State */}
            {!analysis && !loading && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-dashed border-slate-300 text-center flex flex-col items-center justify-center min-h-[300px]">
                <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 text-sm">
                  Метрики и оценки появятся здесь после завершения анализа.
                </p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
