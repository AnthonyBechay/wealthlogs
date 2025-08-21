// apps/web/pages/forgot-password.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "../src/lib/api";
import Link from "next/link";

// Types pour une meilleure sécurité de type
interface ForgotPasswordForm {
  email: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

export default function ForgotPassword() {
  const router = useRouter();
  const [formData, setFormData] = useState<ForgotPasswordForm>({
    email: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Gestionnaire centralisé de changement d'entrée
  const handleInputChange = (field: keyof ForgotPasswordForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Effacer l'erreur lorsque l'utilisateur commence à taper
    if (error) setError("");
  };

  // Gestion d'erreur améliorée
  const getErrorMessage = (err: unknown): string => {
    const error = err as ApiError;
    
    // Vérifier d'abord le nouveau format de réponse API
    if ((error as any).response?.data?.error) {
      return (error as any).response.data.error;
    }
    
    // Repli sur l'ancien format
    if ((error as any).response?.data?.message) {
      return (error as any).response.data.message;
    }
    
    // Replis basés sur le statut
    if ((error as any).response?.status === 404) {
      return "Aucun compte trouvé avec cette adresse e-mail.";
    }
    if ((error as any).response?.status === 429) {
      return "Trop de demandes. Veuillez réessayer plus tard.";
    }

    if (!navigator.onLine) {
      return "Veuillez vérifier votre connexion Internet.";
    }
    
    return "Une erreur s'est produite. Veuillez réessayer.";
  };

  // Validation email simple
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validation côté client
    if (!formData.email.trim()) {
      setError("L'adresse e-mail est requise.");
      setIsLoading(false);
      return;
    }
    
    if (!isValidEmail(formData.email.trim())) {
      setError("Veuillez entrer une adresse e-mail valide.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.forgotPassword(formData.email.trim());
      setIsSuccess(true);
    } catch (err) {
      console.error("Erreur mot de passe oublié:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  const handleResendEmail = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await api.forgotPassword(formData.email.trim());
      // Afficher un bref message de succès ou juste mettre à jour l'état de chargement
      console.log("E-mail de réinitialisation renvoyé avec succès");
    } catch (err) {
      console.error("Erreur de renvoi:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

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
              Vérifiez votre e-mail
            </h2>
            <p className="text-[var(--text)] mb-6">
              Nous avons envoyé un lien de réinitialisation de mot de passe à <strong>{formData.email}</strong>
            </p>
            <p className="text-sm text-[var(--text)] mb-6">
              Vous n'avez pas reçu l'e-mail ? Vérifiez votre dossier spam ou cliquez sur le bouton ci-dessous.
            </p>
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isLoading}
                className="w-full py-2 text-[var(--primary)] font-semibold border border-[var(--primary)] rounded-lg hover:bg-[var(--primary)] hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Renvoi en cours..." : "Renvoyer l'e-mail"}
              </button>
              
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-2 text-[var(--text)] font-semibold border border-gray-300 rounded-lg hover:bg-[var(--background)] transition"
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // État du formulaire
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text)]">
      <div className="w-full max-w-md bg-[var(--background-2)] rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--text)]">
            Mot de passe oublié ?
          </h2>
          <p className="text-[var(--text)] mt-2">
            Pas de souci, nous vous enverrons les instructions de réinitialisation.
          </p>
        </div>

        {error && (
          <div 
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label 
              htmlFor="email"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
              value={formData.email}
              onChange={handleInputChange("email")}
              disabled={isLoading}
              required
              placeholder="Entrez votre adresse e-mail"
              aria-describedby={error ? "error-message" : undefined}
            />
          </div>

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 mt-6 text-white font-bold rounded-lg bg-[var(--primary)] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Envoi en cours...</span>
              </>
            ) : (
              <span>Envoyer l'e-mail de réinitialisation</span>
            )}
          </button>
        </form>

        {/* Lien de retour à la connexion */}
        <div className="mt-6 text-center">
          <Link 
            href="/login"
            className="text-[var(--primary)] hover:opacity-80 font-semibold flex items-center justify-center space-x-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Retour à la connexion</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
