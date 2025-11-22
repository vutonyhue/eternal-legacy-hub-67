// 🚨 BẮT BUỘC: Dùng Node.js runtime để AWS SDK chạy được
export const config = {
  runtime: "nodejs",
};

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, fileType } = req.query;
    const file = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const upload = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: Buffer.from(file, "base64"),
      ContentType: fileType,
    });

    await client.send(upload);

    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${fileName}`;

    return res.status(200).json({ url: publicUrl });

  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed", details: err.message });
  }
}
