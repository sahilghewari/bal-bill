# Telecom Billing System - Frontend

React + Vite + Tailwind CSS admin dashboard for telecom billing management.

## Features

- 🎨 Modern responsive UI with Tailwind CSS
- 🔐 Secure authentication and authorization
- 💳 Stripe payment integration
- 📊 Advanced analytics and reporting
- 📱 Mobile-friendly design
- ⚡ Fast development with Vite
- 🎯 Comprehensive billing management

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Visit http://localhost:5173

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Project Structure

```
src/
├── components/ # Reusable components
│   ├── common/ # UI components (Button, Input, Card, etc.)
│   ├── dashboard/ # Dashboard components
│   ├── layout/ # Layout components (Sidebar, Header, etc.)
│   ├── customers/ # Customer-related components
│   ├── billing/ # Billing components
│   ├── payment/ # Payment components
│   ├── rateCards/ # Rate card components
│   └── analytics/ # Analytics components
├── pages/ # Page components
├── context/ # React Context (global state)
├── hooks/ # Custom hooks
├── services/ # API services
├── utils/ # Utility functions
├── styles/ # Global styles
├── App.jsx # Root component
└── main.jsx # Entry point
```

## API Integration

Frontend communicates with backend API at:

- Development: `http://localhost:5000/api`
- Production: Set via `VITE_API_URL` env variable

## Environment Variables

Create `.env` file:

```
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key
```

## Key Pages

### Dashboard

- Overview metrics
- Revenue trends
- Quick actions

### Customers

- Customer list with pagination
- Customer detail view
- Create/edit customers
- Balance management
- Rate card configuration

### Invoices

- Invoice list with filters
- Invoice detail view
- Generate invoices
- Record payments

### Payments

- Stripe payment processing
- Payment method management
- Transaction history

### Analytics

- Revenue analytics
- Payment performance
- Usage statistics
- Exportable reports

### Settings

- User profile management
- System configuration
- Notification preferences

## Authentication

Login required. Demo credentials:

- Email: admin@example.com
- Password: password123

## Build & Deployment

### Production Build

```bash
npm run build:prod
```

### Docker Deployment

```bash
docker build -t telecom-billing-frontend .
docker run -p 3000:80 telecom-billing-frontend
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## Performance

- Vite for fast development and optimized production builds
- Code splitting for faster initial load
- Lazy loading for pages and components
- Image optimization
- CSS minification

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create feature branch
2. Make changes
3. Run `npm run lint` and `npm run format`
4. Submit pull request

## License

MIT
