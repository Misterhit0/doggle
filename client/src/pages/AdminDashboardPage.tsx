import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
  Zap
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"kpis" | "crm" | "logs" | "perf">("kpis");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    role: "user" as "user" | "admin",
    age: 18,
  });

  const [selectedLogFile, setSelectedLogFile] = useState<"auth.log" | "swipe.log" | "match.log" | "message.log" | "database.log">("auth.log");
  const [logsLines, setLogsLines] = useState<number>(50);
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.admin.getDashboardStats.useQuery(undefined, {
    enabled: currentUser?.role === "admin"
  });

  const { data: usersList, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.getUsers.useQuery(undefined, {
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

  // Mutations
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
            Cette zone est réservée exclusivement aux administrateurs de la plateforme Doggle.
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
              <h1 className="text-3xl font-black uppercase tracking-tight">Doggle Admin Dashboard</h1>
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
                            <span className={`inline-block px-1.5 py-0.5 text-[9px] uppercase font-black tracking-wider border border-black rounded mt-1 ${
                              userObj.role === "admin" ? "bg-red-200 text-red-900" : "bg-neutral-200 text-neutral-900"
                            }`}>
                              {userObj.role}
                            </span>
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

              <div className="grid grid-cols-2 gap-4">
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
                    <option value="user">Utilisateur standard</option>
                    <option value="admin">Administrateur</option>
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
