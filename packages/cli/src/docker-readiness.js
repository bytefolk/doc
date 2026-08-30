import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Docker environment readiness (doc#28).
 *
 * One command decides whether Docker is usable before `doc up --build`
 * performs its first side-effectful step (image pull / build). Two known
 * Windows/WSL traps are surfaced with stable codes and actionable guidance:
 *
 *  - `docker_daemon_unreachable`: the daemon is not running (Docker Desktop
 *    not started, or WSL integration disabled).
 *  - `docker_credsstore_desktop_exe`: `~/.docker/config.json` sets
 *    `credsStore: desktop.exe` while running on a non-Windows platform (WSL),
 *    which makes even public image pulls fail with
 *    `fork/exec docker-credential-desktop.exe: exec format error`.
 */
export const DOCKER_READINESS_CODES = Object.freeze({
  ready: 'docker_ready',
  daemonUnreachable: 'docker_daemon_unreachable',
  credsStoreDesktopExe: 'docker_credsstore_desktop_exe',
})

const CREDSSTORE_DESKTOP_EXE_RE = /docker-credential-desktop/i
const EXEC_FORMAT_RE = /exec format error/i
const WINDOWS_EXE_STORE_RE = /\.exe$/i

export const DOCKER_READINESS_GUIDANCE = Object.freeze({
  [DOCKER_READINESS_CODES.daemonUnreachable]:
    'Start Docker Desktop (or enable Docker Desktop WSL integration), then re-run.',
  [DOCKER_READINESS_CODES.credsStoreDesktopExe]:
    'Remove "credsStore": "desktop.exe" from ~/.docker/config.json (the Docker Desktop credential helper cannot execute under WSL), then re-run.',
})

/**
 * Detects the WSL + Docker Desktop credential-store trap by inspecting
 * ~/.docker/config.json for a Windows credential helper (.exe) configured on
 * a non-Windows platform.
 */
export async function hasDesktopExeCredsStore(homeDir = homedir()) {
  try {
    const raw = await readFile(join(homeDir, '.docker', 'config.json'), 'utf8')
    const parsed = JSON.parse(raw)
    const store = parsed.credsStore
    return typeof store === 'string' && WINDOWS_EXE_STORE_RE.test(store)
  } catch {
    return false
  }
}

/**
 * Returns a Docker readiness verdict: `{ ok, code, guidance, detail }`.
 *
 * `ok` is true only when the daemon is reachable AND the credential-store
 * trap is absent. A non-ok verdict carries a stable `code` and actionable
 * `guidance`. This check performs no pull/build and has no side effects.
 */
export async function checkDockerReadiness({
  runner,
  platform = process.platform,
  homeDir = homedir(),
  cwd,
}) {
  const info = await runner.capture('docker', ['info', '--format', '{{.ServerVersion}}'], { cwd })
  const infoStderr = info.stderr || ''

  const credsStoreTrap =
    platform !== 'win32' &&
    (EXEC_FORMAT_RE.test(infoStderr) && CREDSSTORE_DESKTOP_EXE_RE.test(infoStderr)
      ? true
      : await hasDesktopExeCredsStore(homeDir))

  if (info.code !== 0) {
    if (credsStoreTrap) {
      return {
        ok: false,
        code: DOCKER_READINESS_CODES.credsStoreDesktopExe,
        guidance: DOCKER_READINESS_GUIDANCE[DOCKER_READINESS_CODES.credsStoreDesktopExe],
        detail: infoStderr.trim() || 'docker credential helper cannot execute under WSL',
      }
    }
    return {
      ok: false,
      code: DOCKER_READINESS_CODES.daemonUnreachable,
      guidance: DOCKER_READINESS_GUIDANCE[DOCKER_READINESS_CODES.daemonUnreachable],
      detail: infoStderr.trim() || 'docker daemon is not reachable',
    }
  }

  // Daemon is reachable, but a desktop.exe credential store still breaks image
  // pulls under WSL even when `docker info` succeeds.
  if (credsStoreTrap) {
    return {
      ok: false,
      code: DOCKER_READINESS_CODES.credsStoreDesktopExe,
      guidance: DOCKER_READINESS_GUIDANCE[DOCKER_READINESS_CODES.credsStoreDesktopExe],
      detail: 'credsStore points to desktop.exe, which cannot execute under WSL',
    }
  }

  return {
    ok: true,
    code: DOCKER_READINESS_CODES.ready,
    guidance: null,
    detail: `reachable (${info.stdout.trim()})`,
  }
}
