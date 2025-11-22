import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HardDrive, RefreshCw } from 'lucide-react';

export const StorageStats = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
    bucketName: string;
  } | null>(null);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('r2-stats');

      if (error) throw error;

      if (data.success) {
        setStats(data.stats);
        toast({
          title: 'Thống kê thành công',
          description: 'Đã tải thông tin storage R2',
        });
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching R2 stats:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin storage',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Thống kê R2 Storage
        </CardTitle>
        <CardDescription>
          Kiểm tra dung lượng media files đang sử dụng trên Cloudflare R2
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Đang tải...' : 'Kiểm tra dung lượng'}
        </Button>

        {stats && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Bucket:</span>
              <span className="font-mono font-semibold">{stats.bucketName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tổng số files:</span>
              <span className="font-semibold">{stats.totalFiles.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Dung lượng:</span>
              <span className="font-semibold text-primary">{stats.totalSizeFormatted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Bytes:</span>
              <span className="font-mono text-sm">{stats.totalSize.toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
