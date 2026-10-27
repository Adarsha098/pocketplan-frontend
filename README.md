# PocketPlan – Personal Finance Tracker

## Introduction
PocketPlan is a personal finance tracking web application that helps users manage their income and expenses in one place. It displays the total balance, income, expenses, transaction history, and spending breakdown.

## Features
- User registration and login
- Add income and expense transactions
- View total income, expenses, and balance
- Categorize transactions
- View recent transactions
- Filter transactions by type and category
- Delete transactions
- Spending breakdown and monthly overview
- Responsive design for desktop and mobile devices

## Technology Stack
- **Frontend:** React.js, JavaScript, HTML, CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** Token-based authentication
- **Deployment:** Vercel (frontend), Render (backend)
- **Version Control:** GitHub

## Live Demo
- **Frontend:** https://personal-finance-tracker-nine-sand.vercel.app/
- **Backend Health Check:** https://personal-finance-tracker-api-xj9v.onrender.com/api/health

## GitHub Repositories
- **Frontend:** https://github.com/Adarsha098/pocketplan-frontend
- **Backend:** https://github.com/Adarsha098/pocketplan-backend

## How to Run Locally

### Prerequisites
Install Node.js and make sure MongoDB is configured.

### Frontend
1. Open a terminal in the `client` folder.
2. Install dependencies:
   `npm install`
3. Create a `.env` file with:
   `VITE_API_URL=http://localhost:5000/api`
4. Start the development server:
   `npm run dev`

### Backend
1. Open a terminal in the `server` folder.
2. Install dependencies:
   `npm install`
3. Configure the required environment variables in `.env`:
   - `PORT`
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLIENT_ORIGIN`
4. Start the server:
   `npm run dev`

Never upload `.env` files or secret keys to GitHub.

## Testing
The deployed application has been tested for:
- API connectivity
- User login
- Adding income and expense transactions
- Balance calculations
- Deleting transactions
- Transaction persistence after refreshing the page

## Screenshots
Screenshots of the dashboard, transaction form, spending breakdown, and transaction history will be added here.

## Conclusion
PocketPlan is a practical project for learning frontend development, backend APIs, database integration, authentication, and deployment.

## Author
Adarsha Valli
