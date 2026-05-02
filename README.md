# Parking Latte - Coffee Ordering System

A premium, full-stack coffee shop management application designed for speed, beauty, and operational efficiency.

## 🚀 Features
- **Customer Portal**: Minimalist digital menu, easy ordering, and real-time status tracking.
- **Barista Dashboard**: Real-time order queue with live Socket.io updates.
- **Admin Suite**: Inventory monitoring (with low-stock alerts), menu management, and sales analytics.
- **Automated Inventory**: Ingredient stocks are automatically deducted upon order placement.
- **Role-Based Auth**: Secure JWT-based access for Customers, Staff, and Admins.

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Recharts.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: MySql (ORM via Prisma).
- **Icons**: Lucide React.

## 📂 Project Structure
- `/src/server`: Backend routes, controllers, and database logic.
- `/src/pages`: Individual dashboard and portal views.
- `/src/context`: React context for Auth and Cart state.
- `/src/components`: Reusable UI elements (Layout, Cards, etc.).
- `/prisma`: Database schema and migration settings.

## 🔨 Setup & Installation
1. **Database**: Create a MySQL instance (e.g., [Aiven](https://aiven.io/mysql)).
2. **Environment**: Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GEMINI_API_KEY` (Optional, for AI features)
3. **Prisma**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

## 📝 Initial Data Script
Run these commands in your MySQL console once connected to seed the first items:

```sql
INSERT INTO Category (id, name) VALUES (UUID(), 'Espresso Bars'), (UUID(), 'Pastries');
-- More data can be added via the Admin Dashboard.
```

## 🌐 Deployment
Refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for Render + Aiven instructions.
