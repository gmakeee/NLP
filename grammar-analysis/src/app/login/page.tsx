import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ClientLogin from './ClientLogin';

export default async function LoginPage() {
  const session = await getSession();
  
  if (session && session.userId) {
    if (session.role === 'ADMIN') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  return <ClientLogin />;
}
