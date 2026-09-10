import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type * as AuthStateModule from "../src/lib/auth-state";
import type { AuthMember } from "../src/types";

function isolatedAuth(fetcher: typeof fetch): typeof AuthStateModule {
  const source = readFileSync("src/lib/auth-state.ts", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, fetch: fetcher });
  return exports as typeof AuthStateModule;
}

test("로그아웃 후 도착한 이전 계정 응답은 로그인 상태를 복원하지 않는다", async () => {
  let resolve!: (response: Response) => void;
  const auth = isolatedAuth(() => new Promise<Response>((done) => { resolve = done; }));
  const pending = auth.loadAuthMember();
  auth.setCachedAuthMember(null);
  resolve(Response.json({ data: { username: "previous_account" } }));
  expect(await pending).toBeNull();
  expect(auth.getCachedAuthMember()).toBeNull();
});

test("서버 일시 장애는 기존 로그인 상태를 지우지 않는다", async () => {
  const auth = isolatedAuth(async () => new Response(null, { status: 503 }));
  const member = { username: "current_account" } as AuthMember;
  auth.setCachedAuthMember(member);
  expect(await auth.loadAuthMember({ force: true })).toEqual(member);
  expect(auth.getCachedAuthMember()).toEqual(member);
});

test("만료된 세션의 401 응답은 로그인 상태를 해제한다", async () => {
  const auth = isolatedAuth(async () => new Response(null, { status: 401 }));
  auth.setCachedAuthMember({ username: "expired_account" } as AuthMember);
  expect(await auth.loadAuthMember({ force: true })).toBeNull();
});
