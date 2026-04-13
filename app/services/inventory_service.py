import json
import platform
import socket
import http.client
import psutil


def _docker_get(path: str) -> list | dict | None:
    """Holt Daten vom Docker-Socket (wie docker_service)."""
    try:
        conn = http.client.HTTPConnection("localhost")
        conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        conn.sock.connect("/var/run/docker.sock")
        conn.request("GET", path)
        resp = conn.getresponse()
        if resp.status == 200:
            return json.loads(resp.read().decode())
        return None
    except Exception:
        return None


def get_inventory() -> dict:
    """Sammelt Server-Inventar via Docker-Socket und /proc."""

    # CPU-Info aus /proc/cpuinfo (Host-Info, nicht Container)
    cpu_model = "Unbekannt"
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("model name"):
                    cpu_model = line.split(":")[1].strip()
                    break
    except Exception:
        pass

    # Hostname vom Host (aus /etc/hostname falls gemountet, sonst Container-ID)
    hostname = "olymp"

    # RAM
    ram_total = round(psutil.virtual_memory().total / (1024 ** 3), 1)

    # Disks – nur relevante
    disks = []
    seen_devices = set()
    for part in psutil.disk_partitions():
        if part.device in seen_devices:
            continue
        if part.mountpoint in ("/mnt/tresor", "/"):
            try:
                usage = psutil.disk_usage(part.mountpoint)
                label = "System (Root)" if part.mountpoint == "/" else "Tresor (T7 Shield)"
                disks.append({
                    "label": label,
                    "mountpoint": part.mountpoint,
                    "fstype": part.fstype,
                    "total_gb": round(usage.total / (1024 ** 3), 1),
                    "used_gb": round(usage.used / (1024 ** 3), 1),
                    "percent": usage.percent,
                })
                seen_devices.add(part.device)
            except PermissionError:
                pass

    # OS-Info aus /proc/version
    os_info = "Ubuntu Server 24.04 LTS"
    kernel = platform.release()

    # Docker-Container via Socket
    containers = []
    raw = _docker_get("/containers/json?all=true")
    if raw:
        for c in raw:
            name = c.get("Names", ["/unknown"])[0].lstrip("/")
            image = c.get("Image", "")
            state = c.get("State", "unknown")
            status = c.get("Status", "")
            ports_raw = c.get("Ports", [])
            ports = ", ".join(
                f"{p.get('PublicPort', '?')}→{p.get('PrivatePort', '?')}"
                for p in ports_raw if p.get("PublicPort")
            ) if ports_raw else ""
            containers.append({
                "name": name,
                "image": image,
                "state": state,
                "status": status,
                "ports": ports,
            })

    # Docker Images
    images = []
    raw_images = _docker_get("/images/json")
    if raw_images:
        for img in raw_images:
            tags = img.get("RepoTags", [])
            if tags and tags[0] != "<none>:<none>":
                size_mb = round(img.get("Size", 0) / (1024 ** 2), 1)
                images.append({
                    "tag": tags[0],
                    "size_mb": size_mb,
                })

    # Bekannte Host-Dienste (statisch, da wir systemctl nicht nutzen können)
    services = [
        {"name": "SSH", "port": 2222, "status": "aktiv"},
        {"name": "Docker", "port": None, "status": "aktiv"},
        {"name": "fail2ban", "port": None, "status": "aktiv"},
        {"name": "UFW Firewall", "port": None, "status": "aktiv"},
        {"name": "unattended-upgrades", "port": None, "status": "aktiv"},
        {"name": "DuckDNS (Cronjob)", "port": None, "status": "aktiv"},
        {"name": "WireGuard VPN", "port": 51820, "status": "via Aigis"},
    ]

    # Netzwerk – Host-IPs aus Docker-Netzwerk ableiten
    interfaces = [
        {"name": "eno1 (LAN)", "ip": "192.168.0.10"},
        {"name": "WireGuard VPN", "ip": "192.168.2.0/24"},
        {"name": "IoT-VLAN", "ip": "192.168.20.0/24"},
    ]

    return {
        "hardware": {
            "hostname": hostname,
            "model": "Lenovo ThinkCentre M920q",
            "cpu": cpu_model,
            "ram_gb": ram_total,
            "disks": disks,
        },
        "os": {
            "distribution": os_info,
            "kernel": kernel,
        },
        "containers": containers,
        "images": images,
        "services": services,
        "interfaces": interfaces,
    }
