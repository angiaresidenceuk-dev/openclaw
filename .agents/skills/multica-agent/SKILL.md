---
name: multica-agent
description: Set up and manage the Multica agent runtime with OpenClaw. Use when configuring the Multica daemon, connecting OpenClaw as a managed agent runtime, diagnosing daemon or runtime issues, or managing Multica workspaces and agent assignments.
---

# Multica Agent

[Multica](https://multica.ai) is an open-source managed agents platform. It auto-detects `openclaw` on PATH and routes tasks to it as a runtime.

## Install

```bash
# Linux (AMD64)
curl -sL https://github.com/multica-ai/multica/releases/download/v0.2.6/multica_linux_amd64.tar.gz | tar -xz -C /usr/local/bin multica

# macOS (Apple Silicon)
curl -sL https://github.com/multica-ai/multica/releases/download/v0.2.6/multica_darwin_arm64.tar.gz | tar -xz -C /usr/local/bin multica

# macOS (Intel)
curl -sL https://github.com/multica-ai/multica/releases/download/v0.2.6/multica_darwin_amd64.tar.gz | tar -xz -C /usr/local/bin multica

# Or via Homebrew
brew install multica-ai/tap/multica
```

Verify: `multica --version`

## One-command setup

```bash
multica setup          # Multica Cloud (multica.ai)
multica setup self-host  # Self-hosted server
```

`multica setup` authenticates, creates a workspace, and starts the daemon. The daemon auto-detects `openclaw` on PATH and registers it as an available agent provider.

## Daemon management

```bash
multica daemon start    # Start in background
multica daemon status   # Check status
multica daemon logs     # Tail daemon logs
multica daemon stop     # Stop daemon
multica daemon restart  # Restart daemon
```

## Verify runtime

After starting the daemon, go to **Settings → Runtimes** in the Multica web app. Your machine should appear as an active runtime with `openclaw` listed as an available provider.

## Create an OpenClaw agent

1. Go to **Settings → Agents → New Agent**
2. Select your runtime
3. Choose **OpenClaw** as the provider
4. Name the agent (appears on the board and in comments)

## Assign tasks

```bash
multica issue create --title "Fix auth bug" --assign @my-openclaw-agent
multica issue list
multica agent list
multica agent tasks <agent-id>
```

## Troubleshooting

- **Runtime not showing**: ensure `openclaw` is on PATH and `multica daemon status` shows `running`
- **Auth errors**: run `multica auth` to re-authenticate
- **Daemon not starting**: check `multica daemon logs` for errors

## Environment variables

| Variable | Description |
|---|---|
| `MULTICA_SERVER_URL` | Override default server URL (for self-hosted) |
| `MULTICA_WORKSPACE_ID` | Set active workspace |
| `MULTICA_DAEMON_DEVICE_NAME` | Custom device display name |
| `MULTICA_DAEMON_MAX_CONCURRENT_TASKS` | Max parallel tasks (default: 1) |
| `MULTICA_AGENT_TIMEOUT` | Per-task timeout |
