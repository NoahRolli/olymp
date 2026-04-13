# Olymp – Self-Hosted Home Server Infrastructure

A fully self-hosted, security-hardened home server running on a Lenovo ThinkCentre M920q. Features a custom-built monitoring dashboard, encrypted external storage, VPN remote access, IoT network segmentation, and a two-tier authentication system.

Built from scratch as a hands-on learning project in Linux system administration, networking, containerization, and full-stack development.

![Dashboard Login](docs/screenshots/login.png)

---

## Architecture

```
Internet (Dynamic IP via DDNS)
  │
  │  DDNS: *.duckdns.org
  │
ISP Router (Bridge/DMZ mode)
  │
Aigis – Ubiquiti Cloud Gateway Ultra
  │  WireGuard VPN Server (Port 51820)
  │  Inter-VLAN Firewall Rules
  │
  ├── Main LAN (192.168.0.0/24)
  │     └── Olymp Server (192.168.0.10)
  │           ├── Port 8000: Olymp Dashboard (Docker)
  │           └── Port 8001: Pallas App (Docker)
  │
  ├── IoT VLAN (192.168.20.0/24, VLAN 20)
  │     └── Isolated – No internet, no LAN access
  │
  └── VPN Subnet (192.168.2.0/24)
        └── Remote access from anywhere
```

## Security Layers

| Layer | Implementation |
|---|---|
| Disk Encryption | LUKS full-disk encryption (internal SSD + external vault) |
| SSH Hardening | Key-only auth, custom port, no root login, no password auth |
| Firewall | UFW with strict allow-list |
| Brute-Force Protection | fail2ban (3 attempts → 1h ban) |
| Auto-Updates | unattended-upgrades for security patches |
| BIOS Lock | Password protected, USB/network boot disabled |
| VPN | WireGuard tunnel via gateway (no exposed SSH port) |
| Network Segmentation | IoT VLAN isolated from main LAN |
| App-Level Auth | Two-tier bcrypt + JWT authentication |
| CORS | Restricted to LAN/VPN subnets only |

## Dashboard

A custom-built monitoring dashboard with two-tier authentication:

**Tier 1 – Dashboard Login:**
- Protects all dashboard views (system stats, Docker, network)
- bcrypt password hashing (cost factor 12)
- JWT tokens in httponly cookies (XSS-safe)
- Rate limiting: 5 failed attempts → 15 min lockout
- 8-hour session duration

**Tier 2 – Vault Access:**
- Separate password for the encrypted file manager
- 15-minute auto-lock with countdown timer
- Visual warnings (green → yellow → red) as session expires

### Features

- **System Monitor** – CPU, RAM, temperature, disk usage (live polling)
- **Docker Overview** – Container status, images, ports
- **Network Info** – Interface IPs, VPN status
- **Server Inventory** – Hardware specs, installed services, Docker containers
- **File Manager** – Browse, upload (drag & drop), download, rename, delete files on encrypted vault
- **File Preview** – View images and text files directly in the browser
- **Theme System** – HUD (futuristic cyan) and Professional (clean teal) themes

## Tech Stack

### Server
- **OS:** Ubuntu Server 24.04 LTS
- **Containers:** Docker + Docker Compose v2
- **VPN:** WireGuard (via Ubiquiti gateway)
- **DDNS:** DuckDNS (5-min cron update)
- **Monitoring:** fail2ban, UFW

### Dashboard Backend
- **Framework:** FastAPI (Python 3.12)
- **Auth:** bcrypt + PyJWT
- **Architecture:** Routers → Services → Models (clean separation)
- **Container:** Python 3.12-slim Docker image

### Dashboard Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4 + Custom CSS Properties (Pallas Design System)
- **Themes:** Dual theme support via CSS custom properties

### Networking
- **Gateway:** Ubiquiti Cloud Gateway Ultra
- **Access Point:** Ubiquiti U7 Lite
- **VPN:** WireGuard (multi-client: laptop + mobile)
- **VLANs:** Main LAN + IoT (isolated)

## Project Structure

```
olymp-dashboard/
├── app/
│   ├── main.py                  # FastAPI app + router registration
│   ├── config.py                # Settings, paths, env variables
│   ├── routers/
│   │   ├── auth.py              # Login, vault unlock, logout, status
│   │   ├── system.py            # Health, system stats, inventory
│   │   ├── docker.py            # Container overview
│   │   ├── network.py           # Network interfaces
│   │   └── files.py             # File CRUD, upload, download, preview
│   ├── services/
│   │   ├── auth_service.py      # bcrypt verification, JWT, rate limiting
│   │   ├── system_service.py    # CPU, RAM, disk, temperature
│   │   ├── inventory_service.py # Hardware, containers, services
│   │   ├── docker_service.py    # Docker socket communication
│   │   ├── network_service.py   # Network interface data
│   │   └── file_service.py      # Secure file operations
│   ├── middleware/
│   │   └── auth.py              # FastAPI dependencies (require_dashboard, require_vault)
│   └── models/
│       └── schemas.py           # Pydantic models
├── frontend-dist/               # Built React frontend (served by FastAPI)
├── scripts/
│   └── setup_auth.py            # Interactive password setup (passwords never touch disk)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## Getting Started

### Prerequisites
- Linux server (tested on Ubuntu 24.04 LTS)
- Docker + Docker Compose v2
- Node.js 18+ (for building frontend)
- Python 3.12+

### 1. Clone the repository
```bash
git clone https://github.com/NoahRolli/olymp.git
cd olymp
```

### 2. Set up authentication
```bash
sudo python3 scripts/setup_auth.py
```
This interactively prompts for two passwords (dashboard + vault). Passwords are hashed with bcrypt and stored in `/etc/olymp/auth.json` with `600` permissions. **No plaintext passwords ever touch disk.**

### 3. Build the frontend
```bash
cd frontend
npm install
npm run build
cp -r dist/* ../frontend-dist/
cd ..
```

### 4. Start the dashboard
```bash
docker compose up -d --build
```

### 5. Access
- Local: `http://<server-ip>:8000`
- Remote: Connect via WireGuard VPN, then same URL

## Security Notes

- Auth hashes are stored in `/etc/olymp/auth.json` (not in the repo)
- JWT secrets are generated cryptographically during setup
- Passwords are input via `getpass` (no echo, no shell history)
- The vault (encrypted external SSD) requires manual unlock after each server reboot
- All API routes are protected; unauthenticated requests receive `401`/`403`
- File operations are sandboxed – path traversal outside the vault is blocked

## Naming Convention

All components follow a Greek/Roman mythology naming scheme:

| Name | Component |
|---|---|
| Olymp | Home server (Lenovo ThinkCentre M920q) |
| Aigis | Network gateway (Ubiquiti Cloud Gateway Ultra) |
| Tresor | Encrypted external SSD (Samsung T7 Shield) |
| Prometheus | Server username |
| Hermes | VPN client (laptop) |
| Pallas | Personal app + MacBook |

## Roadmap

- [x] Ubuntu Server with LUKS full-disk encryption
- [x] SSH hardening + fail2ban + UFW
- [x] Docker containerization
- [x] WireGuard VPN remote access
- [x] IoT VLAN with firewall isolation
- [x] DDNS (DuckDNS)
- [x] Dashboard with system monitoring
- [x] Two-tier authentication (bcrypt + JWT)
- [x] File Manager with upload, download, rename, preview
- [x] Server inventory display
- [ ] Zigbee2MQTT integration (IKEA Kajplats smart lighting)
- [ ] Docker container start/stop via dashboard
- [ ] Log viewer in dashboard
- [ ] System alerts (temperature, disk space)

## License

This project is for personal and educational use. Feel free to use it as inspiration for your own homelab setup.

---

*Built with curiosity, caffeine, and a Lenovo ThinkCentre M920q.*
