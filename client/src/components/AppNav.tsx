import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Heart,
  User,
  LogOut,
  Compass,
  History,
  Map,
  Home as HomeIcon,
  Calendar,
  AlertCircle,
  ShieldAlert,
  Dog,
  MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { label: 'Découverte', href: '/discovery', icon: Compass },
  { label: 'Matchs', href: '/matches', icon: Heart },
  { label: 'Mes chiens', href: '/dogs', icon: HomeIcon },
  { label: 'Événements', href: '/events', icon: Calendar },
  { label: 'Chiens perdus', href: '/lost-dogs', icon: AlertCircle },
  { label: 'Carte de balade', href: '/walking-map', icon: Map },
  { label: 'Forum', href: '/forum', icon: MessageSquare },
  { label: 'Favoris', href: '/favorites', icon: Heart },
  { label: 'Historique', href: '/history', icon: History },
];

const BOTTOM_ITEMS = [
  { label: 'Découvrir', href: '/discovery', icon: Compass },
  { label: 'Balades', href: '/walking-map', icon: Map },
  { label: 'Matchs', href: '/matches', icon: Heart },
  { label: 'Forum', href: '/forum', icon: MessageSquare },
  { label: 'Profil', href: '/profile', icon: User },
];

export default function AppNav() {
  const { user } = useAuth();
  const [location] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();

  // Don't show nav on home page or if not authenticated
  if (!user || location === '/') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success('Déconnecté');
      window.location.href = '/';
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <>
      {/* Top Header Bar */}
      <nav className="sticky top-0 z-40 bg-background border-b-3 border-black shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/discovery" className="flex items-center gap-2 font-black text-xl tracking-tight">
              {/* Memphis logo bubble */}
              <div className="w-8 h-8 rounded-full bg-accent border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-accent-foreground font-black text-xs">🐾</span>
              </div>
              <span className="text-foreground uppercase font-black tracking-widest text-lg">Woofyz</span>
            </a>

            {/* Desktop Navigation (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border-2 border-transparent transition-all text-sm font-black uppercase ${
                      isActive
                        ? 'bg-accent text-accent-foreground border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'text-foreground/80 hover:bg-muted hover:border-black/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </a>
                );
              })}
            </div>

            {/* User Dropdown Menu */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-2 border-black font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">{user.name || 'Profil'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-xl font-bold">
                  <DropdownMenuItem asChild>
                    <a href="/profile" className="cursor-pointer flex items-center font-bold">
                      <User className="w-4 h-4 mr-2" />
                      Mon profil
                    </a>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <a href="/admin" className="cursor-pointer flex items-center font-bold text-red-600 focus:text-red-700">
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Dashboard Admin
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <a href="/dog-sitter" className="cursor-pointer flex items-center font-bold text-blue-700 focus:text-blue-800">
                      <Dog className="w-4 h-4 mr-2" />
                      {(user as any).isDogSitter ? 'Dashboard Dog-Sitter' : 'Devenir Dog-Sitter'}
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <a href="/dogs" className="cursor-pointer flex items-center font-bold">
                      <HomeIcon className="w-4 h-4 mr-2" />
                      Mes chiens
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <a href="/events" className="cursor-pointer flex items-center font-bold">
                      <Calendar className="w-4 h-4 mr-2" />
                      Événements
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <a href="/lost-dogs" className="cursor-pointer flex items-center font-bold">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Chiens perdus
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="border-t-2 border-black" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 font-bold focus:bg-red-50 focus:text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sticky Bottom Navigation Bar (Hidden on Desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t-3 border-black pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.10)] flex justify-around items-center h-20">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          const isMatches = item.href === '/matches';
          return (
            <motion.a
              key={item.href}
              href={item.href}
              whileTap={{ scale: 0.88 }}
              className="relative flex flex-col items-center justify-center w-16 h-14"
            >
              <div className="relative p-1.5 rounded-xl flex items-center justify-center">
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 bg-accent rounded-xl border-2 border-black shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-accent-foreground' : 'text-foreground/65'}`} />
                {isMatches && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background z-20" />
                )}
              </div>
              <span className={`text-[9px] font-black uppercase mt-0.5 tracking-wider ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </motion.a>
          );
        })}
      </div>
    </>
  );
}
