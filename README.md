# Gemba Filesend

Secure, client-side encrypted file sharing. Upload files with AES-128-GCM encryption in your browser, share a link, and let your recipient download and decrypt with ease. No accounts, no tracking, no compromises.

## Features

- **End-to-End Encryption** -- Files are encrypted with AES-128-GCM before leaving your browser. The server never sees your unencrypted data.
- **No Account Required** -- Start sharing immediately. No sign-up, no email verification, no personal data collected.
- **Password Protection** -- Optionally require a password for an extra layer of security.
- **Auto-Expiring Links** -- Set download limits (1--100) and expiry times (1--168 hours). Files are automatically deleted after conditions are met.
- **Large File Support** -- Upload files up to 15 GB. Directory uploads are automatically archived.
- **Fast Transfers** -- Streaming architecture for fast uploads and downloads with minimal memory footprint.
- **Dark / Light Theme** -- Follows your system preference with a manual toggle.
- **QR Code Sharing** -- Share download links via QR code for quick mobile access.

## Tech Stack

Next.js 16 | React 19 | TypeScript | Tailwind CSS 4 | shadcn/ui | Radix UI | Lucide Icons

---

## User Manual

### For Uploaders (Sending Files)

#### 1. Open the Upload Page

Navigate to the app and click **Start Uploading** on the home page, or go directly to `/upload`.

#### 2. Select Files

- **Drag and drop** files onto the dropzone area, or **click** the dropzone to open a file browser.
- You can select **multiple files** at once.
- **Directories** are supported and will be automatically archived.
- Each selected file shows its name and size. To remove a file, click the **X** button next to it.
- Maximum file size: **15 GB** per file.

#### 3. Configure Options

Below the file selection area, you can configure the following:

| Option | Description | Default | Range |
|---|---|---|---|
| **Password Protection** | Toggle the switch to require a password for downloading. When enabled, enter a strong password in the field that appears. | Off | -- |
| **Download Limit** | The number of times the file can be downloaded before it is automatically deleted. | 1 | 1--100 |
| **Expires After** | The number of hours before the file is automatically deleted, regardless of remaining downloads. | 24 hours | 1--168 (up to 1 week) |

#### 4. Upload

Click the **Upload** button at the bottom. A progress bar will display the encryption and upload status in real time.

- Files are **encrypted in your browser** using AES-128-GCM before any data is sent to the server.
- The upload button shows the number of files selected (e.g., "Upload 3 files").
- The button is disabled until at least one file is selected.

#### 5. Share the Link

After the upload completes, you will see:

- A **Share Link** containing a unique file ID and the encryption key (after the `#` symbol).
- **Copy Link** button -- copies the full link to your clipboard.
- **Upload More** button -- resets the form to upload additional files.
- Badges summarizing your settings: password protection status, download limit, and expiry time.

**Important:** The encryption key is embedded in the URL fragment (the part after `#`). This fragment is never sent to the server, so only someone with the full link can decrypt the file.

#### Sharing Tips

- Send the link through any channel: email, messaging app, etc.
- If you enabled password protection, share the password through a **separate channel** for best security (e.g., send the link via email and the password via text message).
- The link is self-contained. The recipient does not need an account.

---

### For Downloaders (Receiving Files)

#### 1. Open the Download Page

Click **Download a File** on the home page, go to `/download`, or simply open the share link you received. If you open the share link directly, it will take you to the download page automatically.

#### 2. Enter the Share Link

- Paste the full share link into the **Share Link** field.
- Click **Fetch File Info** (or press **Enter**) to retrieve the file details from the server.

#### 3. Review File Details

A preview card will show:

| Detail | Description |
|---|---|
| **File name** | The original name of the uploaded file. |
| **File size** | The size of the file (e.g., "24.7 MB"). |
| **File type** | The MIME type (e.g., "application/zip"). |
| **Downloads remaining** | How many times the file can still be downloaded before it expires. |
| **Expires in** | How much time is left before the file is automatically deleted. |
| **Password Required** | Shown if the uploader set a password. |
| **E2E Encrypted** | Confirms the file is end-to-end encrypted. |

#### 4. Enter Password (If Required)

If the file is password-protected, a password field will appear. Enter the password provided by the sender and press **Enter** or click the download button.

If you do not have the password, contact the person who sent you the link.

#### 5. Download and Decrypt

Click **Download & Decrypt**. The app will:

1. Download the encrypted file from the server.
2. Extract the decryption key from the URL fragment.
3. Decrypt the file in your browser using AES-128-GCM.
4. Save the decrypted file to your device.

A progress bar shows real-time download and decryption status.

#### 6. Completion

Once finished, you will see a **Download Complete** confirmation with the file name. Click **Download Another File** to return to the link input screen.

#### Troubleshooting

| Problem | Solution |
|---|---|
| "Invalid link" or file not found | The link may have expired or reached its download limit. Ask the sender for a new link. |
| Password error | Double-check the password. Passwords are case-sensitive. |
| Download does not start | Make sure you pasted the **complete** link, including the `#` fragment at the end. The fragment contains the decryption key. |
| Large file taking long | Large files take longer to download and decrypt. Keep the browser tab open until completion. |

---

## Security Model

1. **Client-side encryption**: Files are encrypted in the browser using AES-128-GCM before upload. The server only stores encrypted data.
2. **Key in URL fragment**: The decryption key is placed after the `#` in the share link. URL fragments are never sent to the server by browsers, so the server cannot decrypt your files.
3. **Optional password**: Adds a second factor. Even if someone intercepts the link, they cannot download without the password.
4. **Auto-deletion**: Files are deleted after the download limit is reached or the expiry time passes, whichever comes first.
5. **No tracking**: No accounts, no cookies for tracking, no personal data collection.

---

## Installation

### Prerequisites

Before you begin, make sure you have the following installed on your system:

| Requirement | Minimum Version | Check Command |
|---|---|---|
| **Node.js** | 18.0 or higher | `node --version` |
| **npm** | 9.0 or higher | `npm --version` |
| **Git** | any recent version | `git --version` |

> **Note:** You can use **yarn**, **pnpm**, or **bun** as alternatives to npm. The instructions below use npm, but equivalent commands are provided where they differ.

#### Installing Node.js

If you don't have Node.js installed:

- **macOS** (Homebrew): `brew install node`
- **macOS / Windows**: Download the installer from [nodejs.org](https://nodejs.org/)
- **Ubuntu / Debian**: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`
- **Fedora / RHEL**: `sudo dnf install nodejs`
- **Any OS** (nvm -- recommended for managing multiple versions):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
  nvm install 22
  nvm use 22
  ```

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/legoshin/gemba-filesend.git
cd gemba-filesend
```

Or, if you have a fork:

```bash
git clone https://github.com/<your-username>/gemba-filesend.git
cd gemba-filesend
```

---

### Step 2: Install Dependencies

```bash
npm install
```

<details>
<summary>Using other package managers</summary>

```bash
# yarn
yarn install

# pnpm
pnpm install

# bun
bun install
```

</details>

This installs all required packages listed in `package.json`, including Next.js, React, Tailwind CSS, shadcn/ui components, and all other dependencies.

---

### Step 3: Run the Development Server

```bash
npm run dev
```

<details>
<summary>Using other package managers</summary>

```bash
yarn dev
pnpm dev
bun dev
```

</details>

The app will start at **[http://localhost:3000](http://localhost:3000)**. Open this URL in your browser.

- The development server supports **hot reload** -- changes to source files are reflected instantly in the browser without a manual refresh.
- Press `Ctrl+C` in the terminal to stop the server.

---

### Step 4: Build for Production

When you are ready to deploy:

```bash
# Create an optimized production build
npm run build

# Start the production server
npm run start
```

The production server runs on **[http://localhost:3000](http://localhost:3000)** by default. To use a different port:

```bash
PORT=8080 npm run start
```

---

### Step 5: Lint the Code

Run ESLint to check for code quality issues:

```bash
npm run lint
```

---

### Deploying to Vercel

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push your code to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Next.js and configures the build. Click **Deploy**.
4. Your app will be live at a `*.vercel.app` URL within minutes.

No environment variables or special configuration is required.

---

### Deploying with Docker

You can containerize the app for deployment on any Docker-compatible platform:

```dockerfile
# Dockerfile
FROM node:22-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

> **Note:** To use standalone output with Docker, add `output: "standalone"` to `next.config.ts` first.

Build and run:

```bash
docker build -t gemba-filesend .
docker run -p 3000:3000 gemba-filesend
```

---

### Deploying to a VPS or Bare-Metal Server

For a self-hosted setup (e.g., on a Linux VPS):

```bash
# 1. Clone and install
git clone https://github.com/legoshin/gemba-filesend.git
cd gemba-filesend
npm ci

# 2. Build
npm run build

# 3. Run with a process manager (keeps the app running after you disconnect)
npm install -g pm2
pm2 start npm --name "gemba-filesend" -- start
pm2 save
pm2 startup   # follow the printed instructions to enable auto-start on reboot
```

To put it behind a reverse proxy (recommended for HTTPS), use **nginx** or **Caddy**:

<details>
<summary>Example nginx configuration</summary>

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 16G;
    }
}
```

Then enable HTTPS with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

</details>

<details>
<summary>Example Caddy configuration</summary>

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

Caddy handles HTTPS automatically.

</details>

---

### Project Structure

```
gemba-filesend/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Home / landing page
│   │   ├── layout.tsx         # Root layout with theme provider
│   │   ├── globals.css        # Global styles and CSS variables
│   │   ├── upload/
│   │   │   └── page.tsx       # Upload page
│   │   └── download/
│   │       └── page.tsx       # Download page
│   ├── components/
│   │   ├── file-dropzone.tsx  # Drag-and-drop file selector
│   │   ├── header.tsx         # Navigation header
│   │   ├── theme-provider.tsx # Dark/light theme wrapper
│   │   ├── theme-toggle.tsx   # Theme switch button
│   │   └── ui/               # shadcn/ui component library
│   └── lib/
│       └── utils.ts           # Utility functions
├── public/                    # Static assets
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── components.json            # shadcn/ui configuration
```

---

### Troubleshooting Installation

| Problem | Solution |
|---|---|
| `npm install` fails with permission errors | Don't use `sudo` with npm. Fix permissions: `npm config set prefix ~/.npm-global` and add `~/.npm-global/bin` to your PATH. Or use nvm. |
| `npm run dev` shows "port already in use" | Another process is using port 3000. Stop it or use a different port: `PORT=3001 npm run dev` |
| Node version too old | Upgrade Node.js to v18+. Check with `node --version`. |
| `next: command not found` | Run `npm install` first. Next.js runs via `npx` from `node_modules`, not as a global command. |
| Build fails with TypeScript errors | Run `npm run lint` to identify issues. Ensure all files in `src/` have valid TypeScript. |
| Styles not loading | Make sure `postcss.config.mjs` exists and contains the Tailwind plugin. Run `npm install` to ensure `@tailwindcss/postcss` is installed. |

## License

Open source.
