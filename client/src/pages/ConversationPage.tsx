import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Send, ArrowLeft } from "lucide-react";

export default function ConversationPage() {
  const { user } = useAuth();
  const params = useParams();
  const [, setLocation] = useLocation();
  const matchId = params?.matchId ? parseInt(params.matchId) : null;
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messages, isLoading, refetch } = trpc.message.getMessages.useQuery(
    { matchId: matchId || 0 },
    { enabled: !!matchId }
  );

  // Send message mutation
  const sendMessageMutation = trpc.message.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de l'envoi du message");
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !matchId) return;

    await sendMessageMutation.mutateAsync({
      matchId,
      content: messageInput,
    });
  };

  if (!matchId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Match non trouvé</p>
          <Button
            onClick={() => setLocation('/matches')}
            className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
          >
            Retour aux matchs
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="container max-w-2xl flex items-center justify-between">
          <Button
            onClick={() => setLocation('/matches')}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft size={18} />
            Retour
          </Button>
          <h1 className="text-xl font-bold uppercase text-foreground">Conversation</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container max-w-2xl space-y-4">
          {messages && messages.length > 0 ? (
            messages.map((message: any) => {
              const isCurrentUser = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      isCurrentUser
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun message pour le moment</p>
              <p className="text-sm text-muted-foreground mt-2">Soyez le premier à écrire!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="bg-card border-t border-border p-4">
        <div className="container max-w-2xl">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Écrivez votre message..."
              disabled={sendMessageMutation.isPending}
            />
            <Button
              type="submit"
              disabled={!messageInput.trim() || sendMessageMutation.isPending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold gap-2"
            >
              <Send size={18} />
              Envoyer
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
