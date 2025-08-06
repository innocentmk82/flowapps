# StockFlow - Inventory Management System

A modern, responsive inventory management system built with React, TypeScript, and Firebase.

## Features

### Authentication & Authorization
- Firebase Authentication with email/password
- Role-based access control (Admin/Attendant)
- Secure user sessions

### Product Management
- Add, edit, and delete products
- Product details: name, SKU, category, price, quantity, images
- Search and filter by category or SKU
- Low stock threshold alerts

### Inventory Dashboard
- Real-time inventory status
- Visual statistics and charts
- Low stock product alerts
- Recent activity feed

### Sales Management
- Process sales with automatic stock reduction
- Generate receipts with transaction details
- Sales history and tracking

### Restock Management
- Log restock entries
- Update inventory quantities
- Restock history tracking

### Reports & Analytics
- Daily/weekly/monthly sales summaries
- Top selling products analysis
- Export functionality (CSV/PDF)

### UI/UX Features
- Clean, modern interface
- Dark/light theme toggle
- Fully responsive design
- Mobile-friendly navigation
- Smooth animations and transitions

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite

## Getting Started

### Prerequisites

1. Node.js (v16 or higher)
2. Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password provider)
   - Enable Firestore Database
   - Copy your Firebase configuration
   - Update `src/config/firebase.ts` with your configuration:

   ```typescript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-auth-domain",
     projectId: "your-project-id",
     storageBucket: "your-storage-bucket",
     messagingSenderId: "your-messaging-sender-id",
     appId: "your-app-id"
   };
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Firebase Setup

### Firestore Collections

The app uses the following Firestore collections:

- `users` - User profiles with roles
- `products` - Product inventory
- `sales` - Sales transactions
- `restocks` - Restock history

### Security Rules

Set up Firestore security rules to protect your data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products - admins can write, authenticated users can read
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Sales - authenticated users can read/write
    match /sales/{saleId} {
      allow read, write: if request.auth != null;
    }
    
    // Restocks - admins only
    match /restocks/{restockId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## User Roles

### Admin
- Full access to all features
- Can add/edit/delete products
- Can view reports and analytics
- Can manage restocks

### Attendant
- Can view inventory
- Can process sales
- Limited access to reports

## Development

### Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── common/        # Shared components
│   ├── dashboard/     # Dashboard components
│   ├── products/      # Product management (to be added)
│   ├── sales/         # Sales components (to be added)
│   ├── restock/       # Restock components (to be added)
│   └── reports/       # Reports components (to be added)
├── contexts/          # React contexts
├── services/          # Firebase service functions
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.