import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ImagePlus, Video, X, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { uploadFileToR2 } from '@/lib/uploadToR2';

interface CreatePostProps {
  onPostCreated: () => void;
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setVideo(null);
      setVideoPreview(null);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast.error('Video must be less than 500MB');
        return;
      }
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setImage(null);
      setImagePreview(null);
    }
  };

  const removeMedia = () => {
    setImage(null);
    setImagePreview(null);
    setVideo(null);
    setVideoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image && !video) {
      toast.error('Please add some content, image, or video');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' | null = null;

      // 🔹 Upload image if present → Cloudflare R2 with progress
      if (image) {
        mediaUrl = await uploadFileToR2(image, user.id, 'posts', (progress) => {
          setUploadProgress(progress);
        });
        mediaType = 'image';
      }

      // 🔹 Upload video if present → Cloudflare R2 with progress
      if (video) {
        mediaUrl = await uploadFileToR2(video, user.id, 'posts', (progress) => {
          setUploadProgress(progress);
        });
        mediaType = 'video';
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim() || '',
        media_url: mediaUrl,
        media_type: mediaType,
      });

      if (error) throw error;

      setContent('');
      setImage(null);
      setImagePreview(null);
      setVideo(null);
      setVideoPreview(null);
      setUploadProgress(0);
      toast.success('Post created!');
      onPostCreated();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create post');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] sm:min-h-[100px] resize-none text-sm sm:text-base"
          disabled={loading}
        />

        {imagePreview && (
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-64 rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={removeMedia}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {videoPreview && (
          <div className="relative inline-block">
            <video src={videoPreview} controls className="max-h-64 rounded-lg border" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={removeMedia}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {loading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1 sm:gap-2">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={loading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={loading}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <ImagePlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Photo</span>
            </Button>

            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
              disabled={loading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('video-upload')?.click()}
              disabled={loading}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <Video className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Video</span>
            </Button>
          </div>
          <Button
            type="submit"
            disabled={loading || (!content.trim() && !image && !video)}
            size="sm"
            className="text-xs sm:text-sm"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
