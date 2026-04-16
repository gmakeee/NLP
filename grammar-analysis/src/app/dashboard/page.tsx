'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Users, BookOpen, User, Calendar, Activity,
  ChevronRight, CheckCircle2, AlertCircle, Play, FileText, ChevronDown, Clock, Plus, BarChart2, X
} from 'lucide-react';

type Student = { id: string, full_name: string, birth_date: string, class_id: string, analysis_results?: any[] };
type ClassGroup = { id: string, name: string, students: Student[] };

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  
  const [activeView, setActiveView] = useState<'empty' | 'class' | 'student'>('empty');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Forms & Modals states
  const [showClassModal, setShowClassModal] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  
  const [showMatchModal, setShowMatchModal] = useState<any>(null); // holds analysis result

  const [textInput, setTextInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const showMessage = (text: string, type: 'error' | 'success') => {
    setGlobalMessage({ text, type });
    setTimeout(() => setGlobalMessage(null), 4000);
  };

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch('/api/dashboard/classes');
      if (res.ok) {
        setClasses(await res.json());
      }
    } catch (e) {
      showMessage('Failed to structure class data', 'error');
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeView === 'student' && selectedStudentId) {
      setLoadingContext(true);
      fetch(`/api/dashboard/students/${selectedStudentId}`)
        .then(r => r.json())
        .then(data => {
          setStudentDetails(data);
          setLoadingContext(false);
          setTextInput('');
        })
        .catch(() => setLoadingContext(false));
    }
  }, [activeView, selectedStudentId]);

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  const openClassView = (classId: string) => {
    setSelectedClassId(classId);
    setActiveView('class');
    if (!expandedClasses[classId]) toggleClass(classId);
  };

  const openStudentView = (studentId: string, classId: string) => {
    setSelectedStudentId(studentId);
    setSelectedClassId(classId);
    setActiveView('student');
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/dashboard/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: classNameInput })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Class created successfully', 'success');
      setShowClassModal(false);
      setClassNameInput('');
      fetchClasses();
    } else {
      showMessage(data.error || 'Creation failed', 'error');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const res = await fetch('/api/dashboard/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        full_name: formData.get('full_name'), 
        birth_date: formData.get('birth_date'), 
        class_id: selectedClassId 
      })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Student added to class', 'success');
      (e.target as HTMLFormElement).reset();
      fetchClasses(); // Refresh to show new student in sidebar
    } else {
      showMessage(data.error || 'Failed to add student', 'error');
    }
  };

  const handleAnalyze = async () => {
    if (!textInput.trim() || !selectedStudentId) return;
    setAnalyzing(true);
    
    try {
      const res = await fetch('/api/dashboard/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput, student_id: selectedStudentId })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setStudentDetails((prev: any) => ({
        ...prev,
        analysis_results: [data, ...(prev.analysis_results || [])]
      }));
      setTextInput('');
      showMessage('Analysis completed', 'success');
      fetchClasses(); // Refresh in background so GCI averages update

    } catch (err: any) {
      showMessage(err.message || 'Analysis service is temporarily unavailable.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper for generating highlighted HTML safely
  const renderHighlightedHTML = (text: string, matches: any[]) => {
    if (!matches || matches.length === 0) return text;
    let highlighted = text;
    // VERY NAIVE REPLACE: (Risk of nested replacing, but matches from our NLP usually don't overlap exactly identically)
    matches.forEach((m) => {
      if (m.fragment) {
        // Simple global replace
        const re = new RegExp(`(${m.fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlighted = highlighted.replace(re, `<mark class="bg-rose-200 text-rose-900 px-1 py-0.5 rounded cursor-pointer border border-rose-300 shadow-sm" title="${m.error_note}">$1</mark>`);
      }
    });
    return highlighted;
  };

  // Active Class computing stats
  const activeClassData = classes.find(c => c.id === selectedClassId);
  let classAverageGci = 0;
  if (activeClassData && activeClassData.students.length > 0) {
     let sumGci = 0;
     let count = 0;
     activeClassData.students.forEach(s => {
       const latest = s.analysis_results?.[0];
       if (latest?.metrics?.gci !== undefined && latest?.metrics?.gci !== null) {
         sumGci += latest.metrics.gci;
         count++;
       }
     });
     if (count > 0) classAverageGci = Math.round(sumGci / count);
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Global Toast */}
      {globalMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center justify-between gap-4 animate-in slide-in-from-top-2 ${globalMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <span className="font-medium text-sm">{globalMessage.text}</span>
          <button onClick={() => setGlobalMessage(null)} className="opacity-50 hover:opacity-100"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-1/3 md:h-full shadow-sm z-10 shrink-0">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" /> My Dashboard
          </h1>
          <button 
            onClick={() => setShowClassModal(true)}
            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition" title="Create Class"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingClasses ? (
             <div className="flex justify-center p-8"><div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>
          ) : classes.length === 0 ? (
             <p className="text-sm text-slate-400 text-center py-6">Click + to create your first class.</p>
          ) : (
            classes.map(c => (
              <div key={c.id} className="border border-slate-100 rounded-xl bg-slate-50 shadow-sm overflow-hidden transition-all">
                <button 
                  onClick={() => openClassView(c.id)}
                  className={`w-full flex items-center justify-between p-3.5 hover:bg-slate-100 transition border-b border-transparent ${activeView === 'class' && selectedClassId === c.id ? 'bg-indigo-50 border-indigo-100 text-indigo-900 border-b-indigo-100' : 'bg-white text-slate-700'}`}
                >
                  <span className="font-semibold flex items-center gap-2 text-sm">
                    <Users className={`w-4 h-4 ${activeView === 'class' && selectedClassId === c.id ? 'text-indigo-600' : 'text-slate-400'}`}/> {c.name}
                  </span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 rounded-full">{c.students.length}</span>
                    {expandedClasses[c.id] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>
                
                {expandedClasses[c.id] && (
                  <div className="bg-slate-50 p-2 space-y-1 border-t border-slate-100 shadow-inner">
                    {c.students?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic px-4 py-2">Class is empty.</p>
                    ) : (
                      c.students?.map(s => (
                        <button
                          key={s.id}
                          onClick={() => openStudentView(s.id, c.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-3 ${activeView === 'student' && selectedStudentId === s.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200 border border-transparent hover:border-slate-300'}`}
                        >
                          <User className={`w-3.5 h-3.5 ${activeView === 'student' && selectedStudentId === s.id ? 'text-indigo-200' : 'text-slate-400'}`} />
                          {s.full_name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-slate-50/50">
        
        {/* State 1: EMPTY */}
        {activeView === 'empty' && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
             <BookOpen className="w-16 h-16 mb-4 opacity-20" />
             <p className="text-lg">Select a Class or Student from the sidebar.</p>
          </div>
        )}

        {/* State 2: CLASS VIEW */}
        {activeView === 'class' && activeClassData && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
             
             {/* At a glance stats */}
             <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">Class: {activeClassData.name}</h2>
                  <p className="text-slate-500 mt-1">Manage students and track general progress.</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-4 shadow-sm w-full sm:w-auto">
                   <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><BarChart2 className="w-6 h-6"/></div>
                   <div>
                     <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Avg. GCI Score</p>
                     <p className="text-3xl font-black text-indigo-900">{classAverageGci > 0 ? `${classAverageGci}%` : 'N/A'}</p>
                   </div>
                </div>
             </div>

             {/* Add Student Form */}
             <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" /> Add New Student
                </h3>
                <form onSubmit={handleAddStudent} className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                    <input type="text" name="full_name" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="E.g. Петя Иванов" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Birth Date</label>
                    <input type="date" name="birth_date" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button type="submit" className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition flex items-center gap-2 text-sm shadow-sm">
                       <User className="w-4 h-4"/> Enroll Student
                    </button>
                  </div>
                </form>
             </div>
          </div>
        )}

        {/* State 3: STUDENT VIEW */}
        {activeView === 'student' && (
          loadingContext ? (
            <div className="h-full flex items-center justify-center">
               <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : studentDetails && !studentDetails.error ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              
              <div className="flex items-center justify-between bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <User className="w-7 h-7" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-slate-800">{studentDetails.full_name}</h2>
                     <div className="flex gap-4 mt-1 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(studentDetails.birth_date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {studentDetails.class?.name}</span>
                     </div>
                   </div>
                </div>
              </div>

              {/* Analysis Text Input */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600"/> Run Grammar Engine
                </h3>
                
                <textarea 
                  className="w-full h-32 p-4 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition bg-slate-50 focus:bg-white"
                  placeholder="Paste Russian text to be analyzed..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={analyzing}
                />
                
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-400 px-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Minimal length: 5 characters</p>
                  <button 
                    onClick={handleAnalyze} 
                    disabled={analyzing || textInput.trim().length < 5}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    {analyzing ? (
                      <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Processing</>
                    ) : (
                      <><Play className="w-4 h-4 fill-current"/> Analyze Text</>
                    )}
                  </button>
                </div>
              </div>

              {/* Analysis History Grid */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-500"/>
                  Recent Reports
                </h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {studentDetails.analysis_results?.length === 0 ? (
                    <div className="sm:col-span-2 text-slate-500 italic p-6 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl">No historical data found.</div>
                  ) : (
                    studentDetails.analysis_results?.map((res: any) => (
                      <div 
                        key={res.id} 
                        onClick={() => setShowMatchModal(res)}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-3 border-b pb-2">
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 opacity-80">
                            <Calendar className="w-3.5 h-3.5"/> {new Date(res.created_at).toLocaleDateString()}
                          </span>
                          
                          <div className="flex gap-2">
                             {res.metrics?.gci !== undefined && (
                               <div className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-xs border border-indigo-100" title="Grammar Complexity Index">
                                 GCI: {res.metrics.gci}%
                               </div>
                             )}
                          </div>
                        </div>
                        
                        <div className="text-sm text-slate-600 line-clamp-3 font-serif mb-3 italic">
                          "{res.raw_text}"
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto">
                          {res.metrics?.matches && res.metrics.matches.length > 0 ? (
                            <span className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded font-medium border border-rose-100 flex items-center gap-1">
                               <AlertCircle className="w-3 h-3"/> {res.metrics.matches.length} Issues
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-medium border border-emerald-100 flex items-center gap-1">
                               <CheckCircle2 className="w-3 h-3"/> Perfect
                            </span>
                          )}

                          <span className="text-indigo-600 text-xs font-semibold group-hover:underline flex items-center">
                            Details <ChevronRight className="w-3 h-3"/>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
             <div className="text-red-500 flex justify-center items-center h-full">Failed to load student details.</div>
          )
        )}
      </main>

      {/* MODAL: Create New Class */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Create New Class</h3>
              <button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateClass} className="p-5">
              <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
              <input 
                type="text" 
                required 
                value={classNameInput} 
                onChange={e => setClassNameInput(e.target.value)} 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-6" 
                placeholder="E.g. 11-A" 
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowClassModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-sm">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Full Diagnostics Result View */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMatchModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 m-0 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 <Activity className="w-6 h-6 text-indigo-600"/>
                 <div>
                   <h3 className="font-bold text-lg text-slate-800 leading-tight">Diagnostic Report</h3>
                   <p className="text-xs text-slate-500 font-mono">{new Date(showMatchModal.created_at).toLocaleString()}</p>
                 </div>
               </div>
               <button onClick={() => setShowMatchModal(null)} className="p-2 bg-slate-200/50 hover:bg-slate-200 rounded-full text-slate-600 transition"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                 {[
                   { label: 'GCI Score', value: showMatchModal.metrics?.gci ?? 'N/A', pop: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                   { label: 'RDS Score', value: showMatchModal.metrics?.rds ?? 'N/A', pop: 'text-blue-700 bg-blue-50 border-blue-200' },
                   { label: 'CAR Score', value: showMatchModal.metrics?.car ?? 'N/A', pop: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                 ].map(m => (
                   <div key={m.label} className={`px-5 py-3 border rounded-xl flex flex-col items-center shadow-sm w-32 ${m.pop}`}>
                     <span className="text-3xl font-black">{m.value}{m.value !== 'N/A' && '%'}</span>
                     <span className="text-xs font-semibold uppercase tracking-wider opacity-80 mt-1">{m.label}</span>
                   </div>
                 ))}
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 text-slate-400">Original Highlighted Text</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-800 font-serif leading-loose text-lg shadow-inner">
                   {showMatchModal.metrics?.matches?.length > 0 ? (
                      <div dangerouslySetInnerHTML={{ __html: renderHighlightedHTML(showMatchModal.raw_text, showMatchModal.metrics.matches) }} />
                   ) : (
                      <div>{showMatchModal.raw_text}</div>
                   )}
                </div>
              </div>

              {showMatchModal.metrics?.matches && showMatchModal.metrics.matches.length > 0 && (
                <div>
                   <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 text-slate-400 flex items-center gap-2">
                     <AlertCircle className="w-4 h-4"/> Found Issues ({showMatchModal.metrics.matches.length})
                   </h4>
                   <div className="grid gap-3">
                     {showMatchModal.metrics.matches.map((m: any, idx: number) => (
                       <div key={idx} className="bg-white border border-rose-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div>
                           <span className="bg-rose-100 text-rose-800 font-mono text-xs px-2 py-1 rounded inline-block mb-2 border border-rose-200 shadow-sm">
                             "{m.fragment}"
                           </span>
                           <p className="text-sm text-slate-700 font-medium">{m.error_note || 'Syntax/Grammar error.'}</p>
                         </div>
                         {m.is_correct !== undefined && (
                           <div className="shrink-0 text-xs text-rose-500 font-bold px-3 py-1 bg-white border border-rose-100 rounded-full shadow-sm text-center">
                             Rule: {m.rule_id || 'UNK'}
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
