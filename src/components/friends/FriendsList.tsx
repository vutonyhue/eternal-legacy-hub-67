import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserMinus, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Friend {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  friendship_id: string;
}

interface FriendsListProps {
  userId: string;
}

export const FriendsList = ({ userId }: FriendsListProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
    fetchSentRequests();
    
    // Set up realtime subscription for friendships
    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        () => {
          // Refetch all data when friendships change
          fetchFriends();
          fetchPendingRequests();
          fetchSentRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        profiles!friendships_addressee_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq("status", "accepted")
      .eq("requester_id", userId);

    if (error) {
      console.error("Error fetching friends:", error);
      return;
    }

    const { data: data2, error: error2 } = await supabase
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        profiles!friendships_requester_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq("status", "accepted")
      .eq("addressee_id", userId);

    const friendsList: Friend[] = [];
    
    data?.forEach((friendship: any) => {
      const profile = friendship.profiles;
      if (profile) {
        friendsList.push({
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          friendship_id: friendship.id
        });
      }
    });

    data2?.forEach((friendship: any) => {
      const profile = friendship.profiles;
      if (profile) {
        friendsList.push({
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          friendship_id: friendship.id
        });
      }
    });

    setFriends(friendsList);
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from("friendships")
      .select(`
        id,
        requester_id,
        profiles!friendships_requester_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq("status", "pending")
      .eq("addressee_id", userId);

    if (error) {
      console.error("Error fetching pending requests:", error);
      return;
    }

    const requests: Friend[] = data?.map((friendship: any) => ({
      id: friendship.profiles.id,
      username: friendship.profiles.username,
      full_name: friendship.profiles.full_name,
      avatar_url: friendship.profiles.avatar_url,
      friendship_id: friendship.id
    })) || [];

    setPendingRequests(requests);
  };

  const fetchSentRequests = async () => {
    const { data, error } = await supabase
      .from("friendships")
      .select(`
        id,
        addressee_id,
        profiles!friendships_addressee_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq("status", "pending")
      .eq("requester_id", userId);

    if (error) {
      console.error("Error fetching sent requests:", error);
      return;
    }

    const requests: Friend[] = data?.map((friendship: any) => ({
      id: friendship.profiles.id,
      username: friendship.profiles.username,
      full_name: friendship.profiles.full_name,
      avatar_url: friendship.profiles.avatar_url,
      friendship_id: friendship.id
    })) || [];

    setSentRequests(requests);
  };

  const handleUnfriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to remove friend");
      console.error(error);
    } else {
      toast.success("Friend removed");
      fetchFriends();
    }
  };

  const handleAccept = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to accept friend request");
      console.error(error);
    } else {
      toast.success("Friend request accepted!");
      fetchFriends();
      fetchPendingRequests();
    }
  };

  const handleReject = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to reject friend request");
      console.error(error);
    } else {
      toast.success("Friend request rejected");
      fetchPendingRequests();
    }
  };

  const handleCancelRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to cancel request");
      console.error(error);
    } else {
      toast.success("Friend request cancelled");
      fetchSentRequests();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="friends">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            <ScrollArea className="h-[400px]">
              {friends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No friends yet</p>
              ) : (
                <div className="space-y-4">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => navigate(`/profile?userId=${friend.id}`)}
                      >
                        <Avatar>
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>{friend.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friend.username}</p>
                          <p className="text-sm text-muted-foreground">{friend.full_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnfriend(friend.friendship_id)}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests">
            <ScrollArea className="h-[400px]">
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => navigate(`/profile?userId=${request.id}`)}
                      >
                        <Avatar>
                          <AvatarImage src={request.avatar_url} />
                          <AvatarFallback>{request.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.username}</p>
                          <p className="text-sm text-muted-foreground">{request.full_name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(request.friendship_id)}
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(request.friendship_id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sent">
            <ScrollArea className="h-[400px]">
              {sentRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No sent requests</p>
              ) : (
                <div className="space-y-4">
                  {sentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => navigate(`/profile?userId=${request.id}`)}
                      >
                        <Avatar>
                          <AvatarImage src={request.avatar_url} />
                          <AvatarFallback>{request.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.username}</p>
                          <p className="text-sm text-muted-foreground">{request.full_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelRequest(request.friendship_id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
