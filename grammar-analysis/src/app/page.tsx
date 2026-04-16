import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { BookOpen, ArrowRight, Activity, Users, Shield } from 'lucide-react';

export default async function HomePage() {
  const session = await getSession();
  const isLoggedIn = !!(session && session.userId);
  const targetDashboard = session?.role === 'ADMIN' ? '/admin' : '/dashboard';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <BookOpen className="w-5 h-5"/>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-800">GrammarLMS</span>
        </div>
        <nav>
          {isLoggedIn ? (
            <Link href={targetDashboard} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition">
              Go to Portal &rarr;
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full transition shadow-md hover:shadow-lg">
              Sign In
            </Link>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold uppercase tracking-widest shadow-sm">
            <Activity className="w-4 h-4" /> Next-Gen Learning
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-tight tracking-tighter">
            Smart Linguistic <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">
              Analysis Engine
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Revolutionize language teaching with automated grammar complexity indexing, morphology checks, and real-time student performance tracking.
          </p>
          
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isLoggedIn ? (
              <Link href={targetDashboard} className="px-8 py-4 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 border border-transparent">
                Open Dashboard <ArrowRight className="w-5 h-5"/>
              </Link>
            ) : (
              <Link href="/login" className="px-8 py-4 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg transition shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2 border border-transparent">
                Login to continue <ArrowRight className="w-5 h-5"/>
              </Link>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mt-24 text-left">
           {[
             { icon: Users, title: 'Class Management', desc: 'Group your students, manage records, and observe class-wide average trends painlessly.' },
             { icon: Activity, title: 'AI Diagnostics', desc: 'Instantly pinpoint morphological and syntactic errors using advanced Russian NLP models.' },
             { icon: Shield, title: 'RBAC Security', desc: 'Strict separation of roles ensuring teachers only access their own assigned classroom data.' }
           ].map((feature, idx) => (
             <div key={idx} className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition">
               <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                 <feature.icon className="w-6 h-6"/>
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h3>
               <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
             </div>
           ))}
        </div>
      </main>

      <footer className="text-center p-8 text-slate-400 text-sm font-medium border-t border-slate-200 mt-12 bg-slate-100/50">
        &copy; 2026 GrammarLMS Prototype Platform.
      </footer>
    </div>
  );
}
