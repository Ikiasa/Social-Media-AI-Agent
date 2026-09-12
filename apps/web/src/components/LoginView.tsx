import React, { useState } from 'react';

interface LoginViewProps {
  onLoginSuccess: (user: { name: string; email: string; role: string; workspaceId: string }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('demo@riona.ai');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Dev Agency Admin');
  const [workspaceName, setWorkspaceName] = useState('Main Social Agency WS');
  const [role, setRole] = useState('agency_admin');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      onLoginSuccess({
        name: isRegister ? name : 'Dev Agency Admin',
        email,
        role: isRegister ? role : 'agency_admin',
        workspaceId: isRegister ? workspaceName.toLowerCase().replace(/\s+/g, '-') : 'ws-dev-1',
      });
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white text-xl mx-auto shadow-lg shadow-indigo-500/30">
            R
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {isRegister ? 'Buat Akun SaaS Riona Social' : 'Masuk ke Riona Social Platform'}
          </h1>
          <p className="text-xs text-slate-400">
            {isRegister
              ? 'Kelola multi-brand dan banyak akun Instagram, TikTok, & Threads dalam satu dashboard AI.'
              : 'Multi-Tenant Social Command Center & Viral Architecture Engine'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Alex Brand Manager"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email Alamat
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@agency.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nama Workspace / Agency
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Misal: Growth Agency Workspace"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Peran Akun
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="agency_admin">Agency Owner / Super Admin</option>
                  <option value="brand_manager">Brand Content Manager</option>
                  <option value="client_reviewer">Client Reviewer (Approval Only)</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-lg shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Memproses Autentikasi...</span>
            ) : (
              <span>{isRegister ? 'Buat Workspace Riona' : 'Masuk Dashboard Riona'}</span>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          {isRegister ? (
            <span>
              Sudah punya akun?{' '}
              <button onClick={() => setIsRegister(false)} className="text-indigo-400 font-semibold hover:underline">
                Masuk di sini
              </button>
            </span>
          ) : (
            <span>
              Belum punya workspace?{' '}
              <button onClick={() => setIsRegister(true)} className="text-indigo-400 font-semibold hover:underline">
                Daftar Akun Baru
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
