// apps/web/pages/verify-email.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '@wealthlog/shared';
import Link from 'next/link';

export default function VerifyEmail() {
  const router = useRouter();
  const { token } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Vérifier le token une fois qu'il est disponible
    if (token) {
      verifyEmailToken();
    }
  }, [token]);

  // Cette fonction utilise bien l'endpoint verify-email
  const verifyEmailToken = async () => {
    if (!token) return;

    try {
      const response = await api.get(`/auth/verify-email?token=${token}`);
      
      if (response.data?.success) {
        setIsSuccess(true);
      } else {
        setError('Ce lien de vérification est invalide ou a expiré.');
      }
    } catch (err: any) {
      console.error('Erreur de vérification d\'email:', err);
      setError(err.response?.data?.error || 'Ce lien de vérification est invalide ou a expiré.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  // État de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text)]">
        <div className="w-full max-w-md bg-[var(--background-2)] rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 mb-4">
              <svg className="animate-spin h-6 w-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-[var(--text)]">
              Vérification de votre adresse e-mail...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // État de succès
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text)]">
        <div className="w-full max-w-md bg-[var(--background-2)] rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
              Email vérifié avec succès !
            </h2>
            <p className="text-[var(--text)] mb-6">
              Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant vous connecter à votre compte.
            </p>
            
            <button
              type="button"
              onClick={handleGoToLogin}
              className="w-full py-2 text-white font-semibold bg-[var(--primary)] rounded-lg hover:opacity-90 transition"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // État d'erreur
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text)]">
      <div className="w-full max-w-md bg-[var(--background-2)] rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
            Vérification échouée
          </h2>
          <p className="text-[var(--text)] mb-6">
            {error || "Ce lien de vérification est invalide ou a expiré."}
          </p>
          
          <div className="space-y-3">
            <Link href="/login">
              <span className="block w-full py-2 text-[var(--text)] font-semibold border border-gray-300 rounded-lg hover:bg-[var(--background)] transition cursor-pointer">
                Retour à la connexion
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
