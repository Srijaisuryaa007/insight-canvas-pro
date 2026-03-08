import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, Send, AtSign, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

export interface Comment {
  id: string;
  dashboardId: string;
  userId: string;
  userName: string;
  comment: string;
  mentions: string[];
  createdAt: string;
}

const MOCK_USERS = [
  { id: '1', name: 'Alice Chen' },
  { id: '2', name: 'Bob Martinez' },
  { id: '3', name: 'Carol Davis' },
  { id: '4', name: 'David Kim' },
  { id: '5', name: 'Eva Johnson' },
];

interface DashboardCommentsProps {
  dashboardId: string;
}

export default function DashboardComments({ dashboardId }: DashboardCommentsProps) {
  const { user } = useAuth();
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load comments from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !dashboardId) return;
    supabase.from('comments').select('*').eq('dashboard_id', dashboardId)
      .order('created_at')
      .then(({ data }) => {
        if (data) {
          setAllComments(data.map(c => ({
            id: c.id, dashboardId: c.dashboard_id, userId: c.user_id,
            userName: '', comment: c.comment_text, mentions: [], createdAt: c.created_at,
          })));
        }
      });
  }, [dashboardId]);

  const comments = useMemo(() =>
    allComments.filter(c => c.dashboardId === dashboardId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [allComments, dashboardId]
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [comments.length]);

  const handleInput = (value: string) => {
    setNewComment(value);
    const cursor = textareaRef.current?.selectionStart || 0;
    setCursorPosition(cursor);
    const textBeforeCursor = value.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ')) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      if (!query.includes(' ')) { setShowMentions(true); setMentionFilter(query.toLowerCase()); return; }
    }
    setShowMentions(false);
  };

  const insertMention = (userName: string) => {
    const textBeforeCursor = newComment.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const beforeMention = newComment.slice(0, lastAtIndex);
    const afterCursor = newComment.slice(cursorPosition);
    setNewComment(`${beforeMention}@${userName} ${afterCursor}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@(\w+\s?\w*)/g);
    return matches ? matches.map(m => m.slice(1).trim()) : [];
  };

  const handleSubmit = () => {
    if (!newComment.trim() || !user) return;
    const comment: Comment = {
      id: crypto.randomUUID(), dashboardId, userId: user.id,
      userName: user.name, comment: newComment.trim(),
      mentions: extractMentions(newComment), createdAt: new Date().toISOString(),
    };
    setAllComments(prev => [...prev, comment]);
    setNewComment('');

    if (isSupabaseConfigured && supabase) {
      supabase.from('comments').insert({
        id: comment.id, dashboard_id: dashboardId, user_id: user.id, comment_text: comment.comment,
      }).then();
    }

    if (comment.mentions.length > 0) {
      toast({ title: 'Comment Posted', description: `Mentioned: ${comment.mentions.join(', ')}` });
    }
  };

  const handleDelete = (id: string) => {
    setAllComments(prev => prev.filter(c => c.id !== id));
    if (isSupabaseConfigured && supabase) {
      supabase.from('comments').delete().eq('id', id).then();
    }
  };

  const filteredUsers = MOCK_USERS.filter(u => u.name.toLowerCase().includes(mentionFilter));

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const highlightMentions = (text: string) => {
    return text.split(/(@\w+\s?\w*)/g).map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-primary font-medium bg-primary/10 rounded px-0.5">{part}</span>
      ) : (<span key={i}>{part}</span>)
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Comments
          {comments.length > 0 && <Badge variant="secondary" className="text-[10px]">{comments.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[300px]" ref={scrollRef as any}>
          <div className="space-y-3 pr-2">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet</p>
                <p className="text-xs">Start a conversation about this dashboard</p>
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-2 group">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {comment.userName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.userName || 'User'}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatTime(comment.createdAt)}
                      </span>
                      {comment.userId === user?.id && (
                        <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(comment.id)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 break-words">
                      {highlightMentions(comment.comment)}
                    </p>
                    {comment.mentions.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {comment.mentions.map((m, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] gap-0.5">
                            <AtSign className="h-2 w-2" /> {m}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {user && (
          <div className="relative">
            <Textarea
              ref={textareaRef} value={newComment}
              onChange={e => handleInput(e.target.value)}
              placeholder="Add a comment... Use @username to mention"
              className="min-h-[60px] text-sm pr-10 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            />
            <Button size="icon" variant="ghost" className="absolute bottom-2 right-2 h-7 w-7"
              onClick={handleSubmit} disabled={!newComment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 p-1">
                {filteredUsers.map(u => (
                  <button key={u.id} onClick={() => insertMention(u.name)}
                    className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
