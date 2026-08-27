# Photo storage setup

Travel Globe uploads photos directly from the browser to Cloudflare R2 with a five-minute, single-object signed URL. The application server only issues the signed URL, so image bytes do not pass through Vercel.

## 1. Create the bucket and token

1. Create an R2 bucket, for example `travel-globe-photos`.
2. For a friends-only beta, enable the bucket's `r2.dev` public development URL. It is
   rate-limited, so connect a custom domain before a wider public release.
3. Create an R2 API token scoped to this bucket with Object Read & Write permission.
4. Add the five `R2_*` values from `frontend/.env.example` to the Vercel project for Production, Preview, and Development as appropriate.

Do not expose the access key or secret as `NEXT_PUBLIC_*` variables.

## 2. Configure browser upload CORS

The exact production policy is also available in `docs/r2-cors.production.json`. Add a
preview origin only when that specific preview deployment must support uploads.

```json
[
  {
    "AllowedOrigins": [
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
