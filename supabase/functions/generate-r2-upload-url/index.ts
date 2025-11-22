import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.937.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.937.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileType, folder } = await req.json();

    console.log('Generating pre-signed URL for:', { fileName, fileType, folder });

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      },
      // Prevent AWS SDK from trying to load config from filesystem
      maxAttempts: 1,
      requestHandler: undefined,
    });

    const key = `${folder}/${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: Deno.env.get('R2_BUCKET_NAME'),
      Key: key,
      ContentType: fileType,
    });

    // Generate pre-signed URL (valid for 1 hour)
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const publicUrl = `${Deno.env.get('R2_PUBLIC_BASE_URL')}/${key}`;

    console.log('Pre-signed URL generated successfully');

    return new Response(
      JSON.stringify({ uploadUrl, publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
