import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, MessageCircle, Send, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SocialFeaturesProps {
  kunstwerkId?: string;
  modelId?: string;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles?: {
    username: string | null;
  } | null;
}

const SocialFeatures = ({ kunstwerkId, modelId }: SocialFeaturesProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
      setupRealtimeSubscription();
    }
  }, [user, kunstwerkId, modelId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to new comments
    const commentsChannel = supabase
      .channel(`comments-${kunstwerkId || modelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: kunstwerkId ? `kunstwerk_id=eq.${kunstwerkId}` : `model_id=eq.${modelId}`,
        },
        async (payload) => {
          // Fetch username for new comment
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", payload.new.user_id)
            .single();

          const newComment = {
            ...payload.new,
            profiles: profile,
          } as Comment;

          setComments((current) => [newComment, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: kunstwerkId ? `kunstwerk_id=eq.${kunstwerkId}` : `model_id=eq.${modelId}`,
        },
        (payload) => {
          setComments((current) => current.filter(c => c.id !== payload.old.id));
        }
      )
      .subscribe();

    // Subscribe to likes
    const likesChannel = supabase
      .channel(`likes-${kunstwerkId || modelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: kunstwerkId ? `kunstwerk_id=eq.${kunstwerkId}` : `model_id=eq.${modelId}`,
        },
        () => {
          loadLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  };

  const loadData = async () => {
    await Promise.all([loadComments(), loadLikes()]);
  };

  const loadComments = async () => {
    try {
      let query = supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false });

      if (kunstwerkId) {
        query = query.eq("kunstwerk_id", kunstwerkId);
      }
      if (modelId) {
        query = query.eq("model_id", modelId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch usernames separately
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", comment.user_id)
            .single();
          
          return {
            ...comment,
            profiles: profile,
          };
        })
      );

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const loadLikes = async () => {
    try {
      let query = supabase.from("likes").select("*", { count: "exact" });

      if (kunstwerkId) {
        query = query.eq("kunstwerk_id", kunstwerkId);
      }
      if (modelId) {
        query = query.eq("model_id", modelId);
      }

      const { count, error } = await query;
      if (error) throw error;

      setLikesCount(count || 0);

      if (user) {
        let likeQuery = supabase.from("likes").select("id");
        if (kunstwerkId) {
          likeQuery = likeQuery.eq("kunstwerk_id", kunstwerkId);
        }
        if (modelId) {
          likeQuery = likeQuery.eq("model_id", modelId);
        }
        const { data: userLike } = await likeQuery.eq("user_id", user.id).maybeSingle();
        setHasLiked(!!userLike);
      }
    } catch (error) {
      console.error("Error loading likes:", error);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast.error("Log in om te kunnen liken");
      return;
    }

    try {
      if (hasLiked) {
        let query = supabase.from("likes").delete().eq("user_id", user.id);
        if (kunstwerkId) query = query.eq("kunstwerk_id", kunstwerkId);
        if (modelId) query = query.eq("model_id", modelId);

        const { error } = await query;
        if (error) throw error;

        setHasLiked(false);
        setLikesCount(likesCount - 1);
      } else {
        const { error } = await supabase.from("likes").insert({
          user_id: user.id,
          kunstwerk_id: kunstwerkId || null,
          model_id: modelId || null,
        });

        if (error) throw error;

        setHasLiked(true);
        setLikesCount(likesCount + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Kon like niet verwerken");
    }
  };

  const postComment = async () => {
    if (!user) {
      toast.error("Log in om te kunnen reageren");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Schrijf een comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        kunstwerk_id: kunstwerkId || null,
        model_id: modelId || null,
        comment_text: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      toast.success("Comment geplaatst");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Kon comment niet plaatsen");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;

      toast.success("Comment verwijderd");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Kon comment niet verwijderen");
    }
  };

  if (loading) {
    return <div className="animate-pulse">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Like and Comment Counts */}
      <div className="flex items-center gap-6 animate-fade-in">
        <Button
          variant={hasLiked ? "default" : "outline"}
          size="lg"
          onClick={toggleLike}
          disabled={!user}
          className={cn(
            "gap-2 transition-all duration-300 hover-scale",
            hasLiked && "animate-pulse"
          )}
        >
          <Heart className={`h-5 w-5 ${hasLiked ? "fill-current" : ""}`} />
          <span className="font-semibold">{likesCount}</span>
        </Button>
        <div className="flex items-center text-lg text-muted-foreground gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{comments.length}</span>
          <span>comments</span>
        </div>
      </div>

      {/* Comment Input */}
      {user && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Avatar>
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Schrijf een comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[100px] resize-none"
                  disabled={isSubmitting}
                />
                <Button 
                  onClick={postComment} 
                  disabled={isSubmitting || !newComment.trim()}
                  className="w-full sm:w-auto"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Plaatsen..." : "Plaats comment"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nog geen comments. Wees de eerste om te reageren!
              </p>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment, index) => (
            <Card 
              key={comment.id}
              className="animate-fade-in hover:shadow-md transition-shadow duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {comment.profiles?.username?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {comment.profiles?.username || "Anoniem"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {user?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteComment(comment.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {comment.comment_text}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SocialFeatures;
