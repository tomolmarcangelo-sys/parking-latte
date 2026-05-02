# Deployment Guide

Follow these steps to deploy Parking Latte to **Render** and connect it to **Aiven MySql**.

## 1. Database Setup (Aiven)
1. Sign up/Login to [Aiven](https://aiven.io/).
2. Create a new **MySql** service (the free tier works great).
3. Once active, copy the **Service URI**. It should look like:
   `mysql://avnadmin:password@host:port/defaultdb?ssl-mode=REQUIRED`
4. Store this URL for the next step.

## 2. Deploy Backend (Render)
1. Sign up/Login to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
5. Add the following **Environment Variables**:
   - `DATABASE_URL`: Your Aiven MySql Service URI.
   - `JWT_SECRET`: A long random string.
   - `NODE_ENV`: `production`
   - `PORT`: `3000`

## 3. Post-Deployment
- Render will detect the `package.json` "type": "module" and run the server.
- The `server.ts` is configured to serve the static Vite build from `/dist` in production.
- Your app will be live at the provided `.onrender.com` URL.

## 4. Troubleshooting
- **Prisma Connection**: If Render fails to connect to Aiven, ensure Aiven's "Allowed IP Addresses" includes `0.0.0.0/0` (for testing) or look into Render's outbound IP ranges.
- **CORS**: The server uses `Origin: '*'` by default; tighten this to your Render URL for production security.
