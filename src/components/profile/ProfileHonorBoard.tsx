import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, MessageCircle, Star, Users, BadgeDollarSign } from 'lucide-react';

interface UserStats {
  posts_count: number;
  comments_count: number;
  reactions_count: number;
  friends_count: number;
  total_reward: number;
}

interface ProfileHonorBoardProps {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export const ProfileHonorBoard = ({ userId, username, avatarUrl }: ProfileHonorBoardProps) => {
  const [stats, setStats] = useState<UserStats>({
    posts_count: 0,
    comments_count: 0,
    reactions_count: 0,
    friends_count: 0,
    total_reward: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [userId]);

  const fetchUserStats = async () => {
    try {
      // Fetch posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch reactions count (reactions this user made)
      const { count: reactionsCount } = await supabase
        .from('reactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch friends count (accepted friendships)
      const { count: friendsCount } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      setStats({
        posts_count: postsCount || 0,
        comments_count: commentsCount || 0,
        reactions_count: reactionsCount || 0,
        friends_count: friendsCount || 0,
        total_reward: 9999999, // Placeholder for future implementation
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="relative border-2 border-yellow-500 rounded-xl p-4 bg-gradient-to-r from-green-800/50 to-green-700/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-yellow-400">
            {icon}
          </div>
          <span className="text-yellow-400 font-bold text-lg uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-white font-bold text-2xl">{value.toLocaleString()}</span>
      </div>
    </div>
  );

return (
    <div className="sticky top-20 rounded-3xl overflow-hidden border-4 border-yellow-500 bg-gradient-to-br from-green-600 via-green-700 to-green-800 shadow-2xl">
      {/* Sparkle effects */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-8 right-8 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-12 left-12 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-8 right-16 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-8 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-12 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '2.5s' }}></div>
      </div>

      <div className="relative p-6 space-y-4">
        {/* Header with logo */}
        <div className="text-center space-y-2">
          <div className="inline-block">
            <div className="relative">
              <img 
                src="/fun-profile-logo.jpg" 
                alt="Fun Profile Web3"
                className="w-20 h-20 mx-auto rounded-full border-2 border-yellow-400 shadow-lg"
              />
            </div>
          </div>
          
          {/* User info */}
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-white text-xl font-bold tracking-wide">{username?.toUpperCase() || 'USER'}</h2>
            <Avatar className="w-12 h-12 border-3 border-yellow-400">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-yellow-500 text-black font-bold">
                {username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <h1 className="text-yellow-400 text-3xl font-black tracking-wider drop-shadow-lg">
            HONOR BOARD
          </h1>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <StatRow 
            icon={<ArrowUp className="w-6 h-6" />}
            label="POSTS"
            value={stats.posts_count}
          />
          <StatRow 
            icon={<MessageCircle className="w-6 h-6" />}
            label="COMMENTS"
            value={stats.comments_count}
          />
          <StatRow 
            icon={<Star className="w-6 h-6" />}
            label="REACTIONS"
            value={stats.reactions_count}
          />
          <StatRow 
            icon={<Users className="w-6 h-6" />}
            label="FRIENDS"
            value={stats.friends_count}
          />
          <StatRow 
            icon={<BadgeDollarSign className="w-6 h-6" />}
            label="TOTAL REWARD"
            value={stats.total_reward}
          />
        </div>
      </div>
    </div>
  );
};
