This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This frontend expects the backend API to be running (by default at `http://localhost:4000/api`).

### 1) Start backend + database

From the repository root:

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

### Optional: enable OTP emails via Gmail SMTP

Set these variables in `backend/.env` and restart the backend:

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="1"
SMTP_USER="your@gmail.com"
SMTP_PASS="YOUR_16_CHAR_APP_PASSWORD"
SMTP_FROM="your@gmail.com"
SMTP_FROM_NAME="SecRep"
```

For Gmail you must use an App Password (Google account → 2FA → App passwords). Your normal Gmail password will not work.

### 2) Start frontend

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Optional: configure API URL

Set `NEXT_PUBLIC_API_URL` to point to your backend, for example:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
