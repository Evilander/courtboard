#!/usr/bin/env bash
# CourtBoard — Raspberry Pi 5 Kiosk Setup Script
# Configures a Pi to boot directly into Chromium displaying a CourtBoard screen.
#
# Usage:
#   curl -sSL <raw-github-url>/scripts/pi-setup.sh | bash -s -- \
#     --url http://courtboard.local:3000/display/lobby-main
#
# Or run locally:
#   chmod +x scripts/pi-setup.sh
#   ./scripts/pi-setup.sh --url http://10.0.1.50:3000/display/courtroom-1

set -euo pipefail

DISPLAY_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      DISPLAY_URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$DISPLAY_URL" ]]; then
  echo "Usage: $0 --url <courtboard-display-url>"
  echo "Example: $0 --url http://10.0.1.50:3000/display/lobby-main"
  exit 1
fi

echo "==> CourtBoard Pi Kiosk Setup"
echo "    Display URL: $DISPLAY_URL"
echo ""

# Update system
echo "==> Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Install required packages
echo "==> Installing kiosk dependencies..."
sudo apt-get install -y -qq \
  chromium-browser \
  unclutter \
  xdotool \
  xserver-xorg \
  x11-xserver-utils

# Disable screen blanking and power management
echo "==> Disabling screen blanking..."
sudo tee /etc/X11/xorg.conf.d/10-blanking.conf > /dev/null <<XCONF
Section "ServerFlags"
    Option "BlankTime" "0"
    Option "StandbyTime" "0"
    Option "SuspendTime" "0"
    Option "OffTime" "0"
EndSection
XCONF

# Create the kiosk launch script
echo "==> Creating kiosk launcher..."
mkdir -p /home/pi/.config/courtboard
cat > /home/pi/.config/courtboard/kiosk.sh <<KIOSK
#!/usr/bin/env bash
# CourtBoard Kiosk Launcher

# Wait for X to be ready
sleep 3

# Disable screen saver and DPMS
xset s off
xset s noblank
xset -dpms

# Hide cursor after 0.5 seconds of inactivity
unclutter -idle 0.5 -root &

# Launch Chromium in kiosk mode
chromium-browser \\
  --noerrdialogs \\
  --disable-infobars \\
  --kiosk \\
  --disable-session-crashed-bubble \\
  --disable-component-update \\
  --check-for-update-interval=31536000 \\
  --autoplay-policy=no-user-gesture-required \\
  --disable-features=TranslateUI \\
  --disable-pinch \\
  --overscroll-history-navigation=0 \\
  --disable-restore-session-state \\
  --disk-cache-size=104857600 \\
  "$DISPLAY_URL" &

# Monitor and restart Chromium if it crashes
while true; do
  sleep 30
  if ! pgrep -x chromium-browser > /dev/null; then
    echo "\$(date): Chromium crashed, restarting..." >> /home/pi/.config/courtboard/crash.log
    chromium-browser \\
      --noerrdialogs \\
      --disable-infobars \\
      --kiosk \\
      --disable-session-crashed-bubble \\
      --disable-component-update \\
      --check-for-update-interval=31536000 \\
      --autoplay-policy=no-user-gesture-required \\
      --disable-features=TranslateUI \\
      --disable-pinch \\
      --overscroll-history-navigation=0 \\
      --disable-restore-session-state \\
      --disk-cache-size=104857600 \\
      "$DISPLAY_URL" &
  fi
done
KIOSK
chmod +x /home/pi/.config/courtboard/kiosk.sh

# Create systemd service for autostart
echo "==> Creating systemd kiosk service..."
sudo tee /etc/systemd/system/courtboard-kiosk.service > /dev/null <<SERVICE
[Unit]
Description=CourtBoard Kiosk Display
After=graphical.target
Wants=graphical.target

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
ExecStart=/home/pi/.config/courtboard/kiosk.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=graphical.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable courtboard-kiosk.service

# Configure auto-login to desktop
echo "==> Enabling auto-login..."
sudo raspi-config nonint do_boot_behaviour B4 2>/dev/null || true

# Set timezone (adjust for your courthouse)
echo "==> Setting timezone to America/Chicago..."
sudo timedatectl set-timezone America/Chicago

echo ""
echo "==> CourtBoard kiosk setup complete!"
echo "    The Pi will boot directly into the display at:"
echo "    $DISPLAY_URL"
echo ""
echo "    Reboot now to start: sudo reboot"
echo ""
echo "    To change the URL later, edit:"
echo "    /home/pi/.config/courtboard/kiosk.sh"
echo ""
echo "    To check status:"
echo "    sudo systemctl status courtboard-kiosk"
