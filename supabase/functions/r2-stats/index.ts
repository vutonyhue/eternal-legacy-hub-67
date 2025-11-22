import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface R2Object {
  Key: string;
  Size: number;
  LastModified: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('R2_BUCKET_NAME');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('Missing R2 configuration');
    }

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const region = 'auto';

    // Create AWS signature for S3 API
    const now = new Date();
    const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

    const host = `${accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${bucketName}/`;
    const canonicalQuerystring = 'list-type=2';
    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-date';
    const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty payload

    const canonicalRequest = `GET\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

    const encoder = new TextEncoder();
    const canonicalRequestHash = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(canonicalRequest)
    );
    const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHashHex}`;

    // Create signing key
    const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
      const kDate = await crypto.subtle.importKey(
        'raw',
        encoder.encode('AWS4' + key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const kDateSig = await crypto.subtle.sign('HMAC', kDate, encoder.encode(dateStamp));
      
      const kRegion = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(kDateSig),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const kRegionSig = await crypto.subtle.sign('HMAC', kRegion, encoder.encode(regionName));
      
      const kService = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(kRegionSig),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const kServiceSig = await crypto.subtle.sign('HMAC', kService, encoder.encode(serviceName));
      
      const kSigning = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(kServiceSig),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const kSigningSig = await crypto.subtle.sign('HMAC', kSigning, encoder.encode('aws4_request'));
      
      return new Uint8Array(kSigningSig);
    };

    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, 's3');
    const signingKeyForHmac = await crypto.subtle.importKey(
      'raw',
      signingKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', signingKeyForHmac, encoder.encode(stringToSign));
    const signature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Make request to R2
    const r2Response = await fetch(`${endpoint}/${bucketName}/?list-type=2`, {
      method: 'GET',
      headers: {
        'Host': host,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
    });

    if (!r2Response.ok) {
      const errorText = await r2Response.text();
      console.error('R2 API Error:', errorText);
      throw new Error(`R2 API error: ${r2Response.status}`);
    }

    const xmlText = await r2Response.text();
    
    // Parse XML response to get object sizes
    const keyRegex = /<Key>([^<]+)<\/Key>/g;
    const sizeRegex = /<Size>(\d+)<\/Size>/g;
    
    const keys = [...xmlText.matchAll(keyRegex)].map(m => m[1]);
    const sizes = [...xmlText.matchAll(sizeRegex)].map(m => parseInt(m[1]));
    
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);
    const totalCount = keys.length;

    // Convert to human-readable format
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalFiles: totalCount,
          totalSize: totalSize,
          totalSizeFormatted: formatBytes(totalSize),
          bucketName: bucketName,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting R2 stats:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
