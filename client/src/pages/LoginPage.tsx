import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { getLoginUrl } from '@/const';
import { useAuth } from '@/_core/hooks/useAuth';

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation();

  // If already authenticated, redirect to discovery
  useEffect(() => {
    if (user) {
      navigate('/discovery');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await loginMutation.mutateAsync({ email, password });
      utils.auth.me.setData(undefined, response.user);
      toast.success('Connecté avec succès !');
      navigate('/discovery');
    } catch (error: any) {
      toast.error(error.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-2 border-primary/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black uppercase text-black mb-2">Connexion</h1>
          <p className="text-gray-600">Connectez-vous avec votre email</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <a href="/signup" className="text-primary font-semibold hover:underline">
              S'inscrire
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
            <a href={getLoginUrl()}>Se connecter avec Manus OAuth</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
