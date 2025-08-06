# PayFlow - Digital Wallet App

A production-ready fintech application for business payments built with React Native Expo and Firebase, specifically designed for the Eswatini market with MTN MoMo integration.

## Features

### Authentication
- Firebase Email/Password authentication
- Role-based access (Client vs Merchant)
- Secure user registration and login
- Demo accounts for testing

### Client Features
- View wallet balance with real-time updates
- Top-up wallet with MTN MoMo payments
- Manual deposit options (bank transfer, MoMo send)
- Send money to other users by email
- Pay invoices using invoice ID
- Buy products using product codes
- View complete transaction history
- Search and filter transactions

### Merchant Features
- Business dashboard with revenue analytics
- Admin panel for manual deposit verification
- View incoming payments in real-time
- Track total invoices and clients
- Monitor wallet balance
- Generate and export reports
- Integration ready for StockFlow and InvoiceFlow

### Payment System
- MTN MoMo payment integration
- Manual deposit system with reference generation
- Admin verification workflow for manual deposits
- Secure wallet-to-wallet transfers
- Real-time balance updates
- Transaction history with detailed metadata
- Support for multiple payment types (topup, payment, invoice, product)
- Firebase Firestore for data persistence

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase Firestore + Cloud Functions
- **Authentication**: Firebase Auth
- **Payments**: MTN MoMo API integration
- **State Management**: React Context API
- **Icons**: Lucide React Native
- **Real-time Updates**: Firebase real-time listeners

## Demo Accounts

### Client Account
- Email: `client@demo.com`
- Password: `demo123`
- Features: SZL 100 starting balance, full payment capabilities

### Merchant Account
- Email: `merchant@demo.com`
- Password: `demo123`
- Features: Business dashboard, payment tracking, analytics

## Getting Started

### Prerequisites
- Node.js 18 or higher
- Expo CLI
- Firebase CLI
- MTN MoMo Developer Account (for production)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase and MoMo API credentials.

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Use the demo accounts or create new accounts to test the app

## Firebase Configuration

### Development Setup
The app includes a demo Firebase configuration. For production:

1. Create a Firebase project
2. Enable Authentication (Email/Password) and Firestore
3. Update the Firebase config in `config/firebase.ts`
4. Deploy Firestore security rules: `firebase deploy --only firestore:rules`
5. Deploy Firebase Functions: `firebase deploy --only functions`

### Production Deployment
See `utils/setupInstructions.md` for detailed production setup guide.

## MTN MoMo Integration

### Development
The app includes a mock MoMo service for development and testing.

### Production
1. Register at [MTN Developer Portal](https://momodeveloper.mtn.com/)
2. Get API credentials for Eswatini
3. Update environment variables
4. Replace mock service with actual API calls in Firebase Functions

## Manual Deposit System

### Bank Transfer Details
- **Bank**: Standard Bank Eswatini
- **Account**: 1234567890
- **Account Name**: PayFlow Limited
- **Branch Code**: 051001

### MoMo Send Details
- **Phone**: +268 7612 3456
- **Account Name**: PayFlow Limited

### Admin Verification
Merchants can access the admin panel to verify manual deposits using reference numbers.

## Security Features

- Firebase Authentication for secure login
- Firestore security rules to protect user data
- Real-time data validation
- Secure transaction processing with atomic operations
- Manual deposit verification system
- Production-grade Firestore security rules

## Integration Ready

The app includes services for external system integration:

- **StockFlow Integration**: Product purchase handling
- **InvoiceFlow Integration**: Invoice payment processing
- **Real-time Updates**: Automatic balance and transaction updates
- **MTN MoMo API**: Direct mobile money integration
- **Banking APIs**: Ready for bank integration

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   └── (tabs)/            # Main app tabs
├── components/            # Reusable components
├── contexts/              # React Context providers
├── services/              # Business logic and Firebase services
├── functions/             # Firebase Cloud Functions
├── types/                 # TypeScript type definitions
├── config/                # Firebase configuration
└── utils/                 # Utility functions and setup guides
```

## Key Features Implemented

✅ Complete authentication flow with role-based access
✅ Real-time wallet balance updates
✅ Comprehensive transaction system
✅ MTN MoMo payment integration
✅ Manual deposit system with reference generation
✅ Admin panel for deposit verification
✅ Search and filter functionality
✅ Merchant analytics dashboard
✅ Export and reporting capabilities
✅ Integration-ready payment triggers
✅ Responsive mobile-first design
✅ Error handling and validation
✅ Demo accounts for testing
✅ Production-ready Firebase Functions
✅ Eswatini-specific payment methods
✅ Comprehensive security rules

## Future Enhancements

- QR code scanning for payments
- Bank API direct integration
- Airtel Money integration
- Push notifications
- Advanced reporting and analytics
- Multi-currency support
- Biometric authentication
- Offline transaction queuing
- Advanced fraud detection
- Multi-language support (English/siSwati)

## Production Considerations

### Compliance
- Register with Central Bank of Eswatini
- Implement KYC (Know Your Customer) procedures
- Comply with AML (Anti-Money Laundering) regulations
- Set up proper financial reporting

### Scalability
- Firebase automatically scales
- Monitor function execution times
- Optimize database queries
- Implement caching where appropriate

### Business Continuity
- Set up monitoring and alerting
- Implement backup and disaster recovery
- Plan for maintenance windows
- Set up 24/7 support system