import socket
import urllib.parse
import ipaddress
from typing import Tuple

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("10.0.0.0/8"),       # Private RFC1918
    ipaddress.ip_network("172.16.0.0/12"),    # Private RFC1918
    ipaddress.ip_network("192.168.0.0/16"),   # Private RFC1918
    ipaddress.ip_network("169.254.0.0/16"),   # Link-local & AWS/GCP Metadata
    ipaddress.ip_network("0.0.0.0/8"),       # Current network
    ipaddress.ip_network("100.64.0.0/10"),    # Carrier-grade NAT
    ipaddress.ip_network("192.0.2.0/24"),     # TEST-NET-1
    ipaddress.ip_network("198.51.100.0/24"),  # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),   # TEST-NET-3
    ipaddress.ip_network("::1/128"),          # IPv6 Loopback
    ipaddress.ip_network("fe80::/10"),        # IPv6 Link-local
    ipaddress.ip_network("fc00::/7"),         # IPv6 Unique Local Address
]

ALLOWED_SCHEMES = {"http", "https"}
ALLOWED_PORTS = {80, 443}


class SSRFValidationError(ValueError):
    """Raised when a URL violates SSRF security policy."""
    pass


class SSRFValidator:
    @staticmethod
    def validate_url(url_str: str, allow_http: bool = True) -> Tuple[str, str, int]:
        """
        Validates an outbound HTTP/HTTPS URL against SSRF security policies.
        Resolves hostname to IP and verifies it is not a private, loopback, or cloud metadata address.
        Returns tuple: (clean_url, resolved_ip, port)
        """
        if not url_str or not isinstance(url_str, str):
            raise SSRFValidationError("URL must be a non-empty string.")

        clean_url = url_str.strip()
        if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
            clean_url = "https://" + clean_url

        parsed = urllib.parse.urlparse(clean_url)

        if parsed.scheme.lower() not in ALLOWED_SCHEMES:
            raise SSRFValidationError(f"Invalid URL scheme '{parsed.scheme}'. Only http and https are allowed.")

        if not allow_http and parsed.scheme.lower() == "http":
            raise SSRFValidationError("HTTP scheme is disabled. Only HTTPS is permitted.")

        hostname = parsed.hostname
        if not hostname:
            raise SSRFValidationError("URL does not contain a valid hostname.")

        hostname_lower = hostname.lower()
        if hostname_lower in {"localhost", "metadata.google.internal", "kubernetes.default.svc"}:
            raise SSRFValidationError(f"Access to internal hostname '{hostname}' is blocked.")

        # Determine port
        port = parsed.port
        if not port:
            port = 443 if parsed.scheme.lower() == "https" else 80

        if port not in ALLOWED_PORTS:
            raise SSRFValidationError(f"Access to non-standard port {port} is blocked by SSRF policy.")

        # Resolve DNS hostname to IP address
        try:
            addr_info = socket.getaddrinfo(hostname, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
            if not addr_info:
                raise SSRFValidationError(f"Could not resolve hostname '{hostname}'.")
        except socket.gaierror as e:
            raise SSRFValidationError(f"DNS resolution failed for '{hostname}': {e}")

        # Check each resolved IP address
        resolved_ips = set()
        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            resolved_ips.add(ip_str)
            try:
                ip_obj = ipaddress.ip_address(ip_str)
            except ValueError:
                raise SSRFValidationError(f"Invalid IP address resolved: {ip_str}")

            for blocked_net in BLOCKED_IP_NETWORKS:
                if ip_obj in blocked_net:
                    raise SSRFValidationError(
                        f"SSRF Policy Violation: Hostname '{hostname}' resolved to blocked IP {ip_str} "
                        f"in range {blocked_net}."
                    )

        return clean_url, list(resolved_ips)[0], port
