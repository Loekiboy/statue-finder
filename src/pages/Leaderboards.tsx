import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Upload, Eye } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface LeaderboardEntry {
  user_id: string;
  count: number;
  rank: number;
}

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all';

const Leaderboards = () => {
  const [user, setUser] = useState<User | null>(null);
  const [discoveriesLeaderboard, setDiscoveriesLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [uploadsLeaderboard, setUploadsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getTimeFilterDate = (filter: TimeFilter): string | null => {
    if (filter === 'all') return null;
    
    const now = new Date();
    let date = new Date();
    
    switch (filter) {
      case 'day':
        date.setDate(now.getDate() - 1);
        break;
      case 'week':
        date.setDate(now.getDate() - 7);
        break;
      case 'month':
        date.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        date.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return date.toISOString();
  };

  useEffect(() => {
    if (!user) return;

    const fetchDiscoveriesLeaderboard = async () => {
      const filterDate = getTimeFilterDate(timeFilter);
      
      let query = supabase
        .from('discovered_models')
        .select('user_id, discovered_at');

      if (filterDate) {
        query = query.gte('discovered_at', filterDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching discoveries:', error);
        return;
      }

      // Count discoveries per user
      const userCounts = data.reduce((acc: Record<string, number>, item) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {});

      // Sort and rank
      const leaderboard = Object.entries(userCounts)
        .map(([user_id, count]) => ({ user_id, count: count as number, rank: 0 }))
        .sort((a, b) => b.count - a.count)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
        .slice(0, 10);

      setDiscoveriesLeaderboard(leaderboard);
    };

    const fetchUploadsLeaderboard = async () => {
      const filterDate = getTimeFilterDate(timeFilter);
      
      let query = supabase
        .from('models')
        .select('user_id, created_at');

      if (filterDate) {
        query = query.gte('created_at', filterDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching uploads:', error);
        return;
      }

      // Count uploads per user
      const userCounts = data.reduce((acc: Record<string, number>, item) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {});

      // Sort and rank
      const leaderboard = Object.entries(userCounts)
        .map(([user_id, count]) => ({ user_id, count: count as number, rank: 0 }))
        .sort((a, b) => b.count - a.count)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
        .slice(0, 10);

      setUploadsLeaderboard(leaderboard);
    };

    fetchDiscoveriesLeaderboard();
    fetchUploadsLeaderboard();
  }, [user, timeFilter]);

  const getTimeFilterLabel = (filter: TimeFilter): string => {
    const labels = {
      day: 'Afgelopen dag',
      week: 'Afgelopen 7 dagen',
      month: 'Deze maand',
      year: 'Dit jaar',
      all: 'Van altijd'
    };
    return labels[filter];
  };

  const renderLeaderboardTable = (data: LeaderboardEntry[], type: 'discoveries' | 'uploads') => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nog geen data voor deze periode
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
              entry.user_id === user?.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                entry.rank === 1 ? 'bg-yellow-500 text-yellow-950' :
                entry.rank === 2 ? 'bg-gray-400 text-gray-950' :
                entry.rank === 3 ? 'bg-orange-600 text-orange-950' :
                'bg-muted text-muted-foreground'
              }`}>
                {entry.rank === 1 && <Trophy className="h-4 w-4" />}
                {entry.rank !== 1 && <span className="font-bold">{entry.rank}</span>}
              </div>
              <div>
                <p className="font-medium">
                  {entry.user_id === user?.id ? 'Jij' : `Gebruiker ${entry.user_id.slice(0, 8)}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{entry.count}</p>
              <p className="text-xs text-muted-foreground">
                {type === 'discoveries' ? 'ontdekkingen' : 'uploads'}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto ml-16 md:ml-64">
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Leaderboards</h1>
            <p className="text-muted-foreground">
              Zie wie de meeste standbeelden heeft ontdekt en geüpload
            </p>
          </div>

          <div className="mb-6">
            <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecteer periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Afgelopen dag</SelectItem>
                <SelectItem value="week">Afgelopen 7 dagen</SelectItem>
                <SelectItem value="month">Deze maand</SelectItem>
                <SelectItem value="year">Dit jaar</SelectItem>
                <SelectItem value="all">Van altijd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="discoveries" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="discoveries" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Meeste Ontdekkingen
              </TabsTrigger>
              <TabsTrigger value="uploads" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Meeste Uploads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discoveries">
              <Card>
                <CardHeader>
                  <CardTitle>Meeste Standbeelden Gevonden</CardTitle>
                  <CardDescription>
                    Top 10 gebruikers - {getTimeFilterLabel(timeFilter)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderLeaderboardTable(discoveriesLeaderboard, 'discoveries')}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="uploads">
              <Card>
                <CardHeader>
                  <CardTitle>Meeste Standbeelden Geüpload</CardTitle>
                  <CardDescription>
                    Top 10 gebruikers - {getTimeFilterLabel(timeFilter)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderLeaderboardTable(uploadsLeaderboard, 'uploads')}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;
