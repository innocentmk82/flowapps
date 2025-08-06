# Multi-Tenant Invoicing Application

A modern, secure, and scalable multi-tenant invoicing web application built with React, TypeScript, and Firebase.

## Features

### 🔐 Authentication & Security
- Firebase Authentication with email/password
- Role-based access control (Admin, Seller)
- Multi-tenant data isolation
- Secure Firestore rules
- Admin-only user management system
- **Temporary Password System**: Admins can set temporary passwords for users, visible in user settings with copy functionality

### 👥 Role-Based Access Control
- **Admin Role**: Full access to all features including user management, reports, receipts, and settings
- **Seller Role**: Limited access to core invoicing features (Dashboard, Invoices, Quotations, Clients)
- Only admins can create new seller accounts
- User activation/deactivation system
- **Temporary Password Management**: Admins can set temporary passwords for users, visible in user settings

### 🏢 Multi-Tenant Architecture
- Company registration with unique branding
- Custom logos and color schemes
- Isolated data per company
- Branded dashboard experience

### 📄 Invoicing System
- Create, edit, and manage invoices
- PDF generation and download
- Email invoices to clients
- Multiple invoice statuses (Draft, Sent, Paid, Overdue)
- Digital signature and stamp integration
- Professional PDF templates with company branding

### 🖋️ Digital Documents
- Upload custom digital signatures and stamps
- Automatic integration in all PDF documents
- Support for transparent PNG images
- Professional document authentication
- Consistent branding across all documents

### 👥 Client Management
- Add and manage client profiles
- Contact information and history
- Client transaction tracking

### 📊 Analytics & Reporting (Admin Only)
- Real-time dashboard with key metrics
- Revenue charts and trends
- Invoice status tracking
- Export capabilities

### 🎨 Modern UI/UX
- Clean, responsive design
- Dark/light mode toggle
- Smooth animations with Framer Motion
- Glassmorphism effects
- Mobile-first approach

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Firebase Firestore, Express.js
- **Authentication**: Firebase Auth
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **Animations**: Framer Motion
- **PDF Generation**: jsPDF
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18 or higher
- Firebase project with Firestore enabled

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project
   - Enable Firestore and Authentication
   - Enable Email/Password authentication
   - Copy your Firebase config to `src/lib/firebase.ts`

4. Set up Firebase Admin SDK (for user management):
   - Download your Firebase service account key
   - Set the GOOGLE_APPLICATION_CREDENTIALS environment variable
   - Or place the service account key file in the project

5. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Start the backend server:
   ```bash
   node server.js
   ```

## Role System

### Admin Features
- Full access to all application features
- User management (create, activate, deactivate sellers)
- Access to reports and analytics
- Receipt management
- Company settings management

### Seller Features
- Dashboard access
- Invoice creation and management
- Quotation creation and management
- Client management
- Receipt viewing (read-only access)
- Limited access to core business functions

## Firebase Setup

### Firestore Rules
The included `firestore.rules` file provides comprehensive secure multi-tenant access control:

#### Security Features
- **Multi-tenant data isolation** - Complete separation between companies
- **Role-based access control** - Different permissions for admins and sellers
- **Data validation** - Ensures data integrity and prevents malicious data
- **User activation system** - Only active users can access the system
- **Comprehensive audit trail** - Tracks who created what and when

#### Collections Protected
- **Users** - User profiles and authentication data
- **Companies** - Company information and branding
- **Clients** - Client information
- **Invoices** - Invoice data and items
- **Receipts** - Payment records (admin only)
- **Quotations** - Quotation data
- **Admins** - Admin information for registration

#### Performance Optimizations
- **Comprehensive indexes** for efficient queries
- **Company-based filtering** for multi-tenant isolation
- **Status-based filtering** for business logic
- **Date-based sorting** for chronological data
- **User-based filtering** for role-based access

### Deployment
Use the provided deployment scripts:

**Linux/Mac:**
```bash
chmod +x deploy-firebase.sh
./deploy-firebase.sh
```

**Windows:**
```cmd
deploy-firebase.bat
```

**Manual deployment:**
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Database Structure
```
companies/
  {companyId}/
    - name, logo, colors, contact info
    - digitalSignature, digitalStamp (base64 encoded images)

users/
  {userId}/
    - profile, role (admin/seller), companyId
    - isActive, addedBy, timestamps

invoices/
  {invoiceId}/
    - invoice data, items, status
    - companyId for tenant isolation

clients/
  {clientId}/
    - client information
    - companyId for tenant isolation

receipts/
  {receiptId}/
    - payment records (admin only)
    - companyId for tenant isolation

quotations/
  {quotationId}/
    - quotation data
    - companyId for tenant isolation
```

## User Management

### Creating Seller Accounts
1. Admin logs into the system
2. Navigate to Settings > User Management
3. Click "Add User"
4. Fill in seller details (email, name, role)
5. System creates Firebase Auth account and Firestore document
6. Temporary password is generated and displayed
7. Seller can log in with email and temporary password

### Security Features
- Multi-tenant data isolation
- Firebase Auth JWT verification
- Firestore security rules
- Input validation and sanitization
- Protected routes with role-based access
- User activation/deactivation system

## Features in Development

- [ ] PDF invoice templates
- [ ] Email integration
- [ ] Receipt generation
- [ ] Advanced reporting
- [ ] Mobile app
- [ ] Payment integrations
- [ ] Multi-language support

## Contributing

Please read our contributing guidelines before submitting pull requests.