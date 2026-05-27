import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { KeyRound, Mail, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toastError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (error) {
      // Toast already handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-gray-100 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-fuchsia-500/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-xl shadow-violet-500/25 mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            AgencyCRM
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI & Digital Agency</p>
        </div>
        <h2 className="mt-8 text-center text-2xl font-bold text-white">
          Crie sua conta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
            Fazer login
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-gray-900/50 backdrop-blur-xl py-8 px-4 border border-gray-800/50 shadow-2xl sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Nome completo
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 bg-gray-950/50 border border-gray-800 text-white rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 sm:text-sm transition-colors"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                E-mail
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 bg-gray-950/50 border border-gray-800 text-white rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 sm:text-sm transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Senha
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 bg-gray-950/50 border border-gray-800 text-white rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Confirme a Senha
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 bg-gray-950/50 border border-gray-800 text-white rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar minha conta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
