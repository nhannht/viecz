# VPN Internal Services (*.larvartar)

## How it works
- Headscale MagicDNS resolves `*.larvartar` domains to `100.64.0.2` (server Tailscale IP)
- Caddy serves these in `/etc/caddy/sites/tailscale.caddy` bound to `100.64.0.2`

## Adding a new VPN service
1. Add Caddy site block in `/etc/caddy/sites/tailscale.caddy`
2. Add DNS record in Headscale config: `dns.extra_records` section
   - Config host path: `/home/ubuntu/apps/headscale/config/config.yaml`
   - Container mount is read-only — edit the host file directly
3. `docker restart headscale` to propagate DNS
4. `sudo systemctl reload caddy` to pick up new site

## Gotchas
- `caddy validate` may fail with Cloudflare token env var errors even when config is correct. `sudo systemctl reload caddy` works regardless.
- DNS propagation to clients takes a few seconds after Headscale restart.
