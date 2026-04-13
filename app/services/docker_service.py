import json
import socket as sock
import http.client


class UnixSocketHTTPConnection(http.client.HTTPConnection):
    def __init__(self, socket_path: str):
        super().__init__("localhost")
        self.socket_path = socket_path

    def connect(self):
        self.sock = sock.socket(sock.AF_UNIX, sock.SOCK_STREAM)
        self.sock.connect(self.socket_path)


def get_containers(socket_path: str = "/var/run/docker.sock") -> list[dict]:
    conn = UnixSocketHTTPConnection(socket_path)
    conn.request("GET", "/containers/json?all=true")
    response = conn.getresponse()
    data = json.loads(response.read().decode())
    conn.close()

    containers = []
    for c in data:
        containers.append({
            "name": c["Names"][0].strip("/"),
            "status": c["Status"],
            "state": c["State"],
            "image": c["Image"],
        })
    return containers