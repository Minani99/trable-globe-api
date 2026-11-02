import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type * as AuthStateModule from "../src/lib/auth-state";
import type { AuthMember } from "../src/types";

function isolatedAuth(fetcher: typeof fetch, signalFactory = AbortSignal): typeof AuthStateModule {
  const source = readFileSync("src/lib/auth-state.ts", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, fetch: fetcher, AbortSignal: signalFactory });
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

test("멈춘 세션 조회는 제한 시간 후 종료되고 다음 조회를 막지 않는다", async () => {
  const controller = new AbortController();
  let timeout = 0;
  let calls = 0;
  const signalFactory = { timeout: (duration: number) => {
    timeout = duration;
    return calls === 0 ? controller.signal : new AbortController().signal;
  } } as typeof AbortSignal;
  const member = { username: "current_account" } as AuthMember;
  const auth = isolatedAuth(async (_input, init) => {
    calls += 1;
    if (calls > 1) return new Response(null, { status: 401 });
    return new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason), { once: true });
    });
  }, signalFactory);
  auth.setCachedAuthMember(member);
  const first = auth.loadAuthMember({ force: true });
  const shared = auth.loadAuthMember({ force: true });
  expect(calls).toBe(1);
  expect(timeout).toBe(20_000);
  controller.abort(new DOMException("Timed out", "TimeoutError"));
  expect(await first).toEqual(member);
  expect(await shared).toEqual(member);
  expect(auth.getCachedAuthMember()).toEqual(member);
  expect(await auth.loadAuthMember({ force: true })).toBeNull();
  expect(calls).toBe(2);
});
