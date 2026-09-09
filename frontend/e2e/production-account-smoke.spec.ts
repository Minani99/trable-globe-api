import { expect, test } from "@playwright/test";

const productionSmokeEnabled = process.env.PRODUCTION_ACCOUNT_SMOKE === "1";

test.skip(!productionSmokeEnabled, "운영 계정 스모크는 명시적으로 실행할 때만 사용합니다.");

test("운영에서 임시 계정·비공개 여행·R2 사진을 만들고 모두 정리한다", async ({ page }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim().replace(/\/+$/, "");
  expect(baseUrl, "PLAYWRIGHT_BASE_URL이 필요합니다.").toBeTruthy();

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const username = `beta_smoke_${suffix}`.slice(0, 30);
  const password = `Smoke-${suffix}-42!`;
  const requestHeaders = { Origin: baseUrl! };
  let registered = false;
  let uploadedObjectKey: string | null = null;
  let primaryFailure: unknown = null;

  try {
    const registerResponse = await page.request.post("/api/auth/register", {
      headers: requestHeaders,
      data: {
        username,
        displayName: "베타 점검 계정",
        email: `${username}@example.com`,
        password,
      },
    });
    expect(registerResponse.status(), await responseDetails(registerResponse)).toBe(200);
    registered = true;

    const memberResponse = await page.request.get("/api/auth/me");
    expect(memberResponse.status(), await responseDetails(memberResponse)).toBe(200);
    expect((await memberResponse.json()).data.username).toBe(username);

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
    const tomorrow = addDays(today, 1);
    const travelPayload = {
      title: "운영 베타 자동 점검",
      description: "점검이 끝나면 계정과 함께 삭제되는 비공개 여행입니다.",
      startDate: today,
      endDate: tomorrow,
      coverImageUrl: null,
      visibility: "PRIVATE",
      places: [{
        country: {
          iso2Code: "KR",
          iso3Code: "KOR",
          nameEn: "South Korea",
          nameKo: "대한민국",
          latitude: 35.907757,
          longitude: 127.766922,
        },
        city: {
          nameEn: "Seoul",
          nameKo: "서울",
          latitude: 37.5665,
          longitude: 126.978,
        },
        placeName: "서울역",
        latitude: 37.5547,
        longitude: 126.9706,
        visitedAt: today,
        startTime: "10:00",
        durationMinutes: 60,
        memo: "운영 저장 확인",
      }],
      photos: [],
    };

    const createResponse = await page.request.post("/api/private/travels", {
      headers: requestHeaders,
      data: travelPayload,
    });
    expect(createResponse.status(), await responseDetails(createResponse)).toBe(201);
    const travelId = (await createResponse.json()).data.id as number;

    const updateResponse = await page.request.put(`/api/private/travels/${travelId}`, {
      headers: requestHeaders,
      data: { ...travelPayload, title: "운영 베타 자동 점검 · 수정됨" },
    });
    expect(updateResponse.status(), await responseDetails(updateResponse)).toBe(200);
    expect((await updateResponse.json()).data.title).toBe("운영 베타 자동 점검 · 수정됨");

    const ownedResponse = await page.request.get("/api/private/travels");
    expect(ownedResponse.status(), await responseDetails(ownedResponse)).toBe(200);
    expect((await ownedResponse.json()).data.some((item: { travel: { id: number } }) => item.travel.id === travelId)).toBe(true);

    const imageBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const presignResponse = await page.request.post("/api/uploads/presign", {
      headers: requestHeaders,
      data: { contentType: "image/png", size: imageBytes.length },
    });
    expect(presignResponse.status(), await responseDetails(presignResponse)).toBe(200);
    const upload = (await presignResponse.json()).data as {
      objectKey: string;
      uploadUrl: string;
      publicUrl: string;
    };
    uploadedObjectKey = upload.objectKey;

    await page.goto("/");
    const uploadResult = await page.evaluate(async ({ uploadUrl, bytes }) => {
      try {
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/png" },
          body: new Uint8Array(bytes),
        });
        return { ok: response.ok, status: response.status, error: null };
      } catch (error) {
        return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
      }
    }, { uploadUrl: upload.uploadUrl, bytes: [...imageBytes] });
    if (!uploadResult.ok) {
      const signedUploadResponse = await page.request.put(upload.uploadUrl, {
        headers: { "Content-Type": "image/png" },
        data: imageBytes,
      });
      expect(signedUploadResponse.status(), `R2 서명 URL 자체도 실패했습니다.\n${await responseDetails(signedUploadResponse)}`).toBe(200);
      throw new Error(`R2 서명 URL은 정상이지만 운영 브라우저 업로드가 차단됐습니다. 버킷 CORS를 확인하세요. (${uploadResult.error ?? "status 0"})`);
    }
    expect(uploadResult.status).toBe(200);

    const publicImageResponse = await page.request.get(upload.publicUrl);
    expect(publicImageResponse.status(), await responseDetails(publicImageResponse)).toBe(200);
    expect(publicImageResponse.headers()["content-type"]).toContain("image/png");

    const deleteImageResponse = await page.request.delete("/api/uploads/object", {
      headers: requestHeaders,
      data: { objectKey: uploadedObjectKey },
    });
    expect(deleteImageResponse.status(), await responseDetails(deleteImageResponse)).toBe(200);
    uploadedObjectKey = null;
  } catch (error) {
    primaryFailure = error;
    throw error;
  } finally {
    if (uploadedObjectKey) {
      await page.request.delete("/api/uploads/object", {
        headers: requestHeaders,
        data: { objectKey: uploadedObjectKey },
      }).catch(() => undefined);
    }
    if (registered) {
      const deleteAccountResponse = await page.request.delete("/api/auth/account", {
        headers: requestHeaders,
        data: { password },
      });
      if (primaryFailure === null) {
        expect(deleteAccountResponse.status(), await responseDetails(deleteAccountResponse)).toBe(200);
        const memberAfterDelete = await page.request.get("/api/auth/me");
        expect(memberAfterDelete.status(), await responseDetails(memberAfterDelete)).toBe(401);
        const signedOutEnvelope = await memberAfterDelete.json();
        expect(signedOutEnvelope.data).toBeNull();
        expect(signedOutEnvelope.error?.code).toBe("AUTHENTICATION_REQUIRED");
      }
    }
  }
});

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

async function responseDetails(response: import("@playwright/test").APIResponse): Promise<string> {
  return `${response.status()} ${response.url()}\n${await response.text().catch(() => "")}`;
}
