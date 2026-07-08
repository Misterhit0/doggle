import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { getLoginUrl } from '@/const';
import { useAuth } from '@/_core/hooks/useAuth';

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const signupMutation = trpc.auth.signup.useMutation();

  // If already authenticated, redirect to discovery
  useEffect(() => {
    if (user) {
      navigate('/discovery');
    }
  }, [user, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoading(true);

    try {
      const response = await signupMutation.mutateAsync({ email, password, name });
      utils.auth.me.setData(undefined, response.user);
      toast.success('Inscription réussie !');
      navigate('/discovery');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-2 border-primary/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black uppercase text-black mb-2">Inscription</h1>
          <p className="text-gray-600">Créez votre compte Doggle</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Nom</label>
            <Input
              type="text"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              className="border-2 border-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">Email</label>
            <Input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="border-2 border-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">Mot de passe</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="border-2 border-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">Confirmer le mot de passe</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className="border-2 border-primary/30"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase"
          >
            {isLoading ? 'Inscription...' : 'S\'inscrire'}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <a href="/login" className="text-primary font-semibold hover:underline">
              Se connecter
            </a>
          </p>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Ou</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full border-2 border-primary text-primary hover:bg-primary/10"
            asChild
          >
            <a href={getLoginUrl()}>S\'inscrire avec Manus OAuth</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
