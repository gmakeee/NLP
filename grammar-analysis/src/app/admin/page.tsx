'use client';

import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Users, UserPlus, BookOpen, UserCheck, 
  Upload, Plus, RefreshCw, LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'teachers' | 'classes' | 'students'>('teachers');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Refs for forms
  const teacherFormRef = useRef<HTMLFormElement>(null);
  const classFormRef = useRef<HTMLFormElement>(null);
  const assignFormRef = useRef<HTMLFormElement>(null);
  const singleStudentFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (text: string, type: 'error' | 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchState = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch('/api/admin/teachers'),
        fetch('/api/admin/classes')
      ]);
      if (tRes.ok) setTeachers(await tRes.json());
      if (cRes.ok) setClasses(await cRes.json());
    } catch (err) {
      showMessage('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email');
    const password = formData.get('password');

    const res = await fetch('/api/admin/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Teacher created successfully', 'success');
      teacherFormRef.current?.reset();
      fetchState();
    } else {
      showMessage(data.error || 'Creation failed', 'error');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name');

    const res = await fetch('/api/admin/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Class created successfully', 'success');
      classFormRef.current?.reset();
      fetchState();
    } else {
      showMessage(data.error || 'Creation failed', 'error');
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const teacher_id = formData.get('teacher_id');
    const class_id = formData.get('class_id');

    const res = await fetch('/api/admin/classes/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_id, class_id })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Teacher assigned successfully', 'success');
      assignFormRef.current?.reset();
      fetchState();
    } else {
      showMessage(data.error || 'Assignment failed', 'error');
    }
  };

  const handleCreateSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        full_name: formData.get('full_name'), 
        birth_date: formData.get('birth_date'), 
        class_id: formData.get('class_id') 
      })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Student created successfully', 'success');
      singleStudentFormRef.current?.reset();
    } else {
      showMessage(data.error || 'Failed to create student', 'error');
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setLoading(true);
        const res = await fetch('/api/admin/students/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: results.data })
        });
        const data = await res.json();
        setLoading(false);
        if (res.ok) {
          if (data.errors?.length > 0) {
            showMessage(`${data.message}. However, ${data.errors.length} errors occurred. Check console.`, 'error');
            console.warn('Import Errors', data.errors);
          } else {
            showMessage(data.message || 'CSV imported successfully', 'success');
          }
        } else {
          showMessage(data.error || 'CSV import failed', 'error');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        showMessage(`CSV Parse Error: ${error.message}`, 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b pb-4 border-slate-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Admin Area</h1>
            <p className="text-slate-500 mt-1">Manage the LMS infrastructure and personnel.</p>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={fetchState} disabled={loading} className="text-slate-500 hover:text-slate-800 transition">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100">&times;</button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-64 flex flex-col gap-2">
            {[
              { id: 'teachers', label: 'Teachers', icon: Users },
              { id: 'classes', label: 'Classes', icon: BookOpen },
              { id: 'students', label: 'Students', icon: UserPlus },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-left font-medium ${activeTab === tab.id ? 'bg-white shadow-sm border border-slate-200 text-blue-600' : 'text-slate-600 hover:bg-slate-200/50'}`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </aside>

          <main className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8">
            {activeTab === 'teachers' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><UserPlus className="text-blue-500"/> Add New Teacher</h2>
                <form ref={teacherFormRef} onSubmit={handleCreateTeacher} className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input type="email" name="email" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="teacher@school.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                    <input type="password" name="password" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="••••••••" />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2">
                       <Plus className="w-4 h-4"/> Create Teacher
                    </button>
                  </div>
                </form>

                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Existing Teachers</h3>
                <div className="grid gap-3">
                  {teachers.map(t => (
                    <div key={t.id} className="p-4 border rounded-lg flex items-center justify-between bg-slate-50">
                      <span className="font-medium text-slate-700">{t.email}</span>
                      <span className="text-xs text-slate-400 font-mono">ID: {t.id.slice(0,8)}...</span>
                    </div>
                  ))}
                  {teachers.length === 0 && <p className="text-slate-500 italic">No teachers found.</p>}
                </div>
              </div>
            )}

            {activeTab === 'classes' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><BookOpen className="text-emerald-500"/> Add Class</h2>
                    <form ref={classFormRef} onSubmit={handleCreateClass} className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                        <input type="text" name="name" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="E.g. Grade 10 - Math" />
                      </div>
                      <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50 self-end">
                        Create Class
                      </button>
                    </form>
                  </div>

                  <div>
                     <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><UserCheck className="text-indigo-500"/> Assign Teacher</h2>
                     <form ref={assignFormRef} onSubmit={handleAssignTeacher} className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Teacher</label>
                        <select name="teacher_id" required className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">-- Choose Teacher --</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
                        <select name="class_id" required className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">-- Choose Class --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50 self-end">
                        Assign
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Active Classes</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {classes.map(c => (
                      <div key={c.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                        <h4 className="font-bold text-slate-800">{c.name}</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.teachers?.length > 0 ? c.teachers.map((t: any) => (
                            <span key={t.id} className="px-2 py-1 bg-white border border-slate-200 text-xs font-semibold text-slate-600 rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3"/> {t.email.split('@')[0]}
                            </span>
                          )) : <span className="text-xs text-slate-400 italic">No assigned teachers</span>}
                        </div>
                      </div>
                    ))}
                    {classes.length === 0 && <p className="text-slate-500 italic">No classes found.</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid lg:grid-cols-2 gap-10">
                
                <div>
                  <h2 className="text-xl font-bold mb-4 text-slate-800 border-b pb-2">Add Student Manually</h2>
                  <form ref={singleStudentFormRef} onSubmit={handleCreateSingleStudent} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input type="text" name="full_name" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-400" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Birth Date</label>
                      <input type="date" name="birth_date" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Assign Class</label>
                      <select name="class_id" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-400">
                        <option value="">-- Choose Class --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition disabled:opacity-50 w-full mt-2">
                       Register Student
                    </button>
                  </form>
                </div>

                <div>
                   <h2 className="text-xl font-bold mb-4 text-slate-800 border-b pb-2">Bulk Import Students</h2>
                   <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl p-8 text-center flex flex-col items-center justify-center transition hover:bg-slate-100">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h3 className="font-semibold tracking-tight text-slate-800">Upload CSV File</h3>
                      <p className="text-sm text-slate-500 mt-1 mb-6 max-w-xs">
                        Required Columns: <code className="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono">Name</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono">BirthDate</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono">ClassName</code>
                      </p>
                      
                      <input 
                        type="file" 
                        accept=".csv" 
                        ref={fileInputRef} 
                        onChange={handleCsvImport} 
                        className="hidden" 
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload" className="cursor-pointer inline-flex px-6 py-2.5 shadow-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-lg font-medium transition">
                        Select CSV to Import
                      </label>
                   </div>
                </div>

              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
