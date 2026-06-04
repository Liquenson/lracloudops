# Uptime Monitoring — lracloudops.com

## Cloudflare Health Checks

Cloudflare provides built-in uptime monitoring via the dashboard under **Traffic → Health Checks** (available on Pro plan and above) or via **Notifications** on the Free plan.

### Steps to configure

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) and select the `lracloudops.com` zone.
2. Go to **Traffic → Health Checks** (or **Notifications** on Free).
3. Click **Create** and fill in:
   - **Name:** `lracloudops-uptime`
   - **URL:** `https://lracloudops.com/`
   - **Type:** `HTTP`
   - **Method:** `GET`
   - **Expected status code:** `200`
   - **Check interval:** `60` seconds
   - **Consecutive failures before alert:** `2`

### Downtime email alerts

1. In the Cloudflare dashboard go to **Notifications → Create**.
2. Select **Health Check Status Change** as the notification type.
3. Add your email address (`info@lracloudops.com`) as the delivery destination.
4. Link it to the `lracloudops-uptime` health check created above.
5. Save — you will receive an email whenever the site goes down or recovers.

### Free-plan alternative (UptimeRobot)

If on the Cloudflare Free plan, use [UptimeRobot](https://uptimerobot.com) (free tier):

1. Create a new monitor: **HTTP(s)** type, URL `https://lracloudops.com/`.
2. Set check interval to **5 minutes**.
3. Add an email alert contact (`info@lracloudops.com`).
4. Optionally add a status page for public visibility.

## Verification URL

Primary health check endpoint: `https://lracloudops.com/`

Expected response: HTTP 200, HTML content containing `LRA Cloud Ops`.

## Additional pages to monitor

| URL | Purpose |
|-----|---------|
| `https://lracloudops.com/contact` | Contact form availability |
| `https://lracloudops.com/assessment` | DevOps assessment tool |
| `https://lracloudops.com/es` | Spanish homepage |
