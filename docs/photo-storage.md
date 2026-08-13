# Photo storage setup

Travel Globe uploads photos directly from the browser to Cloudflare R2 with a five-minute, single-object signed URL. The application server only issues the signed URL, so image bytes do not pass through Vercel.

## 1. Create the bucket and token

1. Create an R2 bucket, for example `travel-globe-photos`.
2. Connect a custom domain to the bucket for public reads.
3. Create an R2 API token scoped to this bucket with Object Read & Write permission.
4. Add the five `R2_*` values from `frontend/.env.example` to the Vercel project for Production, Preview, and Development as appropriate.

Do not expose the access key or secret as `NEXT_PUBLIC_*` variables.

## 2. Configure browser upload CORS

Replace the example domains below with the production domain and any Vercel preview domain that should be allowed to upload.

```json
[
  {
    "AllowedOrigins": [
      "https://travel-globe.example.com",
      "https://travel-globe-minani99.vercel.app"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The editor keeps external image URLs as a fallback when the R2 environment variables are absent. Accepted uploads are JPG, PNG, and WebP, up to 10MB each and 30 photos per travel record.
