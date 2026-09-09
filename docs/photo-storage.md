# Photo storage setup

Travel Globe uploads photos directly from the browser to Cloudflare R2 with a five-minute, single-object signed URL. The application server only issues the signed URL, so image bytes do not pass through Vercel.

## 1. Create the bucket and token

1. Create an R2 bucket, for example `travel-globe-photos`.
2. For a friends-only beta, enable the bucket's `r2.dev` public development URL. It is
   rate-limited, so connect a custom domain before a wider public release.
3. Create an R2 API token scoped to this bucket with Object Read & Write permission.
4. Add the five `R2_*` values from `frontend/.env.example` to the Vercel project for Production, Preview, and Development as appropriate.

Do not expose the access key or secret as `NEXT_PUBLIC_*` variables.

`R2_ACCESS_KEY_ID`와 `R2_SECRET_ACCESS_KEY`는 같은 R2 API 토큰을 만들 때 한 번만
표시되는 한 쌍을 그대로 사용해야 합니다. 계정 API 토큰 값이나 토큰 ID를 섞으면
서명 URL은 생성되지만 실제 업로드는 `SignatureDoesNotMatch`로 거절됩니다. 키를
확인할 수 없다면 기존 값을 추측해서 수정하지 말고 새 R2 Object Read & Write 토큰을
발급해 두 값을 함께 교체하세요.

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
