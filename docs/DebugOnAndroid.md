1) Android: Enable USB debugging
2) Connect USB cable
3) Ask Claude to add a scrollable debug-element to your app/component + to not log touch events on that specific element

● Yes! The easiest way is to access the dev server from your phone over your local network:

● Bash(ipconfig | grep -A 5 "Wireless\|Ethernet\|Wi-Fi" | grep "IPv4")
  ⎿     IPv4 Address. . . . . . . . . . . : 192.168.x.x
        IPv4 Address. . . . . . . . . . . : 172.28.x.x
        IPv4 Address. . . . . . . . . . . : 172.23.x.x

● Your local IP is 192.168.x.x. On your Android phone (connected to the same WiFi):

  1. Open Chrome and go to: http://192.168.x.x:4200/advanced/scheduler

  If that doesn't work, the dev server might only be bound to localhost. You'd need to restart it with:

  npx nx serve demo --host 0.0.0.0

  Or, if you have your phone connected via USB with Developer Mode and USB Debugging enabled:

  1. Open chrome://inspect on your PC's Chrome
  2. Enable Port forwarding for port 4200
  3. Then on your phone, just go to http://localhost:4200/advanced/scheduler