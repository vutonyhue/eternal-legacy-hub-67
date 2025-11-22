import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFileToR2 } from '@/lib/uploadToR2';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Image, Video, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface EditPostDialogProps {
  post: {
    id: string;
    content: string;
    media_url: string | null;
    media_type: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: () => void;
}

export const EditPostDialog = ({ post, isOpen, onClose, onPostUpdated }: EditPostDialogProps) => {
  const [content, setContent] = useState(post.content);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const initialImagePreview = post.media_type === 'image' ? post.media_url : null;
  const initialVideoPreview = post.media_type === 'video' ? post.media_url : null;
  const [imagePreview, setImagePreview] = useState<string | null>(initialImagePreview);
  const [videoPreview, setVideoPreview] = useState<string | null>(initialVideoPreview);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setVideoFile(null);
      setVideoPreview(null);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast.error('Video size must be less than 500MB');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !videoFile && !imagePreview && !videoPreview) {
      toast.error('Please add some content');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine current media based on previews
      let mediaUrl: string | null =
        imagePreview && !videoPreview ? imagePreview :
        videoPreview && !imagePreview ? videoPreview :
        null;
      let mediaType: string | null =
        imagePreview && !videoPreview ? 'image' :
        videoPreview && !imagePreview ? 'video' :
        null;

      // Upload new image if selected → Cloudflare R2 with progress
      if (imageFile) {
        mediaUrl = await uploadFileToR2(imageFile, user.id, 'posts', (progress) => {
          setUploadProgress(progress);
        });
        mediaType = 'image';
      }

      // Upload new video if selected → Cloudflare R2 with progress
      if (videoFile) {
        mediaUrl = await uploadFileToR2(videoFile, user.id, 'posts', (progress) => {
          setUploadProgress(progress);
        });
        mediaType = 'video';
      }

      const { error } = await supabase
        .from('posts')
        .update({
          content,
          media_url: mediaUrl,
          media_type: mediaUrl ? mediaType : null,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated successfully');
      onPostUpdated();
      onClose();
    } catch (error: any) {
      toast.error('Failed to update post');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
          />

          {imagePreview && !videoPreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {videoPreview && !imagePreview && (
            <div className="relative">
              <video src={videoPreview} controls className="w-full rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeVideo}
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

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" asChild>
              <label>
                <Image className="w-4 h-4 mr-2" />
                {imagePreview ? 'Change Image' : 'Add Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </Button>
            <Button type="button" variant="outline" size="sm" className="flex-1" asChild>
              <label>
                <Video className="w-4 h-4 mr-2" />
                {videoPreview ? 'Change Video' : 'Add Video'}
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </label>
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
