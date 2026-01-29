# Local Development Automation Options

## Current Manual Setup

Currently, local development requires manually starting 3 separate processes in different terminals:

```bash
# Terminal 1: Pub/Sub Emulator
docker run -p 8681:8681 messagebird/gcloud-pubsub-emulator:latest

# Terminal 2: Cloud Function Worker
cd cloud-functions/clone-program && PORT=8082 doppler run --config dev_personal -- npm run dev

# Terminal 3: Next.js App
doppler run --config dev_personal -- npm run dev
```

This document proposes 3 different automation approaches to reduce this to a single command.

---

## Option 1: Overmind (Recommended)

### What is it?

[Overmind](https://github.com/DarthSim/overmind) is a modern process manager for Procfile-based applications. It runs each process in a tmux session, allowing you to interact with individual processes, restart them, and view their logs independently.

### How it works

Overmind uses a `Procfile` to define your processes. It's a single file with simple syntax:

```procfile
# Procfile
pubsub: docker run --rm -p 8681:8681 messagebird/gcloud-pubsub-emulator:latest
worker: cd cloud-functions/clone-program && PORT=8082 doppler run --config dev_personal -- npm run dev
web: doppler run --config dev_personal -- npm run dev
```

### Installation

```bash
# macOS
brew install overmind tmux
```

### Single Command

```bash
overmind start
```

### Process Management

```bash
# Start all processes
overmind start

# Restart a specific process
overmind restart worker

# Connect to a process (interactive mode)
overmind connect web

# Stop all processes
overmind stop

# Kill all processes (force stop)
overmind kill
```

### Pros

- **Individual process control**: Restart, stop, or interact with any process independently
- **tmux integration**: Each process runs in its own tmux pane with full terminal capabilities
- **Color-coded output**: Easy to distinguish between process logs
- **Auto-restart**: Can automatically restart processes that crash
- **Port management**: Supports dynamic port assignment via `.env` files
- **Well-maintained**: Active development and good documentation
- **macOS native**: Works perfectly on macOS with Homebrew
- **Graceful shutdown**: Properly terminates all processes with Ctrl+C

### Cons

- **Requires tmux**: Additional dependency (though lightweight)
- **Learning curve**: More features mean slightly more to learn
- **Process output interleaving**: All logs in one terminal (can use `overmind connect` to view individually)

### Example Workflow

1. Create `Procfile` in project root
2. Run `overmind start`
3. All services start with color-coded logs
4. Press Ctrl+C to stop everything gracefully
5. Use `overmind restart worker` to restart just the worker during development

### When to Choose This

Choose Overmind if you:
- Want fine-grained control over individual processes
- Value the ability to connect to and debug specific processes
- Like the idea of each process in its own tmux session
- Want a battle-tested solution used in production by many teams
- Appreciate clean, minimal configuration

---

## Option 2: Docker Compose

### What is it?

[Docker Compose](https://docs.docker.com/compose/) is Docker's official tool for defining and running multi-container applications. While primarily designed for containerized apps, it can also manage mixed containerized and non-containerized processes.

### How it works

Define your services in a `docker-compose.yml` file. For services that shouldn't be containerized (like your Next.js app with hot reload and Doppler secrets), you can use host-mode or run them alongside Compose.

**Option A: Hybrid approach (Recommended for this use case)**

```yaml
# docker-compose.yml
version: '3.8'

services:
  pubsub-emulator:
    image: messagebird/gcloud-pubsub-emulator:latest
    ports:
      - "8681:8681"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8681"]
      interval: 10s
      timeout: 5s
      retries: 5
```

Plus a `Procfile` for the Node processes:

```procfile
worker: cd cloud-functions/clone-program && PORT=8082 doppler run --config dev_personal -- npm run dev
web: doppler run --config dev_personal -- npm run dev
```

Wrapper script `dev.sh`:

```bash
#!/bin/bash
docker compose up -d pubsub-emulator
overmind start
docker compose down
```

**Option B: Full containerization**

Containerize everything, but this requires:
- Dockerfile for Next.js app with hot reload
- Dockerfile for worker
- Mounting Doppler secrets or using env files
- More complex setup

### Installation

```bash
# macOS (Docker Desktop includes Compose)
brew install --cask docker

# Verify
docker compose version
```

### Single Command

```bash
# Option A (Hybrid)
./dev.sh

# Option B (Full containerization)
docker compose up
```

### Pros

- **Industry standard**: Docker Compose is ubiquitous in modern development
- **Container isolation**: Pub/Sub emulator runs in its own container (already doing this)
- **Portable**: Easy to share and reproduce across team members
- **Healthchecks**: Built-in health monitoring for services
- **Network management**: Automatic service discovery and networking
- **Official Docker tool**: Well-documented, actively maintained

### Cons

- **Overkill for non-containerized apps**: Next.js and worker don't need containerization for local dev
- **Doppler integration complexity**: Mounting secrets into containers adds complexity
- **Hot reload challenges**: Node.js apps with file watching work better on host
- **Resource overhead**: Running everything in containers uses more memory
- **Slower startup**: Container initialization adds latency
- **More configuration**: Requires Dockerfiles, volume mounts, network setup

### When to Choose This

Choose Docker Compose if you:
- Plan to containerize your entire stack eventually
- Want consistency between local dev and production
- Have team members on different operating systems
- Need strict service isolation
- Are comfortable with Docker and containerization concepts

**For this specific project**: Docker Compose is less ideal because you're already running the Pub/Sub emulator in Docker, but containerizing Next.js and the worker adds unnecessary complexity without clear benefits for local development.

---

## Option 3: npm Scripts with Concurrently

### What is it?

[Concurrently](https://www.npmjs.com/package/concurrently) is a lightweight npm package that runs multiple npm scripts or shell commands in parallel. It's simple, JavaScript-native, and requires minimal setup.

### How it works

Add `concurrently` as a dev dependency and create npm scripts that run all processes:

```json
// package.json
{
  "scripts": {
    "dev": "concurrently --kill-others --names 'pubsub,worker,web' --prefix-colors 'blue,magenta,green' \"npm run dev:pubsub\" \"npm run dev:worker\" \"npm run dev:web\"",
    "dev:pubsub": "docker run --rm -p 8681:8681 messagebird/gcloud-pubsub-emulator:latest",
    "dev:worker": "cd cloud-functions/clone-program && PORT=8082 doppler run --config dev_personal -- npm run dev",
    "dev:web": "doppler run --config dev_personal -- npm run dev"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

### Installation

```bash
npm install --save-dev concurrently
```

### Single Command

```bash
npm run dev
```

### Process Management

```bash
# Start all processes
npm run dev

# Stop all processes
# Press Ctrl+C (concurrently will kill all child processes)
```

### Pros

- **Minimal setup**: Just install one npm package and add scripts
- **JavaScript-native**: No external tools or languages required
- **Color-coded output**: Each process gets its own color
- **Familiar**: Uses npm scripts, which developers already know
- **Cross-platform**: Works on macOS, Linux, and Windows
- **Lightweight**: No additional runtime dependencies
- **Kill-others flag**: Automatically stops all processes if one fails
- **Project-portable**: Lives in `package.json`, shared via git

### Cons

- **No individual process control**: Can't restart just one process
- **Terminal-only**: No tmux sessions or advanced process management
- **Limited restart logic**: No built-in auto-restart on crash
- **Log interleaving**: All output in one stream (though color-coded)
- **Less flexible**: Harder to interact with individual processes
- **npm script in root only**: Worker needs separate handling or complex script paths

### Example Workflow

1. Add `concurrently` to `devDependencies`
2. Create npm scripts for each process
3. Run `npm run dev`
4. All services start with color-coded output
5. Press Ctrl+C to stop everything

### When to Choose This

Choose Concurrently if you:
- Want the simplest possible solution
- Don't need to interact with individual processes during development
- Prefer keeping everything in `package.json`
- Want minimal external dependencies
- Value simplicity over advanced features
- Are okay with restarting everything to fix one process

---

## Alternative Consideration: Ansible

Since you mentioned familiarity with Ansible, here's a brief assessment:

### Why Ansible is NOT recommended for this use case

- **Overkill**: Ansible is designed for infrastructure provisioning and configuration management, not local process orchestration
- **Wrong abstraction**: You don't need idempotency, remote execution, or state management
- **Complexity**: Requires playbooks, inventory files, and Ansible installation
- **Poor fit**: Ansible doesn't handle long-running foreground processes well
- **No interactive control**: Can't easily restart individual processes
- **Development friction**: Too heavyweight for a simple "start my dev environment" task

### When Ansible WOULD make sense

- Setting up initial development environment (install Docker, Node.js, Doppler, etc.)
- Provisioning cloud infrastructure
- Configuring production servers
- One-time setup tasks across multiple machines

For ongoing, interactive, multi-process local development, process managers like Overmind or simple tools like Concurrently are far better suited.

---

## Recommendation Matrix

| Criteria | Overmind | Docker Compose | Concurrently |
|----------|----------|----------------|--------------|
| **Ease of setup** | Medium | Medium/High | Easy |
| **Process control** | Excellent | Good | Minimal |
| **Graceful shutdown** | Excellent | Excellent | Good |
| **Hot reload support** | Excellent | Fair | Excellent |
| **Doppler integration** | Seamless | Complex | Seamless |
| **Learning curve** | Medium | Medium | Low |
| **Resource usage** | Low | Medium/High | Low |
| **Restart individual process** | Yes | Yes | No |
| **Color-coded logs** | Yes | Yes | Yes |
| **macOS compatibility** | Excellent | Excellent | Excellent |

---

## Final Recommendation

### For this project: **Overmind** (Option 1)

**Reasoning:**

1. **Your current setup is already mixed**: One Docker container (Pub/Sub) and two host processes (Next.js + worker). Overmind handles this perfectly without forcing unnecessary containerization.

2. **Doppler integration**: Overmind runs commands on the host, so Doppler works exactly as it does now. No container secret mounting complexity.

3. **Hot reload**: Next.js and the worker run on the host with full file watching and hot reload capabilities.

4. **Process control**: During development, you'll often want to restart just the worker or just the Next.js app. Overmind makes this trivial.

5. **Minimal configuration**: One `Procfile` with 3 lines.

6. **macOS native**: Works perfectly with Homebrew, no compatibility issues.

### Quick Start with Overmind

```bash
# Install
brew install overmind tmux

# Create Procfile in project root
cat > Procfile << 'EOF'
pubsub: docker run --rm -p 8681:8681 messagebird/gcloud-pubsub-emulator:latest
worker: cd cloud-functions/clone-program && PORT=8082 doppler run --config dev_personal -- npm run dev
web: doppler run --config dev_personal -- npm run dev
EOF

# Start development
overmind start

# In another terminal, restart just the worker
overmind restart worker

# Stop everything
overmind stop
```

### Alternative: Start with Concurrently, upgrade to Overmind later

If you want the absolute simplest solution to get started:

1. Use **Concurrently** first (5 minutes to set up)
2. If you find yourself wanting to restart individual processes often, switch to **Overmind**

This gives you immediate productivity gains while keeping the option to upgrade later.

---

## Sources

- [Overmind GitHub Repository](https://github.com/DarthSim/overmind)
- [Overmind at Evil Martians](https://evilmartians.com/opensource/overmind)
- [Control Your Dev Processes with Overmind](https://pragmaticpineapple.com/control-your-dev-processes-with-overmind/)
- [Introducing Overmind and Hivemind](https://evilmartians.com/chronicles/introducing-overmind-and-hivemind)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Using Docker Compose for Node.js Development](https://www.cloudbees.com/blog/using-docker-compose-for-nodejs-development)
- [Node.js development with Docker and Docker Compose](https://nodejsdesignpatterns.com/blog/node-js-development-with-docker-and-docker-compose/)
- [Concurrently npm package](https://www.npmjs.com/package/concurrently)
- [How to Run Multiple NPM Scripts Using Concurrently](https://peoray.dev/blog/using-concurrently)
- [npm concurrently: Run Scripts, Commands Simultaneously](https://ioflood.com/blog/npm-concurrently/)
