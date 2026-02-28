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

## Development

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## License

Open source.
