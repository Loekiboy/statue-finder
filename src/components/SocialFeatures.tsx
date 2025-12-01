import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  };
}

const SocialFeatures = ({ kunstwerkId, modelId }: SocialFeaturesProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, kunstwerkId, modelId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
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
        const { data: userLike } = await likeQuery.eq("user_id", user.id).single();
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
      loadComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Kon comment niet plaatsen");
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant={hasLiked ? "default" : "outline"}
          size="sm"
          onClick={toggleLike}
          disabled={!user}
        >
          <Heart className={`mr-2 h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
          {likesCount} {likesCount === 1 ? "Like" : "Likes"}
        </Button>
        <div className="flex items-center text-sm text-muted-foreground">
          <MessageCircle className="mr-2 h-4 w-4" />
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </div>
      </div>

      {user && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Schrijf een comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <Button onClick={postComment} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{comment.profiles?.username || "Anoniem"}</span>
                {user?.id === comment.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteComment(comment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{comment.comment_text}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(comment.created_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SocialFeatures;
