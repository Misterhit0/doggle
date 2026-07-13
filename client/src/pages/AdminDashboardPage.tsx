import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Users, 
  Activity, 
  Heart, 
  MessageSquare, 
  FileText, 
  Database, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Search, 
  ShieldAlert, 
  RefreshCw, 
  MapPin, 
  Check, 
  Clock, 
  Terminal, 
  Server,
  Zap,
  CreditCard
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"kpis" | "crm" | "payments" | "logs" | "perf" | "db-manager" | "settings">("kpis");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    role: "user" as "user" | "admin",
    plan: "free" as "free" | "premium" | "vip",
    age: 18,
  });

  const [selectedLogFile, setSelectedLogFile] = useState<"auth.log" | "swipe.log" | "match.log" | "message.log" | "database.log">("auth.log");
  const [logsLines, setLogsLines] = useState<number>(50);
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // DB Manager state
  const [dbTarget, setDbTarget] = useState<"preprod" | "prod">("preprod");
  const [selectedTable, setSelectedTable] = useState<string>("users");
  const [dbEditRow, setDbEditRow] = useState<any | null>(null);
  const [dbInsertOpen, setDbInsertOpen] = useState(false);
  const [dbEditOpen, setDbEditOpen] = useState(false);
  const [dbFormData, setDbFormData] = useState<Record<string, any>>({});

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.admin.getDashboardStats.useQuery(undefined, {
    enabled: currentUser?.role === "admin"
  });

  const { data: usersList, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.getUsers.useQuery(undefined, {
    enabled: currentUser?.role === "admin"
  });

  const { data: paymentsList, isLoading: paymentsLoading, refetch: refetchPayments } = trpc.admin.getPayments.useQuery(undefined, {
    enabled: currentUser?.role === "admin"
  });

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.admin.getLogs.useQuery({
    logFile: selectedLogFile,
    linesCount: logsLines
  }, {
    enabled: currentUser?.role === "admin",
    refetchInterval: 5000 // auto-refresh logs every 5 seconds
  });

  const { data: serverStats, isLoading: serverLoading, refetch: refetchServer } = trpc.admin.getServerStats.useQuery(undefined, {
    enabled: currentUser?.role === "admin",
    refetchInterval: 10000 // refresh metrics every 10s
  });

  // Plan settings queries & mutations
  const { data: planSettings, isLoading: planSettingsLoading, refetch: refetchPlanSettings } = trpc.admin.getPlanSettings.useQuery(undefined, {
    enabled: currentUser?.role === "admin" && activeTab === "settings"
  });

  const updatePlanSettingsMutation = trpc.admin.updatePlanSettings.useMutation({
    onSuccess: () => {
      toast.success("Limites du plan mises à jour avec succès !");
      refetchPlanSettings();
    },
    onError: (err: any) => {
      toast.error("Erreur lors de la mise à jour des limites : " + err.message);
    }
  });

  // DB Manager Queries & Mutations
  const { data: dbTables, refetch: refetchDbTables } = trpc.admin.listTables.useQuery({
    target: dbTarget
  }, {
    enabled: currentUser?.role === "admin" && activeTab === "db-manager"
  });

  const { data: dbSchema, refetch: refetchDbSchema } = trpc.admin.getTableSchema.useQuery({
    target: dbTarget,
    table: selectedTable
  }, {
    enabled: currentUser?.role === "admin" && activeTab === "db-manager" && !!selectedTable
  });

  const { data: dbRows, refetch: refetchDbRows, isLoading: dbRowsLoading } = trpc.admin.getTableRows.useQuery({
    target: dbTarget,
    table: selectedTable
  }, {
    enabled: currentUser?.role === "admin" && activeTab === "db-manager" && !!selectedTable
  });

  const insertRowMutation = trpc.admin.insertTableRow.useMutation({
    onSuccess: () => {
      toast.success("Ligne insérée avec succès !");
      setDbInsertOpen(false);
      refetchDbRows();
      refetchStats();
      refetchUsers();
    },
    onError: (err: any) => {
      toast.error("Erreur lors de l'insertion : " + err.message);
    }
  });

  const updateRowMutation = trpc.admin.updateTableRow.useMutation({
    onSuccess: () => {
      toast.success("Ligne mise à jour !");
      setDbEditOpen(false);
      refetchDbRows();
      refetchStats();
      refetchUsers();
    },
    onError: (err: any) => {
      toast.error("Erreur lors de la mise à jour : " + err.message);
    }
  });

  const deleteRowCascadeMutation = trpc.admin.deleteTableRowCascade.useMutation({
    onSuccess: () => {
      toast.success("Ligne supprimée (cascade active) !");
      refetchDbRows();
      refetchStats();
      refetchUsers();
    },
    onError: (err: any) => {
      toast.error("Erreur lors de la suppression : " + err.message);
    }
  });

  // Mutations
  const togglePaymentBypassMutation = trpc.admin.togglePaymentBypass.useMutation({
    onSuccess: () => {
      toast.success("Statut de bypass de paiement mis à jour !");
      refetchUsers();
      refetchStats();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors du bypass");
    }
  });

  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Utilisateur mis à jour avec succès");
      setIsEditModalOpen(false);
      refetchUsers();
      refetchStats();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur de mise à jour");
    }
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Utilisateur supprimé définitivement");
      setSelectedUser(null);
      setIsEditModalOpen(false);
      refetchUsers();
      refetchStats();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  });

  const approveVerificationMutation = trpc.verification.approveVerification.useMutation({
    onSuccess: () => {
      toast.success("Identité approuvée !");
      refetchStats();
      refetchUsers();
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const rejectVerificationMutation = trpc.verification.rejectVerification.useMutation({
    onSuccess: () => {
      toast.success("Identité rejetée !");
      refetchStats();
      refetchUsers();
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center p-8 border-4 border-black bg-[#ff6b6b] rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-black" />
          <h1 className="text-3xl font-black uppercase text-black mb-2">Accès Refusé</h1>
          <p className="text-black font-bold text-sm mb-6">
            Cette zone est réservée exclusivement aux administrateurs de la plateforme Woofyz.
          </p>
          <Button 
            onClick={() => window.location.href = "/"}
            className="w-full bg-white text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-100"
          >
            Retourner à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      role: user.role || "user",
      plan: user.plan || "free",
      age: user.age || 18,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      ...editFormData,
    });
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm("Êtes-vous absolument sûr de vouloir supprimer définitivement ce compte et toutes ses données associées (chiens, swipes, messages, etc.) ?")) {
      deleteUserMutation.mutate({ userId });
    }
  };

  const handleApproveVerification = (userId: number) => {
    approveVerificationMutation.mutate({ userId });
  };

  const handleRejectVerification = (userId: number) => {
    const reason = prompt("Raison du rejet de la vérification :");
    if (reason) {
      rejectVerificationMutation.mutate({ userId, reason });
    }
  };

  const filteredUsers = usersList?.filter(u => {
    const term = searchQuery.toLowerCase();
    const matchesUser = (u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
    const matchesDog = u.dogs?.some((d: any) => d.name?.toLowerCase().includes(term) || d.breed?.toLowerCase().includes(term));
    return matchesUser || matchesDog;
  }) || [];

  return (
    <div className="min-h-screen bg-[#fcf8f2] text-black pb-12 font-sans">
      <div className="border-b-4 border-black bg-yellow-300 p-6 shadow-[0_4px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-black" />
              <h1 className="text-3xl font-black uppercase tracking-tight">Woofyz Admin Dashboard</h1>
            </div>
            <p className="text-xs font-bold text-black/80 mt-1 uppercase">
              Gestion de la préproduction & CRM d'administration générale
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                refetchStats();
                refetchUsers();
                refetchLogs();
                refetchServer();
                toast.success("Données actualisées");
              }}
              className="bg-white border-2 border-black text-black font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-neutral-100 flex gap-2 items-center"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: "kpis", label: "Vue d'ensemble", icon: Activity, color: "bg-cyan-300" },
            { id: "crm", label: "CRM Utilisateurs", icon: Users, color: "bg-emerald-300" },
            { id: "payments", label: "Paiements & Ventes", icon: CreditCard, color: "bg-yellow-300" },
            { id: "settings", label: "Paramètres App", icon: Zap, color: "bg-red-300" },
            { id: "db-manager", label: "Bases de Données", icon: Database, color: "bg-amber-300" },
            { id: "logs", label: "Journaux (Logs)", icon: Terminal, color: "bg-purple-300" },
            { id: "perf", label: "Performance & n8n", icon: Server, color: "bg-pink-300" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`border-2 border-black font-black uppercase text-xs tracking-wider transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                  isActive ? `${tab.color} text-black` : "bg-white text-black hover:bg-neutral-50"
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* LOADING STATE */}
        {(statsLoading || usersLoading) && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner className="w-12 h-12 text-primary mb-4" />
            <p className="font-bold text-sm text-neutral-600 uppercase">Chargement des données CRM...</p>
          </div>
        )}

        {/* TAB: KPIS / GENERAL VUE D'ENSEMBLE */}
        {!statsLoading && activeTab === "kpis" && stats && (
          <div className="space-y-8 animate-fadeIn">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Utilisateurs", value: stats.totalUsers, icon: Users, desc: `${stats.activeUsers24h} actifs (24h)`, color: "bg-yellow-200" },
                { label: "Toutous", value: stats.totalDogs, icon: Heart, desc: "Chiens enregistrés", color: "bg-pink-200" },
                { label: "Swipes Effectués", value: stats.totalSwipes, icon: Activity, desc: `Likes: ${stats.likesCount} | Passes: ${stats.passesCount}`, color: "bg-cyan-200" },
                { label: "Matchs Trouvés", value: stats.totalMatches, icon: MessageSquare, desc: `Taux de conversion: ${stats.matchRate.toFixed(1)}%`, color: "bg-purple-200" },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <Card key={i} className={`p-6 border-4 border-black rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)] ${card.color}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black uppercase text-xs tracking-wider text-black/60">{card.label}</p>
                      <Icon className="w-5 h-5 text-black" />
                    </div>
                    <p className="text-4xl font-black mb-1">{card.value}</p>
                    <p className="text-[10px] font-bold text-black/80 uppercase">{card.desc}</p>
                  </Card>
                );
              })}
            </div>

            {/* Financial KPIs Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 border-4 border-black rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)] bg-yellow-200">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-black uppercase text-xs tracking-wider text-black/60">Revenus Cumulés</p>
                  <CreditCard className="w-5 h-5 text-black" />
                </div>
                <p className="text-4xl font-black mb-1">{(stats.totalRevenue ?? 0).toFixed(2)} €</p>
                <p className="text-[10px] font-bold text-black/80 uppercase">Total encaissé via Stripe/Apple/Google</p>
              </Card>

              <Card className="p-6 border-4 border-black rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)] bg-[#ffc09f]">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-black uppercase text-xs tracking-wider text-black/60">Volume de Transactions</p>
                  <Activity className="w-5 h-5 text-black" />
                </div>
                <p className="text-4xl font-black mb-1">{stats.totalSales ?? 0}</p>
                <p className="text-[10px] font-bold text-black/80 uppercase">Paiements validés complétés</p>
              </Card>

              <Card className="p-6 border-4 border-black rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)] bg-emerald-200">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-black uppercase text-xs tracking-wider text-black/60">Panier Moyen</p>
                  <Users className="w-5 h-5 text-black" />
                </div>
                <p className="text-4xl font-black mb-1">
                  {stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(2) : "0.00"} €
                </p>
                <p className="text-[10px] font-bold text-black/80 uppercase">Revenu moyen par transaction</p>
              </Card>
            </div>

            {/* Quick Conversion rates details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-4 border-black rounded-lg bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <h3 className="font-black text-lg uppercase mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Efficacité du Matching
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold uppercase mb-1">
                      <span>Taux de Swipes Positifs (Likes)</span>
                      <span>{stats.likeRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-6 w-full border-2 border-black rounded bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-cyan-300 border-r-2 border-black" style={{ width: `${stats.likeRate}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold uppercase mb-1">
                      <span>Taux de Match (Swipes convertis)</span>
                      <span>{stats.matchRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-6 w-full border-2 border-black rounded bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-pink-300 border-r-2 border-black" style={{ width: `${stats.matchRate}%` }} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Identity Verification Queue */}
              <Card className="p-6 border-4 border-black rounded-lg bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex flex-col">
                <h3 className="font-black text-lg uppercase mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  File d'attente de Vérification ({stats.pendingVerifications.length})
                </h3>
                <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2">
                  {stats.pendingVerifications.length > 0 ? (
                    stats.pendingVerifications.map((verif: any) => (
                      <div key={verif.id} className="flex justify-between items-center p-3 border-2 border-black bg-yellow-50 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border border-black overflow-hidden bg-black rounded flex-shrink-0">
                            <img src={verif.photoUrl} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-xs">{verif.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{verif.userEmail}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveVerification(verif.userId)}
                            className="bg-green-400 hover:bg-green-500 border border-black text-black font-bold text-[10px] h-7 px-2 uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                          >
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRejectVerification(verif.userId)}
                            className="bg-red-400 hover:bg-red-500 border border-black text-black font-bold text-[10px] h-7 px-2 uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                          >
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                      <p className="text-xs font-bold uppercase">Aucune demande en attente</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB: CRM MANAGEMENT */}
        {!usersLoading && activeTab === "crm" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Search Bar */}
            <div className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <Input
                  placeholder="Rechercher nom, email, race, chien..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] focus:shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                />
              </div>
            </div>

            {/* CRM Users Table Grid */}
            <Card className="border-4 border-black rounded-lg bg-white overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b-2 border-black font-bold text-xs uppercase text-neutral-700">
                      <th className="p-4 border-r-2 border-black">Photo</th>
                      <th className="p-4 border-r-2 border-black">Nom & Rôle</th>
                      <th className="p-4 border-r-2 border-black">Email & Tél</th>
                      <th className="p-4 border-r-2 border-black">Vérifié</th>
                      <th className="p-4 border-r-2 border-black">Chiens</th>
                      <th className="p-4 border-r-2 border-black">Paiements / Crédits</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-neutral-200">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((userObj) => (
                        <tr key={userObj.id} className="hover:bg-neutral-50 font-medium text-xs text-neutral-800">
                          <td className="p-4 border-r-2 border-neutral-200">
                            <div className="w-10 h-10 border border-black overflow-hidden bg-black rounded-full shadow-[1px_1px_0_0_rgba(0,0,0,1)]">
                              <img src={userObj.profilePhotoUrl || "/default-avatar.png"} className="w-full h-full object-cover" />
                            </div>
                          </td>
                          <td className="p-4 border-r-2 border-neutral-200">
                            <p className="font-bold text-sm text-black">{userObj.name}</p>
                            <div className="flex gap-1 flex-wrap mt-1">
                              <span className={`inline-block px-1.5 py-0.5 text-[9px] uppercase font-black tracking-wider border border-black rounded ${
                                userObj.role === "admin" ? "bg-red-200 text-red-900" : "bg-neutral-200 text-neutral-900"
                              }`}>
                                {userObj.role === "admin" ? "Admin" : "Standard"}
                              </span>
                              <span className={`inline-block px-1.5 py-0.5 text-[9px] uppercase font-black tracking-wider border border-black rounded ${
                                userObj.plan === "vip" 
                                  ? "bg-purple-200 text-purple-900" 
                                  : userObj.plan === "premium" 
                                  ? "bg-cyan-200 text-cyan-900" 
                                  : "bg-neutral-100 text-neutral-800"
                              }`}>
                                {userObj.plan === "vip" ? "Pro" : userObj.plan === "premium" ? "WoofPass" : "Standard"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 border-r-2 border-neutral-200">
                            <p className="font-semibold">{userObj.email}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{userObj.phoneNumber || "Pas de numéro"}</p>
                          </td>
                          <td className="p-4 border-r-2 border-neutral-200">
                            <span className={`inline-block px-2 py-0.5 text-[9px] uppercase font-black border border-black rounded ${
                              userObj.verificationStatus === "approved"
                                ? "bg-green-200 text-green-800"
                                : userObj.verificationStatus === "rejected"
                                ? "bg-red-200 text-red-800"
                                : "bg-yellow-200 text-yellow-800"
                            }`}>
                              {userObj.verificationStatus === "approved" ? "Oui" : userObj.verificationStatus === "rejected" ? "Rejeté" : "Non"}
                            </span>
                          </td>
                          <td className="p-4 border-r-2 border-neutral-200 max-w-[200px]">
                            {userObj.dogs && userObj.dogs.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {userObj.dogs.map((dog: any) => (
                                  <span key={dog.id} className="px-1.5 py-0.5 border border-black rounded bg-pink-100 text-black font-semibold text-[10px] truncate max-w-[100px]">
                                    {dog.name} ({dog.breed || "?"})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px] font-medium">Aucun</span>
                            )}
                          </td>
                          <td className="p-4 border-r-2 border-neutral-200">
                            <div className="flex flex-col gap-1.5 justify-center">
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={!!userObj.bypassPaymentLimits}
                                  onCheckedChange={(checked) => {
                                    togglePaymentBypassMutation.mutate({
                                      userId: userObj.id,
                                      bypass: checked,
                                    });
                                  }}
                                  disabled={togglePaymentBypassMutation.isPending}
                                />
                                <span className="font-bold text-[9px] uppercase">Sans Limites</span>
                              </div>
                              <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">
                                ⭐ {userObj.superLikeCredits ?? 0} Favori{userObj.superLikeCredits !== 1 ? 's' : ''}
                              </span>
                              {userObj.swipeLimitUntil && new Date(userObj.swipeLimitUntil) > new Date() && (
                                <span className="text-[9px] text-amber-600 font-bold uppercase">
                                  🚀 Premium (24h)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenEdit(userObj)}
                              className="bg-cyan-200 hover:bg-cyan-300 border border-black text-black font-bold text-[10px] h-8 px-2 uppercase shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)]"
                            >
                              <Edit3 size={12} className="mr-1" /> Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(userObj.id)}
                              className="border border-black font-bold text-[10px] h-8 px-2 uppercase shadow-[1.5px_1.5px_0_0_rgba(0,0,0,1)]"
                            >
                              <Trash2 size={12} className="mr-1" /> Supprimer
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground font-bold uppercase text-xs">
                          Aucun utilisateur trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: PAYMENTS & SALES LOGS */}
        {activeTab === "payments" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Sales Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-4 border-black bg-white rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <h3 className="font-black text-sm uppercase mb-4 tracking-wider">Répartition des Formules Vendues</h3>
                {stats && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>⭐ Pack 5 Favoris (1,99 €)</span>
                      <span className="bg-yellow-200 px-2 py-0.5 border-2 border-black rounded font-black">
                        {stats.packageStats?.extra_favorites ?? 0} ventes ({((stats.packageStats?.extra_favorites ?? 0) * 1.99).toFixed(2)} €)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>🚀 Swipes Illimités (4,99 €)</span>
                      <span className="bg-cyan-200 px-2 py-0.5 border-2 border-black rounded font-black">
                        {stats.packageStats?.unlimited_swipes ?? 0} ventes ({((stats.packageStats?.unlimited_swipes ?? 0) * 4.99).toFixed(2)} €)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>💎 Passe Premium (9,99 €)</span>
                      <span className="bg-peach/30 px-2 py-0.5 border-2 border-black rounded font-black">
                        {stats.packageStats?.premium_pass ?? 0} ventes ({((stats.packageStats?.premium_pass ?? 0) * 9.99).toFixed(2)} €)
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6 border-4 border-black bg-white rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <h3 className="font-black text-sm uppercase mb-4 tracking-wider">Méthodes de Paiement</h3>
                {stats && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>💳 Carte Bancaire (Stripe)</span>
                      <span className="bg-neutral-100 px-2 py-0.5 border-2 border-black rounded font-black">
                        {stats.paymentMethodStats?.card ?? 0} transactions
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>📱 Google Pay</span>
                      <span className="bg-[#4285F4]/20 px-2 py-0.5 border-2 border-black rounded font-black">
                        {stats.paymentMethodStats?.google_pay ?? 0} transactions
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span> Apple Pay</span>
                      <span className="bg-black text-white px-2 py-0.5 border-2 border-black rounded font-black">
                        {stats.paymentMethodStats?.apple_pay ?? 0} transactions
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Payments Table */}
            <Card className="border-4 border-black rounded-lg bg-white overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b-2 border-black font-bold text-xs uppercase text-neutral-700">
                      <th className="p-4 border-r-2 border-black">ID Paiement</th>
                      <th className="p-4 border-r-2 border-black">Utilisateur</th>
                      <th className="p-4 border-r-2 border-black">Produit / Formule</th>
                      <th className="p-4 border-r-2 border-black">Méthode</th>
                      <th className="p-4 border-r-2 border-black">Montant</th>
                      <th className="p-4 border-r-2 border-black">Date</th>
                      <th className="p-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-neutral-200">
                    {paymentsList && paymentsList.length > 0 ? (
                      paymentsList.map((p: any) => (
                        <tr key={p.id} className="hover:bg-neutral-50 font-medium text-xs text-neutral-800">
                          <td className="p-4 border-r-2 border-neutral-200 font-mono text-[10px]">#{p.id}</td>
                          <td className="p-4 border-r-2 border-neutral-200">
                            <p className="font-bold">{p.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{p.userEmail}</p>
                          </td>
                          <td className="p-4 border-r-2 border-neutral-200">
                            <span className={`inline-block px-2 py-0.5 font-bold border border-black rounded ${
                              p.packageType === 'premium_pass' ? 'bg-peach/30' : p.packageType === 'unlimited_swipes' ? 'bg-accent/25' : 'bg-yellow-100'
                            }`}>
                              {p.packageType === 'premium_pass' ? '💎 Premium Pass' : p.packageType === 'unlimited_swipes' ? '🚀 Swipes Illimités' : '⭐ 5 Favoris'}
                            </span>
                          </td>
                          <td className="p-4 border-r-2 border-neutral-200 uppercase font-bold">{p.paymentMethod}</td>
                          <td className="p-4 border-r-2 border-neutral-200 font-black text-sm">{parseFloat(p.amount).toFixed(2)} €</td>
                          <td className="p-4 border-r-2 border-neutral-200">{new Date(p.createdAt).toLocaleString()}</td>
                          <td className="p-4">
                            <span className="inline-block px-2 py-0.5 font-black uppercase text-[9px] border border-black rounded bg-green-200 text-green-800">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground font-bold uppercase text-xs">
                          Aucune transaction enregistrée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: APP/MONETIZATION SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-6 border-4 border-black rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <div>
                <h2 className="text-2xl font-black uppercase">Configuration des Limites & Formules</h2>
                <p className="text-muted-foreground text-xs font-bold uppercase mt-1">
                  Définissez le nombre de swipes et favoris journaliers autorisés pour chaque niveau de compte.
                </p>
              </div>
            </div>

            {planSettingsLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Spinner className="w-10 h-10 mb-4" />
                <p className="font-bold text-xs uppercase text-muted-foreground">Chargement des limites...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["free", "premium", "vip"].map((planKey) => {
                  const planData = planSettings?.find((p: any) => p.plan === planKey) || {
                    plan: planKey,
                    maxSwipesPerDay: planKey === "vip" ? -1 : planKey === "premium" ? 20 : 10,
                    maxFavoritesPerDay: planKey === "vip" ? 5 : planKey === "premium" ? 2 : 1,
                    price: planKey === "vip" ? 9.99 : planKey === "premium" ? 4.99 : 0.00,
                  };

                  return (
                    <Card
                      key={planKey}
                      className="p-6 border-4 border-black rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)] relative bg-white"
                    >
                      <span className={`absolute -top-3.5 left-4 border-2 border-black font-black uppercase text-[10px] px-3 py-0.5 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                        planKey === "vip" 
                          ? "bg-purple-300" 
                          : planKey === "premium" 
                          ? "bg-cyan-300" 
                          : "bg-yellow-300"
                      }`}>
                        Plan {planKey === "free" ? "Standard (Gratuit)" : planKey === "premium" ? "WoofPass Premium" : "Pack Visibilité Pro"}
                      </span>

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const maxSwipes = formData.get("isUnlimitedSwipes") === "true" 
                            ? -1 
                            : parseInt(formData.get("maxSwipesPerDay") as string) || 0;
                          const maxFavorites = parseInt(formData.get("maxFavoritesPerDay") as string) || 0;
                          const price = parseFloat(formData.get("price") as string) || 0;

                          await updatePlanSettingsMutation.mutateAsync({
                            plan: planKey,
                            maxSwipesPerDay: maxSwipes,
                            maxFavoritesPerDay: maxFavorites,
                            price,
                          });
                        }}
                        className="space-y-4 mt-4"
                      >
                        <div>
                          <Label className="font-bold text-xs uppercase">Prix mensuel (€)</Label>
                          <Input
                            name="price"
                            type="number"
                            step="0.01"
                            defaultValue={parseFloat(planData.price).toFixed(2)}
                            disabled={planKey === "free"}
                            className="border-2 border-black font-bold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          />
                        </div>

                        <div>
                          <Label className="font-bold text-xs uppercase">Limite de Swipes / Jour</Label>
                          <div className="flex items-center gap-4 mt-1">
                            <input
                              type="number"
                              name="maxSwipesPerDay"
                              defaultValue={planData.maxSwipesPerDay === -1 ? 20 : planData.maxSwipesPerDay}
                              disabled={planData.maxSwipesPerDay === -1}
                              id={`swipes-input-${planKey}`}
                              className="w-24 bg-white border-2 border-black font-bold text-xs p-2 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-50"
                            />
                            
                            <label className="flex items-center gap-1.5 text-xs font-bold uppercase cursor-pointer">
                              <input
                                type="checkbox"
                                name="isUnlimitedSwipes"
                                value="true"
                                defaultChecked={planData.maxSwipesPerDay === -1}
                                onChange={(e) => {
                                  const inputEl = document.getElementById(`swipes-input-${planKey}`) as HTMLInputElement;
                                  if (inputEl) {
                                    inputEl.disabled = e.target.checked;
                                  }
                                }}
                                className="w-4 h-4 border-2 border-black rounded-none cursor-pointer"
                              />
                              Illimité
                            </label>
                          </div>
                        </div>

                        <div>
                          <Label className="font-bold text-xs uppercase">Limite de Favoris / Jour</Label>
                          <Input
                            name="maxFavoritesPerDay"
                            type="number"
                            defaultValue={planData.maxFavoritesPerDay}
                            className="border-2 border-black font-bold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={updatePlanSettingsMutation.isPending}
                          className="w-full bg-black text-white hover:bg-black/90 font-black uppercase text-xs border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all mt-4 cursor-pointer"
                        >
                          Sauvegarder
                        </Button>
                      </form>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: DATABASE MANAGER */}
        {activeTab === "db-manager" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Toolbar */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-neutral-100 p-4 border-3 border-black rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <div className="flex flex-wrap items-center gap-3">
                <Label className="font-black text-xs uppercase text-neutral-700">Base ciblée :</Label>
                <div className="flex gap-1.5">
                  <Button
                    onClick={() => { setDbTarget("preprod"); setSelectedTable("users"); }}
                    className={`border-2 border-black font-black uppercase text-[10px] h-9 px-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 ${
                      dbTarget === "preprod" ? "bg-black text-white hover:bg-black/90" : "bg-white text-black hover:bg-neutral-50"
                    }`}
                  >
                    🧪 Préprod (Local DB)
                  </Button>
                  <Button
                    onClick={() => { setDbTarget("prod"); setSelectedTable("users"); }}
                    className={`border-2 border-black font-black uppercase text-[10px] h-9 px-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 ${
                      dbTarget === "prod" ? "bg-black text-white hover:bg-black/90" : "bg-white text-black hover:bg-neutral-50"
                    }`}
                  >
                    🌍 Prod (VPS Production)
                  </Button>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Label htmlFor="tableSelect" className="font-black text-xs uppercase text-neutral-700">Table :</Label>
                  <select
                    id="tableSelect"
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="bg-white border-2 border-black text-xs font-bold p-1.5 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  >
                    {dbTables?.map(tabName => (
                      <option key={tabName} value={tabName}>{tabName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Button
                  onClick={() => {
                    setDbFormData({});
                    setDbInsertOpen(true);
                  }}
                  className="bg-yellow-300 hover:bg-yellow-400 border-2 border-black text-black font-black uppercase text-[10px] h-9 shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex items-center gap-1.5"
                >
                  Ajouter une ligne
                </Button>
              </div>
            </div>

            {/* Main DB Table View */}
            {dbRowsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border-4 border-black rounded-lg">
                <Spinner className="w-10 h-10 mb-4" />
                <p className="font-bold text-xs uppercase text-muted-foreground">Requête SQL en cours...</p>
              </div>
            ) : (
              <Card className="border-4 border-black rounded-lg bg-white overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 border-b-2 border-black font-bold text-xs uppercase text-neutral-700">
                        {dbSchema?.map((col: any) => (
                          <th key={col.Field} className="p-3 border-r-2 border-black whitespace-nowrap">
                            {col.Field}
                            <span className="block text-[8px] text-muted-foreground font-semibold normal-case font-mono mt-0.5">{col.Type}</span>
                          </th>
                        ))}
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-neutral-200">
                      {dbRows && dbRows.length > 0 ? (
                        dbRows.map((row: any, rIdx: number) => {
                          const primaryKeyCol = dbSchema?.find((col: any) => col.Key === 'PRI')?.Field || 'id';
                          const primaryValue = row[primaryKeyCol];
                          return (
                            <tr key={rIdx} className="hover:bg-neutral-50 font-medium text-[10px] text-neutral-800 font-mono">
                              {dbSchema?.map((col: any) => {
                                const val = row[col.Field];
                                return (
                                  <td key={col.Field} className="p-3 border-r-2 border-neutral-200 max-w-[250px] truncate select-all">
                                    {val === null ? (
                                      <span className="text-neutral-300 italic">null</span>
                                    ) : typeof val === 'object' ? (
                                      JSON.stringify(val)
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-3 flex gap-1.5 items-center">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setDbEditRow(row);
                                    setDbFormData({ ...row });
                                    setDbEditOpen(true);
                                  }}
                                  className="bg-cyan-200 hover:bg-cyan-300 border border-black text-black font-bold text-[9px] h-7 px-2 uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                                >
                                  Modifier
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`Voulez-vous supprimer définitivement la ligne avec ${primaryKeyCol} = ${primaryValue} ?\nSi cette table a des dépendances (ex: users), une suppression en cascade sera exécutée pour éviter les erreurs d'intégrité.`)) {
                                      deleteRowCascadeMutation.mutate({
                                        target: dbTarget,
                                        table: selectedTable,
                                        primaryKey: primaryKeyCol,
                                        primaryValue
                                      });
                                    }
                                  }}
                                  className="border border-black font-bold text-[9px] h-7 px-2 uppercase shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                                >
                                  Supprimer
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={(dbSchema?.length || 0) + 1} className="p-8 text-center text-muted-foreground font-bold uppercase text-xs">
                            Aucune ligne trouvée dans cette table
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* MODAL: INSERT ROW */}
            {dbInsertOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <Card className="w-full max-w-lg p-6 border-4 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
                  <h3 className="font-black text-lg uppercase mb-4 border-b-2 border-black pb-2">Insérer dans {selectedTable}</h3>
                  <div className="space-y-4">
                    {dbSchema?.map((col: any) => {
                      if (col.Extra === "auto_increment") return null;
                      return (
                        <div key={col.Field}>
                          <Label className="font-bold text-xs uppercase mb-1">{col.Field} ({col.Type})</Label>
                          <Input
                            placeholder={`${col.Null === 'YES' ? 'Facultatif' : 'Requis'} - ${col.Type}`}
                            value={dbFormData[col.Field] !== undefined ? dbFormData[col.Field] : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDbFormData(prev => ({ ...prev, [col.Field]: val === "" ? null : val }));
                            }}
                            className="border-2 border-black font-semibold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 justify-end mt-6 border-t-2 border-black pt-4">
                    <Button onClick={() => setDbInsertOpen(false)} className="bg-white border-2 border-black text-black font-bold uppercase text-xs">Annuler</Button>
                    <Button
                      onClick={() => insertRowMutation.mutate({ target: dbTarget, table: selectedTable, rowData: dbFormData })}
                      className="bg-yellow-300 border-2 border-black text-black font-black uppercase text-xs"
                    >
                      Insérer
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* MODAL: UPDATE ROW */}
            {dbEditOpen && dbEditRow && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <Card className="w-full max-w-lg p-6 border-4 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
                  <h3 className="font-black text-lg uppercase mb-4 border-b-2 border-black pb-2">Modifier dans {selectedTable}</h3>
                  <div className="space-y-4">
                    {dbSchema?.map((col: any) => {
                      const isPrimaryKey = col.Key === 'PRI';
                      return (
                        <div key={col.Field}>
                          <Label className="font-bold text-xs uppercase mb-1">{col.Field} ({col.Type})</Label>
                          <Input
                            disabled={isPrimaryKey || col.Extra === "auto_increment"}
                            value={dbFormData[col.Field] !== null && dbFormData[col.Field] !== undefined ? String(dbFormData[col.Field]) : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDbFormData(prev => ({ ...prev, [col.Field]: val === "" ? null : val }));
                            }}
                            className="border-2 border-black font-semibold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 justify-end mt-6 border-t-2 border-black pt-4">
                    <Button onClick={() => setDbEditOpen(false)} className="bg-white border-2 border-black text-black font-bold uppercase text-xs">Annuler</Button>
                    <Button
                      onClick={() => {
                        const primaryKeyCol = dbSchema?.find((col: any) => col.Key === 'PRI')?.Field || 'id';
                        const primaryValue = dbEditRow[primaryKeyCol];
                        
                        // Exclude primary key from update payload to avoid update errors
                        const payload = { ...dbFormData };
                        delete payload[primaryKeyCol];

                        updateRowMutation.mutate({
                          target: dbTarget,
                          table: selectedTable,
                          primaryKey: primaryKeyCol,
                          primaryValue,
                          rowData: payload
                        });
                      }}
                      className="bg-yellow-300 border-2 border-black text-black font-black uppercase text-xs"
                    >
                      Enregistrer
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* TAB: SYSTEM LOGS CONSOLE */}
        {!logsLoading && activeTab === "logs" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2 items-center">
                <Label htmlFor="logFileSelect" className="font-bold text-xs uppercase">Fichier :</Label>
                <select
                  id="logFileSelect"
                  value={selectedLogFile}
                  onChange={(e) => setSelectedLogFile(e.target.value as any)}
                  className="bg-white border-2 border-black text-black font-bold text-xs p-2 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                >
                  <option value="auth.log">auth.log (Connexions/Inscriptions)</option>
                  <option value="swipe.log">swipe.log (Activités Swipes)</option>
                  <option value="match.log">match.log (Création Matchs)</option>
                  <option value="message.log">message.log (Messagerie)</option>
                  <option value="database.log">database.log (Requêtes SQL)</option>
                </select>
              </div>

              <div className="flex gap-4 items-center">
                <div className="flex gap-2 items-center">
                  <Label htmlFor="linesCount" className="font-bold text-xs uppercase">Lignes :</Label>
                  <input
                    id="linesCount"
                    type="number"
                    min={5}
                    max={500}
                    value={logsLines}
                    onChange={(e) => setLogsLines(parseInt(e.target.value) || 50)}
                    className="w-16 bg-white border-2 border-black text-black font-bold text-xs p-1.5 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  />
                </div>
                <Input
                  placeholder="Filtrer les lignes..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-48 border-2 border-black text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                />
              </div>
            </div>

            {/* Interactive Terminal log viewer */}
            <Card className="border-4 border-black bg-neutral-900 text-neutral-100 rounded-lg overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <div className="bg-neutral-800 px-4 py-2 border-b-2 border-black flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-green-400" />
                  <span className="text-[10px] font-black uppercase text-neutral-300">logs/stdout &gt; {selectedLogFile}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="p-4 font-mono text-[10px] leading-relaxed max-h-[350px] overflow-y-auto whitespace-pre-wrap select-text bg-[#161616]">
                {logs && logs.length > 0 ? (
                  logs
                    .filter(line => line.toLowerCase().includes(logSearchQuery.toLowerCase()))
                    .map((line, idx) => {
                      let color = "text-neutral-300";
                      if (line.includes("[SUCCESS]") || line.includes("signup_success") || line.includes("login_success") || line.includes("Matched: true")) {
                        color = "text-green-400 font-bold";
                      } else if (line.includes("[ERROR]") || line.includes("failed") || line.includes("rejet")) {
                        color = "text-red-400 font-bold";
                      } else if (line.includes("LIKE")) {
                        color = "text-cyan-400 font-bold";
                      }
                      return (
                        <div key={idx} className={`${color} py-0.5 hover:bg-neutral-800 px-1 rounded`}>
                          {line}
                        </div>
                      );
                    })
                ) : (
                  <p className="text-neutral-500 italic">Aucune ligne de journal à afficher.</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB: SERVER & N8N PERFORMANCE METRICS */}
        {!serverLoading && activeTab === "perf" && serverStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            {/* System Server Stats */}
            <Card className="p-6 border-4 border-black bg-white rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-lg uppercase mb-6 flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Performance Serveur Node.js
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase mb-1">
                    <span>Uptime système</span>
                    <span className="text-primary">{serverStats.uptime}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border-2 border-black rounded bg-neutral-50 text-[10px] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    En ligne continuellement sans crash
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase mb-2">
                    <span>Mémoire Vive (RSS)</span>
                    <span className="text-cyan-600">{serverStats.memory.rss}</span>
                  </div>
                  <div className="h-6 w-full border-2 border-black rounded bg-neutral-100 overflow-hidden">
                    <div className="h-full bg-cyan-300 border-r-2 border-black" style={{ width: "35%" }} />
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-neutral-500 mt-1 uppercase">
                    <span>Heap Total: {serverStats.memory.heapTotal}</span>
                    <span>Heap Used: {serverStats.memory.heapUsed}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase mb-2">
                    <span>Temps processeur total (User)</span>
                    <span className="text-pink-600">{serverStats.cpu.user}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold uppercase text-neutral-700 bg-neutral-100 p-2 border border-black rounded">
                    <span>Système: {serverStats.cpu.system}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* n8n Status Monitor */}
            <Card className="p-6 border-4 border-black bg-white rounded-lg shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex flex-col justify-between">
              <div>
                <h3 className="font-black text-lg uppercase mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Statut Connecteur n8n (Webhooks)
                </h3>

                <div className="space-y-6">
                  <div className="flex justify-between items-center p-3 border-2 border-black rounded bg-neutral-50 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                    <span className="font-bold text-xs uppercase">État du service</span>
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black rounded ${
                      serverStats.n8n.status.includes("En ligne") ? "bg-green-300 text-green-900" : "bg-red-200 text-red-900"
                    }`}>
                      {serverStats.n8n.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 border-2 border-black rounded bg-neutral-50 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                    <span className="font-bold text-xs uppercase">Latence d'appel</span>
                    <span className="font-bold text-xs text-primary">{serverStats.n8n.latency}</span>
                  </div>

                  <div className="p-3 border-2 border-black rounded bg-neutral-50 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                    <span className="block font-bold text-xs uppercase mb-1">URL Webhook Receiver</span>
                    <code className="block text-[8px] bg-neutral-800 text-green-400 p-2 rounded truncate overflow-x-auto select-all">
                      {serverStats.n8n.url}
                    </code>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t-2 border-dashed border-black pt-4 text-[10px] font-bold text-neutral-600 uppercase leading-normal">
                ⚠️ Les webhooks n8n s'activent instantanément à chaque inscription, création de chien, perte de chien et création d'événement canin.
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* CRM EDIT USER DIALOG/MODAL */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 border-4 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] animate-scaleUp">
            <h3 className="font-black text-xl uppercase mb-6 border-b-2 border-black pb-2">Modifier l'utilisateur</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName" className="font-bold text-xs uppercase mb-1">Nom complet</Label>
                <Input
                  id="editName"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="border-2 border-black font-semibold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                />
              </div>

              <div>
                <Label htmlFor="editEmail" className="font-bold text-xs uppercase mb-1">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="border-2 border-black font-semibold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editAge" className="font-bold text-xs uppercase mb-1">Âge</Label>
                  <Input
                    id="editAge"
                    type="number"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 18 }))}
                    className="border-2 border-black font-semibold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  />
                </div>

                <div>
                  <Label htmlFor="editRole" className="font-bold text-xs uppercase mb-1">Rôle</Label>
                  <select
                    id="editRole"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full bg-white border-2 border-black font-semibold text-xs p-2 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  >
                    <option value="user">Standard</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="editPlan" className="font-bold text-xs uppercase mb-1">Plan</Label>
                  <select
                    id="editPlan"
                    value={editFormData.plan}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, plan: e.target.value as any }))}
                    className="w-full bg-white border-2 border-black font-semibold text-xs p-2 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  >
                    <option value="free">Standard (Gratuit)</option>
                    <option value="premium">WoofPass Premium</option>
                    <option value="vip">Pack Visibilité Pro</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="editPhone" className="font-bold text-xs uppercase mb-1">Téléphone (WhatsApp)</Label>
                <Input
                  id="editPhone"
                  type="tel"
                  value={editFormData.phoneNumber}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="border-2 border-black font-semibold text-xs shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-8 border-t-2 border-black pt-4">
              <Button
                onClick={() => setIsEditModalOpen(false)}
                className="bg-white border-2 border-black text-black font-bold uppercase text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-neutral-100"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveUser}
                className="bg-yellow-300 border-2 border-black text-black font-black uppercase text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-yellow-400"
              >
                Sauvegarder
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
